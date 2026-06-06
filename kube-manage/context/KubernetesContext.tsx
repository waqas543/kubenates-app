import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { load } from 'js-yaml';
import type {
  ClusterConnection,
  Deployment,
  KubeConfig,
  Namespace,
  Node,
  Pod,
  Service,
} from '@/types/kubernetes';
import {
  deleteNamespaced,
  getDeployments,
  getNamespaces,
  getNodes,
  getPods,
  getServices,
  patchNamespaced,
} from '@/lib/kubernetesClient';
import { toParsedConfig, toAge } from '@/lib/kubeHelpers';

export { toParsedConfig };

const STORAGE_KEY = 'kube_connections';

export const [KubernetesContext, useKubernetes] = createContextHook(() => {
  const [activeConnection, setActiveConnection] = useState<ClusterConnection | null>(null);
  const [activeNamespace, setActiveNamespace] = useState<string>('all');
  const queryClient = useQueryClient();

  // ── Stored connections ─────────────────────────────────────────
  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as ClusterConnection[]) : [];
    },
  });

  useEffect(() => {
    if (connectionsQuery.data && connectionsQuery.data.length > 0 && !activeConnection) {
      setActiveConnection(connectionsQuery.data[0]);
    }
  }, [connectionsQuery.data, activeConnection]);

  const saveConnectionMutation = useMutation({
    mutationFn: async (connection: ClusterConnection) => {
      const current: ClusterConnection[] = connectionsQuery.data || [];
      const updated = [...current.filter((c) => c.name !== connection.name), connection];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['connections'], data);
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (name: string) => {
      const current: ClusterConnection[] = connectionsQuery.data || [];
      const updated = current.filter((c) => c.name !== name);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (activeConnection?.name === name) setActiveConnection(null);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['connections'], data);
    },
  });

  // ── Live data fetchers (via kubernetesClient helpers → kubeRequest) ────
  const fetchNamespaces = async (conn: ClusterConnection): Promise<Namespace[]> => {
    const cfg = toParsedConfig(conn);
    const res = await getNamespaces(cfg);
    const items: any[] = res.data?.items ?? [];
    return items.map((ns) => ({
      name: ns?.metadata?.name ?? 'unknown',
      status: ns?.status?.phase === 'Terminating' ? 'Terminating' : 'Active',
      age: toAge(ns?.metadata?.creationTimestamp),
    }));
  };

  const fetchPods = async (conn: ClusterConnection, namespace: string): Promise<Pod[]> => {
    const cfg = toParsedConfig(conn);
    const res = await getPods(cfg, namespace === 'all' || !namespace ? 'all' : namespace);
    const items: any[] = res.data?.items ?? [];
    return items.map((pod) => {
      const containers: any[] = pod?.spec?.containers ?? [];
      const statuses: any[] = pod?.status?.containerStatuses ?? [];
      return {
        name: pod?.metadata?.name ?? 'unknown',
        namespace: pod?.metadata?.namespace ?? 'default',
        status: (pod?.status?.phase ?? 'Unknown') as Pod['status'],
        ready: `${statuses.filter((s) => s?.ready).length}/${containers.length || 1}`,
        restarts: statuses.reduce((sum: number, s: any) => sum + (s?.restartCount ?? 0), 0),
        age: toAge(pod?.metadata?.creationTimestamp),
        node: pod?.spec?.nodeName,
      };
    });
  };

  const fetchDeployments = async (conn: ClusterConnection, namespace: string): Promise<Deployment[]> => {
    const cfg = toParsedConfig(conn);
    const res = await getDeployments(cfg, namespace === 'all' || !namespace ? 'all' : namespace);
    const items: any[] = res.data?.items ?? [];
    return items.map((d) => ({
      name: d?.metadata?.name ?? 'unknown',
      namespace: d?.metadata?.namespace ?? 'default',
      ready: `${d?.status?.readyReplicas ?? 0}/${d?.spec?.replicas ?? 0}`,
      upToDate: d?.status?.updatedReplicas ?? 0,
      available: d?.status?.availableReplicas ?? 0,
      age: toAge(d?.metadata?.creationTimestamp),
    }));
  };

  const fetchNodes = async (conn: ClusterConnection): Promise<Node[]> => {
    const cfg = toParsedConfig(conn);
    const res = await getNodes(cfg);
    const items: any[] = res.data?.items ?? [];
    return items.map((n) => {
      const conditions: any[] = n?.status?.conditions ?? [];
      const isReady = conditions.find((c) => c.type === 'Ready')?.status === 'True';
      const roles = Object.keys(n?.metadata?.labels ?? {})
        .filter((k) => k.startsWith('node-role.kubernetes.io/'))
        .map((k) => k.replace('node-role.kubernetes.io/', ''))
        .join(',') || 'worker';
      return {
        name: n?.metadata?.name ?? 'unknown',
        status: isReady ? 'Ready' : 'NotReady',
        roles,
        age: toAge(n?.metadata?.creationTimestamp),
        version: n?.status?.nodeInfo?.kubeletVersion ?? 'unknown',
      };
    });
  };

  const fetchServices = async (conn: ClusterConnection, namespace: string): Promise<Service[]> => {
    const cfg = toParsedConfig(conn);
    const res = await getServices(cfg, namespace === 'all' || !namespace ? 'all' : namespace);
    const items: any[] = res.data?.items ?? [];
    return items.map((svc) => {
      const ports = (svc?.spec?.ports ?? [])
        .map((p: any) => `${p.port}${p.nodePort ? ':' + p.nodePort : ''}/${p.protocol ?? 'TCP'}`)
        .join(', ');
      return {
        name: svc?.metadata?.name ?? 'unknown',
        namespace: svc?.metadata?.namespace ?? 'default',
        type: svc?.spec?.type ?? 'ClusterIP',
        clusterIP: svc?.spec?.clusterIP ?? 'None',
        externalIP: svc?.status?.loadBalancer?.ingress?.[0]?.ip,
        ports: ports || 'N/A',
        age: toAge(svc?.metadata?.creationTimestamp),
      };
    });
  };

  // ── Queries ────────────────────────────────────────────────────
  const namespacesQuery = useQuery({
    queryKey: ['namespaces', activeConnection?.name],
    enabled: !!activeConnection,
    queryFn: () => fetchNamespaces(activeConnection!),
    staleTime: 30000,
    retry: 1,
  });

  const podsQuery = useQuery({
    queryKey: ['pods', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    queryFn: () => fetchPods(activeConnection!, activeNamespace),
    staleTime: 15000,
    retry: 1,
  });

  const deploymentsQuery = useQuery({
    queryKey: ['deployments', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    queryFn: () => fetchDeployments(activeConnection!, activeNamespace),
    staleTime: 15000,
    retry: 1,
  });

  const nodesQuery = useQuery({
    queryKey: ['nodes', activeConnection?.name],
    enabled: !!activeConnection,
    queryFn: () => fetchNodes(activeConnection!),
    staleTime: 30000,
    retry: 1,
  });

  const servicesQuery = useQuery({
    queryKey: ['services', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    queryFn: () => fetchServices(activeConnection!, activeNamespace),
    staleTime: 30000,
    retry: 1,
  });

  // ── Mutations (real API calls) ─────────────────────────────────
  const deletePodMutation = useMutation({
    mutationFn: async ({ name, namespace }: { name: string; namespace: string }) => {
      if (!activeConnection) throw new Error('No active connection');
      await deleteNamespaced(toParsedConfig(activeConnection), 'pods', namespace, name);
      return { name, namespace };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pods'] }),
  });

  const restartPodMutation = useMutation({
    mutationFn: async ({ name, namespace }: { name: string; namespace: string }) => {
      if (!activeConnection) throw new Error('No active connection');
      // Deleting a managed pod triggers an immediate restart by the controller
      await deleteNamespaced(toParsedConfig(activeConnection), 'pods', namespace, name);
      return { name, namespace };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pods'] }),
  });

  const deleteDeploymentMutation = useMutation({
    mutationFn: async ({ name, namespace }: { name: string; namespace: string }) => {
      if (!activeConnection) throw new Error('No active connection');
      await deleteNamespaced(toParsedConfig(activeConnection), 'deployments', namespace, name);
      return { name, namespace };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployments'] }),
  });

  const restartDeploymentMutation = useMutation({
    mutationFn: async ({ name, namespace }: { name: string; namespace: string }) => {
      if (!activeConnection) throw new Error('No active connection');
      await patchNamespaced(toParsedConfig(activeConnection), 'deployments', namespace, name, {
        spec: {
          template: {
            metadata: {
              annotations: { 'kubectl.kubernetes.io/restartedAt': new Date().toISOString() },
            },
          },
        },
      });
      return { name, namespace };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployments'] }),
  });

  const scaleDeploymentMutation = useMutation({
    mutationFn: async ({ name, namespace, replicas }: { name: string; namespace: string; replicas: number }) => {
      if (!activeConnection) throw new Error('No active connection');
      await patchNamespaced(
        toParsedConfig(activeConnection),
        'deployments',
        namespace,
        name,
        { spec: { replicas } },
        'scale',
      );
      return { name, namespace, replicas };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployments'] }),
  });

  const parseKubeconfig = (configText: string): ClusterConnection | null => {
    try {
      const config = load(configText) as KubeConfig;
      const contextName = config['current-context'];
      const ctx = config.contexts.find((c) => c.name === contextName);
      if (!ctx) throw new Error('Current context not found');

      const cluster = config.clusters.find((c) => c.name === ctx.context.cluster);
      const user = config.users.find((u) => u.name === ctx.context.user);
      if (!cluster) throw new Error('Cluster not found');

      // Detect EKS exec credential provider (aws eks get-token)
      const exec = user?.user?.exec;
      if (exec?.command === 'aws' && exec.args?.includes('get-token')) {
        const args = exec.args ?? [];
        const regionIdx = args.indexOf('--region');
        const clusterIdx = args.indexOf('--cluster-name');
        const region = regionIdx >= 0 ? args[regionIdx + 1] : '';
        const clusterName = clusterIdx >= 0 ? args[clusterIdx + 1] : '';

        return {
          name: contextName,
          server: cluster.cluster.server,
          namespace: ctx.context.namespace || 'default',
          caCertificate: cluster.cluster['certificate-authority-data'],
          connectionType: 'eks',
          eks: {
            clusterName,
            region,
            accessKeyId: '',
            secretAccessKey: '',
          },
        };
      }

      return {
        name: contextName,
        server: cluster.cluster.server,
        namespace: ctx.context.namespace || 'default',
        token: user?.user?.token,
        caCertificate: cluster.cluster['certificate-authority-data'],
        clientCertificate: user?.user?.['client-certificate-data'],
        clientKey: user?.user?.['client-key-data'],
        rawConfig: configText,
      };
    } catch (error) {
      console.error('Failed to parse kubeconfig:', error);
      return null;
    }
  };

  /** Refetch every query that currently has subscribers (all visible screens + context). */
  const refetchAll = useCallback(async () => {
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  return {
    connections: connectionsQuery.data || [],
    activeConnection,
    setActiveConnection,
    activeNamespace,
    setActiveNamespace,
    saveConnection: saveConnectionMutation.mutate,
    deleteConnection: deleteConnectionMutation.mutate,
    parseKubeconfig,
    refetchAll,
    isLoading: connectionsQuery.isLoading,
    isSaving: saveConnectionMutation.isPending,
    // namespaces
    namespaces: namespacesQuery.data || [],
    isNamespacesLoading: namespacesQuery.isLoading,
    // pods
    pods: podsQuery.data || [],
    isPodsLoading: podsQuery.isLoading,
    // deployments
    deployments: deploymentsQuery.data || [],
    isDeploymentsLoading: deploymentsQuery.isLoading,
    // nodes
    nodes: nodesQuery.data || [],
    isNodesLoading: nodesQuery.isLoading,
    // services
    services: servicesQuery.data || [],
    isServicesLoading: servicesQuery.isLoading,
    // pod mutations
    deletePod: deletePodMutation.mutate,
    restartPod: restartPodMutation.mutate,
    isPodDeleting: deletePodMutation.isPending,
    isPodRestarting: restartPodMutation.isPending,
    // deployment mutations
    deleteDeployment: deleteDeploymentMutation.mutate,
    restartDeployment: restartDeploymentMutation.mutate,
    scaleDeployment: scaleDeploymentMutation.mutate,
    isDeploymentDeleting: deleteDeploymentMutation.isPending,
    isDeploymentRestarting: restartDeploymentMutation.isPending,
    isDeploymentScaling: scaleDeploymentMutation.isPending,
  };
});
