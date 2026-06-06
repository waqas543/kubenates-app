import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import { generateEksToken } from './eksAuth';
import type { EksCredentials } from './eksAuth';

const { KubeHttpModule } = NativeModules;




export interface ParsedKubeConfig {
  server: string;                    // e.g. https://45.153.48.217:6443
  certificateAuthorityData: string;  // base64 from kubeconfig
  clientCertificateData: string;     // base64 from kubeconfig
  clientKeyData: string;             // base64 from kubeconfig
  token?: string;                    // static bearer token (kubeconfig token auth)
  eksAuth?: EksCredentials;          // present for EKS IAM connections; token is generated per-request
}

export interface KubeRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, any>;
  namespace?: string;
}

export interface KubeResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

// Kubernetes resource kind → API path mapping
const API_GROUPS: Record<string, string> = {
  // Core API group
  namespaces:              '/api/v1/namespaces',
  nodes:                   '/api/v1/nodes',
  persistentvolumes:       '/api/v1/persistentvolumes',

  // Namespaced core resources (requires namespace prefix — handled in buildPath)
  pods:                    'pods',
  services:                'services',
  configmaps:              'configmaps',
  secrets:                 'secrets',
  endpoints:               'endpoints',
  events:                  'events',
  persistentvolumeclaims:  'persistentvolumeclaims',
  serviceaccounts:         'serviceaccounts',
  replicationcontrollers:  'replicationcontrollers',

  // apps/v1
  deployments:             'deployments',
  replicasets:             'replicasets',
  statefulsets:            'statefulsets',
  daemonsets:              'daemonsets',

  // batch/v1
  jobs:                    'jobs',
  cronjobs:                'cronjobs',

  // networking.k8s.io/v1
  ingresses:               'ingresses',
  networkpolicies:         'networkpolicies',

  // rbac.authorization.k8s.io/v1
  roles:                   'roles',
  rolebindings:            'rolebindings',
  clusterroles:            '/apis/rbac.authorization.k8s.io/v1/clusterroles',
  clusterrolebindings:   '/apis/rbac.authorization.k8s.io/v1/clusterrolebindings',

  // storage.k8s.io/v1 (cluster-scoped — full base path)
  storageclasses:        '/apis/storage.k8s.io/v1/storageclasses',
};

// Which API group prefix each namespaced resource belongs to
const NAMESPACED_API_PREFIX: Record<string, string> = {
  pods:                    '/api/v1',
  services:                '/api/v1',
  configmaps:              '/api/v1',
  secrets:                 '/api/v1',
  endpoints:               '/api/v1',
  events:                  '/api/v1',
  persistentvolumeclaims:  '/api/v1',
  serviceaccounts:         '/api/v1',
  replicationcontrollers:  '/api/v1',

  deployments:             '/apis/apps/v1',
  replicasets:             '/apis/apps/v1',
  statefulsets:            '/apis/apps/v1',
  daemonsets:              '/apis/apps/v1',

  jobs:                    '/apis/batch/v1',
  cronjobs:                '/apis/batch/v1',

  ingresses:               '/apis/networking.k8s.io/v1',
  networkpolicies:         '/apis/networking.k8s.io/v1',

  roles:                   '/apis/rbac.authorization.k8s.io/v1',
  rolebindings:            '/apis/rbac.authorization.k8s.io/v1',
};

// Cluster-scoped resources (no namespace segment in URL)
const CLUSTER_SCOPED = new Set([
  'namespaces',
  'nodes',
  'persistentvolumes',
  'clusterroles',
  'clusterrolebindings',
  'storageclasses',
]);

// ─────────────────────────────────────────────
// Path builder
// ─────────────────────────────────────────────

function buildPath(
  resource: string,
  namespace?: string,
  name?: string
): string {
  const kind = resource.toLowerCase();

  if (CLUSTER_SCOPED.has(kind)) {
    // e.g. /api/v1/namespaces  or  /api/v1/namespaces/default
    const base = API_GROUPS[kind] ?? `/api/v1/${kind}`;
    return name ? `${base}/${name}` : base;
  }

  if (!namespace) {
    throw new Error(
      `Resource "${resource}" is namespaced — provide a namespace, or pass "all" to list across all namespaces.`
    );
  }

  const apiPrefix = NAMESPACED_API_PREFIX[kind] ?? '/api/v1';
  const resourcePath = API_GROUPS[kind] ?? kind;

  if (namespace === 'all') {
    // Cross-namespace list: /apis/apps/v1/deployments
    return name
      ? `${apiPrefix}/${resourcePath}/${name}`
      : `${apiPrefix}/${resourcePath}`;
  }

  // Namespaced: /apis/apps/v1/namespaces/default/deployments
  const base = `${apiPrefix}/namespaces/${namespace}/${resourcePath}`;
  return name ? `${base}/${name}` : base;
}

// ─────────────────────────────────────────────
// Core request function
// ─────────────────────────────────────────────
// export function decodeBase64ToPEM(b64: string): string {
//   if (typeof global.atob === 'function') {
//     return global.atob(b64);
//   }

//   throw new Error('Base64 decoding not supported in this environment');
// }


type K8sResponse<T> = {
  data: T;
  status: number;
  ok: boolean;
  statusText: string;
  type: string;
  url: string;
  redirected: boolean;
  headers: Headers;
  body: any;
  bodyUsed: boolean;
  clone: () => Response;
};
export async function kubeRequest<T = any>(
  config: ParsedKubeConfig,
  path: string,
  options: KubeRequestOptions = {}
): Promise<K8sResponse<T>> {
  const { method = 'GET', body } = options;

  const baseURL = config.server.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type':
    method === 'PATCH'
    ? 'application/merge-patch+json'
    : 'application/json',
  };

  // Resolve bearer token: static token takes precedence; EKS generates one per-request
  let bearerToken = config.token;
  if (!bearerToken && config.eksAuth) {
    bearerToken = await generateEksToken(config.eksAuth);
  }
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  // ── Native path: uses OkHttp with custom CA cert + mTLS support ──
  if (KubeHttpModule && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    const nativeResult: { status: number; body: string; ok: boolean; request_headers?: Record<string, string> } =
      await KubeHttpModule.request(
        `${baseURL}${path}`,
        method,
        headers,
        body ? JSON.stringify(body) : null,
        config.certificateAuthorityData ?? '',
        config.clientCertificateData ?? '',
        config.clientKeyData ?? '',
      );
    console.log('[kubeRequest] native result:', nativeResult);
    let data: T;
    try {
      data = nativeResult.body ? (JSON.parse(nativeResult.body) as T) : ('' as T);
    } catch {
      data = nativeResult.body as unknown as T;
    }

    if (!nativeResult.ok) {
      const err = data as any;
      throw new Error(`Kubernetes API ${nativeResult.status}: ${err?.message ?? ''}`);
    }
    return { data, status: nativeResult.status, ok: true } as K8sResponse<T>;
  }

  // ── Fallback: axios (no custom cert support — works for public CAs) ──
  const k8sClient = axios.create({ baseURL, timeout: 15000 });
  const response = await k8sClient.request({ method, url: path, data: body, headers });

  let data: T;
  try {
    const raw = response.data;
    const contentType =
      (response.headers as any)?.['content-type'] ||
      (response.headers as any)?.['Content-Type'] || '';
    data = typeof raw === 'string' && contentType.includes('application/json')
      ? (JSON.parse(raw) as T)
      : (raw as T);
  } catch {
    throw new Error(`Failed to parse response from ${baseURL}${path}`);
  }

  if (response.status < 200 || response.status >= 300) {
    const err = data as any;
    throw new Error(`Kubernetes API ${response.status}: ${err?.message ?? ''}`);
  }

  return { data, status: response.status, ok: true } as K8sResponse<T>;
}

// ─────────────────────────────────────────────
// Resource helpers
// ─────────────────────────────────────────────

/** List all namespaces */
export async function getNamespaces(config: ParsedKubeConfig) {
  return kubeRequest(config, buildPath('namespaces'));
}

/** List all nodes */
export async function getNodes(config: ParsedKubeConfig) {
  return kubeRequest(config, buildPath('nodes'));
}

/** List pods — pass namespace or "all" for every namespace */
export async function getPods(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('pods', namespace));
}

/** Get a single pod */
export async function getPod(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('pods', namespace, name));
}

/** List deployments */
export async function getDeployments(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('deployments', namespace));
}

/** Get a single deployment */
export async function getDeployment(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('deployments', namespace, name));
}

/** List services */
export async function getServices(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('services', namespace));
}

/** List configmaps */
export async function getConfigMaps(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('configmaps', namespace));
}

/** List secrets */
export async function getSecrets(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('secrets', namespace));
}

/** List statefulsets */
export async function getStatefulSets(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('statefulsets', namespace));
}

/** List daemonsets */
export async function getDaemonSets(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('daemonsets', namespace));
}

/** List ingresses */
export async function getIngresses(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('ingresses', namespace));
}

/** List jobs */
export async function getJobs(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('jobs', namespace));
}

/** List cronjobs */
export async function getCronJobs(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('cronjobs', namespace));
}

/** List replica sets */
export async function getReplicaSets(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('replicasets', namespace));
}

/** List events (namespace or `all` cluster-wide) */
export async function getEvents(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('events', namespace));
}

/** List service accounts */
export async function getServiceAccounts(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('serviceaccounts', namespace));
}

/** List network policies */
export async function getNetworkPolicies(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('networkpolicies', namespace));
}

/** List persistent volume claims */
export async function getPersistentVolumeClaims(config: ParsedKubeConfig, namespace: string) {
  return kubeRequest(config, buildPath('persistentvolumeclaims', namespace));
}

/** List persistent volumes (cluster-scoped) */
export async function getPersistentVolumes(config: ParsedKubeConfig) {
  return kubeRequest(config, buildPath('persistentvolumes'));
}

/** List storage classes (cluster-scoped) */
export async function getStorageClasses(config: ParsedKubeConfig) {
  return kubeRequest(config, buildPath('storageclasses'));
}

/** Get one namespace */
export async function getNamespace(config: ParsedKubeConfig, name: string) {
  return kubeRequest(config, buildPath('namespaces', undefined, name));
}

/** Get one node */
export async function getNode(config: ParsedKubeConfig, name: string) {
  return kubeRequest(config, buildPath('nodes', undefined, name));
}

/** Get one persistent volume */
export async function getPersistentVolume(config: ParsedKubeConfig, name: string) {
  return kubeRequest(config, buildPath('persistentvolumes', undefined, name));
}

/** Get one stateful set */
export async function getStatefulSet(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('statefulsets', namespace, name));
}

/** Get one daemon set */
export async function getDaemonSet(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('daemonsets', namespace, name));
}

/** Get one job */
export async function getJob(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('jobs', namespace, name));
}

/** Get one cron job */
export async function getCronJob(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('cronjobs', namespace, name));
}

/** Get one replica set */
export async function getReplicaSet(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('replicasets', namespace, name));
}

/** Get one ingress */
export async function getIngress(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('ingresses', namespace, name));
}

/** Get one service */
export async function getService(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('services', namespace, name));
}

/** Get one config map */
export async function getConfigMap(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('configmaps', namespace, name));
}

/** Get one secret */
export async function getSecret(config: ParsedKubeConfig, namespace: string, name: string) {
  return kubeRequest(config, buildPath('secrets', namespace, name));
}

/** Node metrics (metrics.k8s.io); returns 404 if metrics-server not installed */
export async function getNodeMetrics(config: ParsedKubeConfig, nodeName: string) {
  return kubeRequest(
    config,
    `/apis/metrics.k8s.io/v1/nodes/${encodeURIComponent(nodeName)}`,
  );
}

/** PATCH a namespaced resource; optional subresource (e.g. `scale`). */
export async function patchNamespaced(
  config: ParsedKubeConfig,
  resource: string,
  namespace: string,
  name: string,
  body: Record<string, any>,
  subresource?: string,
) {
  const base = buildPath(resource, namespace, name);
  const path = subresource ? `${base}/${subresource}` : base;
  return kubeRequest(config, path, { method: 'PATCH', body });
}

/** DELETE a namespaced resource */
export async function deleteNamespaced(
  config: ParsedKubeConfig,
  resource: string,
  namespace: string,
  name: string,
) {
  return kubeRequest(config, buildPath(resource, namespace, name), { method: 'DELETE' });
}

/** DELETE a cluster-scoped resource (namespaces, nodes, PVs, …) */
export async function deleteCluster(
  config: ParsedKubeConfig,
  resource: string,
  name: string,
) {
  return kubeRequest(config, buildPath(resource, undefined, name), { method: 'DELETE' });
}

/** Generic: list any resource by kind */
export async function listResources(
  config: ParsedKubeConfig,
  resource: string,
  namespace: string = 'all'
) {
  return kubeRequest(config, buildPath(resource, namespace));
}

/**
 * Get a single resource. For namespaced kinds, pass `namespace`; for cluster kinds, omit it.
 * @param name resource name
 * @param namespace namespace (required for namespaced resources)
 */
export async function getResource(
  config: ParsedKubeConfig,
  resource: string,
  name: string,
  namespace?: string
) {
  return kubeRequest(config, buildPath(resource, namespace, name));
}

/** Generic: create a resource */
export async function createResource(
  config: ParsedKubeConfig,
  resource: string,
  namespace: string,
  body: Record<string, any>
) {
  return kubeRequest(config, buildPath(resource, namespace), {
    method: 'POST',
    body,
  });
}

/** @deprecated Use patchNamespaced(config, resource, namespace, name, body, subresource?) */
export async function patchResource(
  config: ParsedKubeConfig,
  resource: string,
  name: string,
  namespace: string,
  body: Record<string, any>
) {
  return patchNamespaced(config, resource, namespace, name, body);
}

/** List pods in a namespace filtered by a label selector */
export async function getPodsWithSelector(
  config: ParsedKubeConfig,
  namespace: string,
  labelSelector: string,
) {
  const qs = labelSelector ? `?labelSelector=${encodeURIComponent(labelSelector)}` : '';
  return kubeRequest(config, `/api/v1/namespaces/${namespace}/pods${qs}`);
}

/** Fetch logs for a pod — returns plain-text response */
export async function getPodLogs(
  config: ParsedKubeConfig,
  namespace: string,
  podName: string,
  options?: { container?: string; tailLines?: number },
) {
  const params: string[] = [];
  if (options?.container) params.push(`container=${encodeURIComponent(options.container)}`);
  if (options?.tailLines != null) params.push(`tailLines=${options.tailLines}`);
  const query = params.length ? `?${params.join('&')}` : '';
  return kubeRequest<string>(
    config,
    `/api/v1/namespaces/${namespace}/pods/${encodeURIComponent(podName)}/log${query}`,
  );
}

/** List ControllerRevisions in a namespace — used for StatefulSet and DaemonSet rollback */
export async function getControllerRevisions(
  config: ParsedKubeConfig,
  namespace: string,
  labelSelector?: string,
) {
  const qs = labelSelector ? `?labelSelector=${encodeURIComponent(labelSelector)}` : '';
  return kubeRequest(config, `/apis/apps/v1/namespaces/${namespace}/controllerrevisions${qs}`);
}

/** List ReplicaSets in a namespace with optional label selector — used for Deployment rollback */
export async function getReplicaSetsFiltered(
  config: ParsedKubeConfig,
  namespace: string,
  labelSelector?: string,
) {
  const qs = labelSelector ? `?labelSelector=${encodeURIComponent(labelSelector)}` : '';
  return kubeRequest(config, `/apis/apps/v1/namespaces/${namespace}/replicasets${qs}`);
}

/** @deprecated Use deleteNamespaced or deleteCluster */
export async function deleteResource(
  config: ParsedKubeConfig,
  resource: string,
  name: string,
  namespace?: string
) {
  if (namespace != null && namespace !== '') {
    return deleteNamespaced(config, resource, namespace, name);
  }
  return deleteCluster(config, resource, name);
}