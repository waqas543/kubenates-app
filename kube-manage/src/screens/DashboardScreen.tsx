import { StatusBadge } from '@/components/StatusBadge';
import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getEvents } from '@/lib/kubernetesClient';
import { useMainLayoutNav } from '@/src/navigation/MainLayoutNavContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Box,
  Cpu,
  Database,
  HeartPulse,
  Info,
  Layers,
  Network,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type ClusterHealthLevel = 'healthy' | 'warning' | 'critical';

function toAge(ts?: string | null): string {
  if (!ts) return '-';
  const diff = Date.now() - new Date(ts).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor(diff / 60000);
  return m > 0 ? `${m}m` : `${Math.floor(diff / 1000)}s`;
}

function sortEventsNewestFirst(items: any[]): any[] {
  return [...items].sort((a, b) => {
    const ta = a.lastTimestamp ?? a.eventTime ?? a.metadata?.creationTimestamp ?? '';
    const tb = b.lastTimestamp ?? b.eventTime ?? b.metadata?.creationTimestamp ?? '';
    return String(tb).localeCompare(String(ta));
  });
}

function computeClusterHealth(params: {
  nodes: { status: string }[];
  pods: { status: string }[];
  recentWarningCount: number;
  isNodesLoading: boolean;
  isPodsLoading: boolean;
}): { level: ClusterHealthLevel; title: string; detail: string } {
  const { nodes, pods, recentWarningCount, isNodesLoading, isPodsLoading } = params;
  if (isNodesLoading || isPodsLoading) {
    return {
      level: 'healthy' as ClusterHealthLevel,
      title: 'Gathering status',
      detail: 'Loading nodes and pods to assess cluster health…',
    };
  }

  const notReady = nodes.filter((n) => n.status !== 'Ready').length;
  if (notReady > 0) {
    return {
      level: 'critical',
      title: 'Nodes need attention',
      detail: `${notReady} node(s) are not Ready. Open Nodes to inspect conditions and capacity.`,
    };
  }

  const failedPods = pods.filter((p) => p.status === 'Failed').length;
  if (failedPods > 0) {
    return {
      level: 'warning',
      title: 'Workload issues',
      detail: `${failedPods} pod(s) are Failed. Review logs and recent events.`,
    };
  }

  const pendingPods = pods.filter((p) => p.status === 'Pending').length;
  if (pendingPods > 10) {
    return {
      level: 'warning',
      title: 'Scheduling backlog',
      detail: `${pendingPods} pods are Pending. Check resources, taints, and node capacity.`,
    };
  }

  if (recentWarningCount >= 5) {
    return {
      level: 'warning',
      title: 'Elevated warnings',
      detail: `${recentWarningCount} Warning events among the latest cluster events. Open Events for details.`,
    };
  }

  return {
    level: 'healthy',
    title: 'Cluster looks healthy',
    detail: 'All nodes Ready, no failed pods, and recent warning activity is low.',
  };
}

export default function DashboardScreen() {
  const {
    activeConnection,
    namespaces,
    pods,
    deployments,
    nodes,
    services,
    isPodsLoading,
    isDeploymentsLoading,
    isNodesLoading,
    isServicesLoading,
  } = useKubernetes();
  const navigation = useNavigation<NavProp>();
  const navigateMain = useMainLayoutNav();

  const { data: rawEvents = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['events', activeConnection?.name, 'all'],
    enabled: !!activeConnection,
    staleTime: 20000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getEvents(cfg, 'all');
      return sortEventsNewestFirst(res.data?.items ?? []);
    },
  });

  const latestEvents = useMemo(() => rawEvents.slice(0, 12), [rawEvents]);
  const recentWarningCount = useMemo(
    () => latestEvents.filter((e: any) => e.type === 'Warning').length,
    [latestEvents],
  );

  const health = useMemo(
    () =>
      computeClusterHealth({
        nodes,
        pods,
        recentWarningCount,
        isNodesLoading,
        isPodsLoading,
      }),
    [nodes, pods, recentWarningCount, isNodesLoading, isPodsLoading],
  );

  if (!activeConnection) {
    return (
      <View style={styles.emptyContainer}>
        <Activity size={48} color="#00D9FF" />
        <Text style={styles.emptyTitle}>No Cluster Connected</Text>
        <Text style={styles.emptyText}>
          Add a cluster connection to start managing your Kubernetes resources
        </Text>
        <TouchableOpacity style={styles.setupButton} onPress={() => navigation.navigate('Setup')}>
          <Text style={styles.setupButtonText}>Add Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const runningPods = pods.filter((p) => p.status === 'Running').length;
  const readyNodes = nodes.filter((n) => n.status === 'Ready').length;

  const assessing = isNodesLoading || isPodsLoading;
  const healthPalette = assessing
    ? { border: '#5C6578', icon: '#8B92A8', bg: '#121826' }
    : {
        healthy: { border: '#00FF88', icon: '#00FF88', bg: '#00FF8818' },
        warning: { border: '#FFB800', icon: '#FFB800', bg: '#FFB80018' },
        critical: { border: '#FF5757', icon: '#FF5757', bg: '#FF575718' },
      }[health.level];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.clusterServer} numberOfLines={2}>{activeConnection.server}</Text>
      </View>

      {/* Cluster health */}
      <View style={[styles.healthCard, { borderLeftColor: healthPalette.border, backgroundColor: healthPalette.bg }]}>
        <View style={styles.healthHeader}>
          <HeartPulse size={22} color={healthPalette.icon} />
          <Text style={styles.healthTitle}>Cluster health</Text>
        </View>
        <Text style={styles.healthStatus}>{health.title}</Text>
        <Text style={styles.healthDetail}>{health.detail}</Text>
      </View>

      {/* KPIs — tap to open the matching screen */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: '#00FF88' }]}
          onPress={() => navigateMain('nodes')}
          activeOpacity={0.75}
        >
          <View style={styles.statHeader}>
            <Cpu size={20} color="#00FF88" />
            <Text style={styles.statLabel}>Nodes</Text>
          </View>
          {isNodesLoading ? (
            <ActivityIndicator size="small" color="#00FF88" />
          ) : (
            <Text style={styles.statValue}>{readyNodes}/{nodes.length}</Text>
          )}
          <Text style={styles.statHint}>Ready · tap to open</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: '#00D9FF' }]}
          onPress={() => navigateMain('pods')}
          activeOpacity={0.75}
        >
          <View style={styles.statHeader}>
            <Box size={20} color="#00D9FF" />
            <Text style={styles.statLabel}>Pods</Text>
          </View>
          {isPodsLoading ? (
            <ActivityIndicator size="small" color="#00D9FF" />
          ) : (
            <Text style={styles.statValue}>{runningPods}/{pods.length}</Text>
          )}
          <Text style={styles.statHint}>Running · tap to open</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: '#FFB800' }]}
          onPress={() => navigateMain('deployments')}
          activeOpacity={0.75}
        >
          <View style={styles.statHeader}>
            <Layers size={20} color="#FFB800" />
            <Text style={styles.statLabel}>Deployments</Text>
          </View>
          {isDeploymentsLoading ? (
            <ActivityIndicator size="small" color="#FFB800" />
          ) : (
            <Text style={styles.statValue}>{deployments.length}</Text>
          )}
          <Text style={styles.statHint}>Listed · tap to open</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: '#AA66FF' }]}
          onPress={() => navigateMain('services')}
          activeOpacity={0.75}
        >
          <View style={styles.statHeader}>
            <Network size={20} color="#AA66FF" />
            <Text style={styles.statLabel}>Services</Text>
          </View>
          {isServicesLoading ? (
            <ActivityIndicator size="small" color="#AA66FF" />
          ) : (
            <Text style={styles.statValue}>{services.length}</Text>
          )}
          <Text style={styles.statHint}>Exposed · tap to open</Text>
        </TouchableOpacity>
      </View>

      {/* Namespaces */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeaderRow}
          onPress={() => navigateMain('namespaces')}
          activeOpacity={0.7}
        >
          <Database size={18} color="#00D9FF" />
          <Text style={styles.sectionTitle}>Namespaces</Text>
          <Text style={styles.sectionLink}>View all</Text>
        </TouchableOpacity>
        {namespaces.length === 0 ? (
          <ActivityIndicator size="small" color="#00D9FF" style={{ marginTop: 8 }} />
        ) : (
          <View style={styles.namespaceGrid}>
            {namespaces.slice(0, 6).map((ns) => (
              <TouchableOpacity
                key={ns.name}
                style={styles.namespaceCard}
                onPress={() => navigation.navigate('NamespaceDetails', { name: ns.name })}
                activeOpacity={0.8}
              >
                <Text style={styles.namespaceName}>{ns.name}</Text>
                <View style={styles.namespaceMeta}>
                  <StatusBadge status={ns.status} />
                  <Text style={styles.namespaceAge}>{ns.age}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Latest events */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeaderRow}
          onPress={() => navigateMain('events')}
          activeOpacity={0.7}
        >
          <Activity size={18} color="#00D9FF" />
          <Text style={styles.sectionTitle}>Latest events</Text>
          <Text style={styles.sectionLink}>Open Events</Text>
        </TouchableOpacity>
        {isEventsLoading ? (
          <ActivityIndicator size="small" color="#00D9FF" style={{ marginTop: 8 }} />
        ) : latestEvents.length === 0 ? (
          <Text style={styles.emptySection}>No events found</Text>
        ) : (
          latestEvents.map((item: any, index: number) => {
            const isWarning = item.type === 'Warning';
            const obj = item.involvedObject ?? {};
            const ts = item.lastTimestamp ?? item.eventTime ?? item.metadata?.creationTimestamp;
            const ns = item.metadata?.namespace ?? obj.namespace ?? '';
            return (
              <View
                key={`${item.metadata?.uid ?? item.metadata?.name}-${index}`}
                style={[styles.eventCard, isWarning && styles.eventCardWarning]}
              >
                <View style={styles.eventTop}>
                  {isWarning
                    ? <AlertTriangle size={14} color="#FFB86C" />
                    : <Info size={14} color="#00D9FF" />}
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventReason} numberOfLines={1}>{item.reason ?? '-'}</Text>
                    <Text style={styles.eventObject} numberOfLines={1}>
                      {obj.kind}/{obj.name}{ns ? ` · ${ns}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.eventAge}>{toAge(ts)}</Text>
                </View>
                {item.message ? (
                  <Text style={styles.eventMessage} numberOfLines={2}>{item.message}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  content: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flex: 1, backgroundColor: '#0A0E1A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 24, fontWeight: '700' as const, color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#8B92A8', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  setupButton: { backgroundColor: '#00D9FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  setupButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#000000' },
  header: { marginBottom: 16 },
  clusterServer: { fontSize: 13, color: '#8B92A8', lineHeight: 18 },
  healthCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  healthTitle: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  healthStatus: { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 8 },
  healthDetail: { fontSize: 13, color: '#8B92A8', lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '47%', backgroundColor: '#162033', borderRadius: 12, padding: 16, borderLeftWidth: 3 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statLabel: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  statValue: { fontSize: 28, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  statHint: { fontSize: 11, color: '#5C6578', fontWeight: '600' as const },
  section: { marginBottom: 24 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF' },
  sectionLink: { fontSize: 13, fontWeight: '600' as const, color: '#00D9FF' },
  namespaceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  namespaceCard: { flex: 1, minWidth: '47%', backgroundColor: '#162033', borderRadius: 10, padding: 12 },
  namespaceName: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 8 },
  namespaceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  namespaceAge: { fontSize: 11, color: '#8B92A8' },
  eventCard: {
    backgroundColor: '#162033',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E2B42',
  },
  eventCardWarning: { borderColor: '#FFB80040', backgroundColor: '#1A1520' },
  eventTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventInfo: { flex: 1, minWidth: 0 },
  eventReason: { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 2 },
  eventObject: { fontSize: 11, color: '#8B92A8' },
  eventAge: { fontSize: 11, color: '#8B92A8', marginLeft: 4 },
  eventMessage: { fontSize: 12, color: '#A8B0C4', marginTop: 8, lineHeight: 17 },
  emptySection: { fontSize: 13, color: '#8B92A8', textAlign: 'center', paddingVertical: 12 },
});
