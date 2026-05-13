import type {
  ConfigMap,
  Deployment,
  Event,
  Ingress,
  Namespace,
  NetworkPolicy,
  Node,
  PersistentVolume,
  PersistentVolumeClaim,
  Pod,
  PodDetails,
  Secret,
  Service,
  StatefulSet
} from '@/types/kubernetes';

export const mockNodes: Node[] = [
  { name: 'node-1', status: 'Ready', roles: 'control-plane,master', age: '45d', version: 'v1.28.2' },
  { name: 'node-2', status: 'Ready', roles: 'worker', age: '45d', version: 'v1.28.2' },
  { name: 'node-3', status: 'Ready', roles: 'worker', age: '42d', version: 'v1.28.2' },
];

export const mockNamespaces: Namespace[] = [
  { name: 'default', status: 'Active', age: '45d' },
  { name: 'kube-system', status: 'Active', age: '45d' },
  { name: 'kube-public', status: 'Active', age: '45d' },
  { name: 'production', status: 'Active', age: '30d' },
  { name: 'staging', status: 'Active', age: '28d' },
  { name: 'development', status: 'Active', age: '25d' },
];

export const mockPods: Pod[] = [
  { name: 'nginx-deployment-5d7f8b9c4d-abc12', namespace: 'production', status: 'Running', ready: '1/1', restarts: 0, age: '5d', node: 'node-2' },
  { name: 'nginx-deployment-5d7f8b9c4d-def34', namespace: 'production', status: 'Running', ready: '1/1', restarts: 1, age: '5d', node: 'node-3' },
  { name: 'api-backend-7b9f8d6c5a-ghi56', namespace: 'production', status: 'Running', ready: '1/1', restarts: 0, age: '3d', node: 'node-2' },
  { name: 'redis-master-0', namespace: 'production', status: 'Running', ready: '1/1', restarts: 0, age: '12d', node: 'node-2' },
  { name: 'postgres-db-0', namespace: 'production', status: 'Running', ready: '1/1', restarts: 0, age: '20d', node: 'node-3' },
  { name: 'frontend-app-6c8d9f7e5b-jkl78', namespace: 'staging', status: 'Running', ready: '1/1', restarts: 2, age: '2d', node: 'node-2' },
  { name: 'test-runner-abc123', namespace: 'development', status: 'Pending', ready: '0/1', restarts: 0, age: '5m', node: 'node-3' },
  { name: 'coredns-5d78c9fd8-mno90', namespace: 'kube-system', status: 'Running', ready: '1/1', restarts: 0, age: '45d', node: 'node-1' },
  { name: 'kube-proxy-pqr12', namespace: 'kube-system', status: 'Running', ready: '1/1', restarts: 0, age: '45d', node: 'node-1' },
];

export const mockDeployments: Deployment[] = [
  { name: 'nginx-deployment', namespace: 'production', ready: '2/2', upToDate: 2, available: 2, age: '5d' },
  { name: 'api-backend', namespace: 'production', ready: '1/1', upToDate: 1, available: 1, age: '3d' },
  { name: 'frontend-app', namespace: 'staging', ready: '1/1', upToDate: 1, available: 1, age: '2d' },
  { name: 'worker-service', namespace: 'production', ready: '3/3', upToDate: 3, available: 3, age: '10d' },
  { name: 'coredns', namespace: 'kube-system', ready: '1/1', upToDate: 1, available: 1, age: '45d' },
];

export const mockServices: Service[] = [
  { name: 'nginx-service', namespace: 'production', type: 'LoadBalancer', clusterIP: '10.96.0.15', externalIP: '34.123.45.67', ports: '80:30080/TCP', age: '5d' },
  { name: 'api-backend', namespace: 'production', type: 'ClusterIP', clusterIP: '10.96.0.22', ports: '8080/TCP', age: '3d' },
  { name: 'redis-master', namespace: 'production', type: 'ClusterIP', clusterIP: '10.96.0.30', ports: '6379/TCP', age: '12d' },
  { name: 'postgres-db', namespace: 'production', type: 'ClusterIP', clusterIP: '10.96.0.45', ports: '5432/TCP', age: '20d' },
  { name: 'frontend-app', namespace: 'staging', type: 'NodePort', clusterIP: '10.96.0.55', ports: '3000:32000/TCP', age: '2d' },
  { name: 'kubernetes', namespace: 'default', type: 'ClusterIP', clusterIP: '10.96.0.1', ports: '443/TCP', age: '45d' },
];

export const mockStatefulSets: StatefulSet[] = [
  { name: 'redis-master', namespace: 'production', ready: '1/1', age: '12d' },
  { name: 'postgres-db', namespace: 'production', ready: '1/1', age: '20d' },
  { name: 'mongodb-cluster', namespace: 'production', ready: '3/3', age: '30d' },
  { name: 'elasticsearch', namespace: 'production', ready: '2/2', age: '15d' },
];

export const mockIngresses: Ingress[] = [
  { name: 'main-ingress', namespace: 'production', className: 'nginx', hosts: 'api.example.com', address: '34.123.45.67', age: '10d' },
  { name: 'frontend-ingress', namespace: 'production', className: 'nginx', hosts: 'app.example.com', address: '34.123.45.68', age: '8d' },
  { name: 'staging-ingress', namespace: 'staging', className: 'nginx', hosts: 'staging.example.com', age: '5d' },
];

export const mockSecrets: Secret[] = [
  { name: 'db-credentials', namespace: 'production', type: 'Opaque', data: 2, age: '30d' },
  { name: 'api-keys', namespace: 'production', type: 'Opaque', data: 5, age: '25d' },
  { name: 'tls-cert', namespace: 'production', type: 'kubernetes.io/tls', data: 2, age: '10d' },
  { name: 'docker-registry', namespace: 'default', type: 'kubernetes.io/dockerconfigjson', data: 1, age: '45d' },
];

export const mockConfigMaps: ConfigMap[] = [
  { name: 'app-config', namespace: 'production', data: 8, age: '15d' },
  { name: 'nginx-config', namespace: 'production', data: 3, age: '10d' },
  { name: 'feature-flags', namespace: 'production', data: 12, age: '5d' },
  { name: 'coredns', namespace: 'kube-system', data: 2, age: '45d' },
];

export const mockNetworkPolicies: NetworkPolicy[] = [
  { name: 'allow-frontend', namespace: 'production', podSelector: 'app=frontend', age: '20d' },
  { name: 'deny-all-ingress', namespace: 'production', podSelector: 'app=api', age: '15d' },
  { name: 'allow-dns', namespace: 'kube-system', podSelector: 'k8s-app=kube-dns', age: '45d' },
];

export const mockPersistentVolumes: PersistentVolume[] = [
  { name: 'pv-postgres', capacity: '100Gi', accessModes: 'RWO', reclaimPolicy: 'Retain', status: 'Bound', age: '30d' },
  { name: 'pv-redis', capacity: '50Gi', accessModes: 'RWO', reclaimPolicy: 'Retain', status: 'Bound', age: '20d' },
  { name: 'pv-shared', capacity: '200Gi', accessModes: 'RWX', reclaimPolicy: 'Delete', status: 'Available', age: '45d' },
];

export const mockPersistentVolumeClaims: PersistentVolumeClaim[] = [
  { name: 'postgres-data', namespace: 'production', status: 'Bound', volume: 'pv-postgres', capacity: '100Gi', accessModes: 'RWO', age: '30d' },
  { name: 'redis-data', namespace: 'production', status: 'Bound', volume: 'pv-redis', capacity: '50Gi', accessModes: 'RWO', age: '20d' },
  { name: 'shared-storage', namespace: 'default', status: 'Pending', volume: '', capacity: '0', accessModes: 'RWX', age: '2h' },
];

export const mockEvents: Event[] = [
  { type: 'Warning', reason: 'BackOff', message: 'Back-off restarting failed container', source: 'kubelet, node-2', count: 3, age: '2m', lastSeen: '30s' },
  { type: 'Warning', reason: 'FailedScheduling', message: 'No nodes are available that match pod affinity', source: 'default-scheduler', count: 5, age: '5m', lastSeen: '1m' },
  { type: 'Error', reason: 'FailedMount', message: 'Unable to mount volume', source: 'kubelet, node-3', count: 2, age: '10m', lastSeen: '8m' },
  { type: 'Warning', reason: 'Unhealthy', message: 'Readiness probe failed', source: 'kubelet, node-2', count: 8, age: '15m', lastSeen: '5m' },
  { type: 'Normal', reason: 'Scheduled', message: 'Successfully assigned pod to node-2', source: 'default-scheduler', count: 1, age: '20m', lastSeen: '20m' },
  { type: 'Normal', reason: 'Pulling', message: 'Pulling image "nginx:latest"', source: 'kubelet, node-2', count: 1, age: '19m', lastSeen: '19m' },
];

export const mockPodDetails: Record<string, PodDetails> = {
  'nginx-deployment-5d7f8b9c4d-abc12': {
    name: 'nginx-deployment-5d7f8b9c4d-abc12',
    namespace: 'production',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '5d',
    node: 'node-2',
    ip: '10.244.1.15',
    qosClass: 'BestEffort',
    containers: [
      {
        name: 'nginx',
        image: 'nginx:1.21',
        ready: true,
        restartCount: 0,
        env: [
          { name: 'NGINX_PORT', value: '80' },
          { name: 'NGINX_HOST', value: '0.0.0.0' },
          { name: 'ENVIRONMENT', value: 'production' },
          { name: 'LOG_LEVEL', value: 'info' },
        ],
      },
    ],
    conditions: [
      { type: 'Initialized', status: 'True', lastTransitionTime: '5d ago' },
      { type: 'Ready', status: 'True', lastTransitionTime: '5d ago' },
      { type: 'ContainersReady', status: 'True', lastTransitionTime: '5d ago' },
      { type: 'PodScheduled', status: 'True', lastTransitionTime: '5d ago' },
    ],
    metrics: {
      cpu: '12m',
      memory: '45Mi',
    },
    events: [
      { type: 'Normal', reason: 'Scheduled', message: 'Successfully assigned production/nginx-deployment-5d7f8b9c4d-abc12 to node-2', source: 'default-scheduler', count: 1, age: '5d', lastSeen: '5d' },
      { type: 'Normal', reason: 'Pulled', message: 'Container image "nginx:1.21" already present on machine', source: 'kubelet, node-2', count: 1, age: '5d', lastSeen: '5d' },
      { type: 'Normal', reason: 'Created', message: 'Created container nginx', source: 'kubelet, node-2', count: 1, age: '5d', lastSeen: '5d' },
      { type: 'Normal', reason: 'Started', message: 'Started container nginx', source: 'kubelet, node-2', count: 1, age: '5d', lastSeen: '5d' },
    ],
  },
};
