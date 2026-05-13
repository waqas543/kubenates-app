import { useKubernetes } from '@/context/KubernetesContext';
import {
  formatBytesBin,
  formatK8sQuantity,
  formatMillicores,
  parseCpuToMillicores,
  parseQuantityToBytes,
  toParsedConfig,
} from '@/lib/kubeHelpers';
import { getEvents, getNode, getNodeMetrics, getPods } from '@/lib/kubernetesClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Server, XCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'NodeDetails'>;

const PRESSURE_TYPES = new Set(['MemoryPressure', 'DiskPressure', 'PIDPressure', 'NetworkUnavailable']);

function toAge(ts?: string): string {
  if (!ts) return '-';
  const diffMs = Date.now() - new Date(ts).getTime();
  const d = Math.floor(diffMs / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor(diffMs / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor(diffMs / 60000);
  return m > 0 ? `${m}m` : `${Math.floor(diffMs / 1000)}s`;
}

function getNodeRoles(labels: Record<string, string> = {}): string {
  const roles = Object.keys(labels)
    .filter((k) => k.startsWith('node-role.kubernetes.io/'))
    .map((k) => k.replace('node-role.kubernetes.io/', ''));
  return roles.length > 0 ? roles.join(', ') : 'worker';
}

/** Whether this condition row should show as healthy (green check). */
function conditionIsHealthy(type: string, status: string): boolean | null {
  if (type === 'Ready') return status === 'True';
  if (PRESSURE_TYPES.has(type)) return status !== 'True';
  if (type === 'Schedulable') return status !== 'False';
  return null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function UsageBar({ label, usedFrac }: { label: string; usedFrac: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(usedFrac * 100)));
  return (
    <View style={styles.barBlock}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barPct}>{pct}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

type NodeDetailPayload = {
  node: any;
  metrics: { cpu: string; memory: string } | null;
  workload: {
    podCount: number;
    reqCpuM: number;
    reqMemB: number;
    reqEphemeralB: number;
    limCpuM: number;
    limMemB: number;
  };
};

function sumContainerResources(containers: any[] | undefined) {
  let reqCpuM = 0;
  let reqMemB = 0;
  let reqEphemeralB = 0;
  let limCpuM = 0;
  let limMemB = 0;
  for (const c of containers ?? []) {
    const req = c?.resources?.requests ?? {};
    const lim = c?.resources?.limits ?? {};
    reqCpuM += parseCpuToMillicores(req.cpu);
    reqMemB += parseQuantityToBytes(req.memory);
    reqEphemeralB += parseQuantityToBytes(req['ephemeral-storage']);
    limCpuM += parseCpuToMillicores(lim.cpu);
    limMemB += parseQuantityToBytes(lim.memory);
  }
  return { reqCpuM, reqMemB, reqEphemeralB, limCpuM, limMemB };
}

function aggregatePodsOnNode(pods: any[], nodeName: string) {
  let podCount = 0;
  let reqCpuM = 0;
  let reqMemB = 0;
  let reqEphemeralB = 0;
  let limCpuM = 0;
  let limMemB = 0;

  for (const pod of pods) {
    if (pod?.spec?.nodeName !== nodeName) continue;
    const phase = pod?.status?.phase;
    if (phase === 'Succeeded' || phase === 'Failed') continue;

    podCount++;
    const main = sumContainerResources(pod?.spec?.containers);
    const init = sumContainerResources(pod?.spec?.initContainers);
    reqCpuM += main.reqCpuM + init.reqCpuM;
    reqMemB += main.reqMemB + init.reqMemB;
    reqEphemeralB += main.reqEphemeralB + init.reqEphemeralB;
    limCpuM += main.limCpuM + init.limCpuM;
    limMemB += main.limMemB + init.limMemB;
  }

  return { podCount, reqCpuM, reqMemB, reqEphemeralB, limCpuM, limMemB };
}

async function fetchNodeMetrics(
  cfg: ReturnType<typeof toParsedConfig>,
  nodeName: string,
): Promise<{ cpu: string; memory: string } | null> {
  try {
    const res = await getNodeMetrics(cfg, nodeName);
    const u = res.data?.usage;
    if (!u?.cpu && !u?.memory) return null;
    return {
      cpu: u.cpu ? formatMillicores(parseCpuToMillicores(u.cpu)) : '-',
      memory: u.memory ? formatBytesBin(parseQuantityToBytes(u.memory)) : '-',
    };
  } catch {
    return null;
  }
}

export default function NodeDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['node-detail', activeConnection?.name, name],
    enabled: !!activeConnection && !!name,
    queryFn: async (): Promise<NodeDetailPayload> => {
      const cfg = toParsedConfig(activeConnection!);
      const [nodeRes, podsRes] = await Promise.all([
        getNode(cfg, name),
        getPods(cfg, 'all'),
      ]);
      const node = nodeRes.data as any;
      const pods: any[] = (podsRes.data as any)?.items ?? [];
      const workload = aggregatePodsOnNode(pods, name);
      const metrics = await fetchNodeMetrics(cfg, name);
      return { node, metrics, workload };
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-for', 'node', name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getEvents(toParsedConfig(activeConnection!), 'all');
      const items: any[] = res.data?.items ?? [];
      return items
        .filter((e: any) => e.involvedObject?.name === name)
        .sort((a: any, b: any) => {
          const ta = a.lastTimestamp ?? a.eventTime ?? a.metadata?.creationTimestamp ?? '';
          const tb = b.lastTimestamp ?? b.eventTime ?? b.metadata?.creationTimestamp ?? '';
          return tb.localeCompare(ta);
        });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#50FA7B" />
        <Text style={styles.loadingText}>Loading node...</Text>
      </View>
    );
  }

  if (isError || !data?.node) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#FF5757" />
        <Text style={styles.errorText}>
          {isError ? (error as Error)?.message ?? 'Failed to load node' : 'Node not found'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { node, metrics, workload } = data;
  const meta = node.metadata ?? {};
  const status = node.status ?? {};
  const spec = node.spec ?? {};
  const nodeInfo = status.nodeInfo ?? {};
  const capacity = status.capacity ?? {};
  const allocatable = status.allocatable ?? {};
  const conditions: any[] = status.conditions ?? [];
  const labels: Record<string, string> = meta.labels ?? {};
  const annotations: Record<string, string> = meta.annotations ?? {};
  const addresses: { type?: string; address?: string }[] = status.addresses ?? [];
  const roles = getNodeRoles(labels);
  const readyCond = conditions.find((c: any) => c.type === 'Ready');
  const isReady = readyCond?.status === 'True';

  const allocCpuM = parseCpuToMillicores(allocatable.cpu);
  const allocMemB = parseQuantityToBytes(allocatable.memory);
  const capEphemB = parseQuantityToBytes(capacity['ephemeral-storage']);
  const allocEphemB = parseQuantityToBytes(allocatable['ephemeral-storage']);

  const cpuReqFrac = allocCpuM > 0 ? workload.reqCpuM / allocCpuM : 0;
  const memReqFrac = allocMemB > 0 ? workload.reqMemB / allocMemB : 0;
  const diskReqFrac = allocEphemB > 0 ? workload.reqEphemeralB / allocEphemB : capEphemB > 0 ? workload.reqEphemeralB / capEphemB : 0;

  const extraCapacityKeys = Object.keys(capacity).filter(
    (k) => !['cpu', 'memory', 'pods'].includes(k),
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Server size={24} color="#50FA7B" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>{roles}</Text>
          </View>
          <View style={[styles.statusBadge, isReady ? styles.statusGreen : styles.statusRed]}>
            <Text style={styles.statusText}>{isReady ? 'Ready' : 'NotReady'}</Text>
          </View>
        </View>

        {addresses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Addresses</Text>
            <View style={styles.detailCard}>
              {addresses.map((a, i) => (
                <DetailRow key={`${a.type}-${i}`} label={a.type ?? 'Address'} value={a.address ?? '-'} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.detailCard}>
            <DetailRow label="Status" value={isReady ? 'Ready' : 'NotReady'} />
            <DetailRow label="Roles" value={roles} />
            <DetailRow label="Kubelet" value={nodeInfo.kubeletVersion ?? '-'} />
            <DetailRow label="Kube-proxy" value={nodeInfo.kubeProxyVersion ?? '-'} />
            <DetailRow label="OS" value={nodeInfo.osImage ?? '-'} />
            <DetailRow label="Kernel" value={nodeInfo.kernelVersion ?? '-'} />
            <DetailRow label="Architecture" value={nodeInfo.architecture ?? '-'} />
            <DetailRow label="Container runtime" value={nodeInfo.containerRuntimeVersion ?? '-'} />
            <View style={[styles.detailRow, styles.noBorder]}>
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>{toAge(meta.creationTimestamp)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capacity</Text>
          <View style={styles.grid}>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>CPU</Text>
              <Text style={styles.gridValue}>{formatK8sQuantity('cpu', capacity.cpu)}</Text>
              <Text style={styles.gridRaw} numberOfLines={1}>{capacity.cpu ?? '-'}</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Memory</Text>
              <Text style={styles.gridValue}>{formatK8sQuantity('memory', capacity.memory)}</Text>
              <Text style={styles.gridRaw} numberOfLines={1}>{capacity.memory ?? '-'}</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Pods</Text>
              <Text style={styles.gridValue}>{capacity.pods ?? '-'}</Text>
            </View>
          </View>
          {extraCapacityKeys.length > 0 && (
            <View style={[styles.detailCard, { marginTop: 10 }]}>
              {extraCapacityKeys.map((k, idx) => (
                <View
                  key={k}
                  style={[
                    styles.detailRow,
                    idx === extraCapacityKeys.length - 1 && styles.noBorder,
                  ]}
                >
                  <Text style={styles.detailLabel}>{k}</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {k.includes('ephemeral') || k.includes('storage') || k.includes('hugepages')
                      ? formatK8sQuantity('memory', capacity[k])
                      : String(capacity[k] ?? '-')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allocatable</Text>
          <View style={styles.grid}>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>CPU</Text>
              <Text style={styles.gridValue}>{formatK8sQuantity('cpu', allocatable.cpu)}</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Memory</Text>
              <Text style={styles.gridValue}>{formatK8sQuantity('memory', allocatable.memory)}</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Pods</Text>
              <Text style={styles.gridValue}>{allocatable.pods ?? '-'}</Text>
            </View>
          </View>
        </View>

        {metrics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current usage (metrics-server)</Text>
            <View style={styles.detailCard}>
              <DetailRow label="CPU" value={metrics.cpu} />
              <View style={[styles.detailRow, styles.noBorder]}>
                <Text style={styles.detailLabel}>Memory</Text>
                <Text style={styles.detailValue}>{metrics.memory}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scheduled workloads</Text>
          <Text style={styles.sectionHint}>
            Totals from pod CPU/memory requests and limits on this node (running/pending; excludes succeeded/failed).
          </Text>
          <View style={styles.detailCard}>
            <DetailRow label="Pods" value={String(workload.podCount)} />
            <DetailRow
              label="CPU requests"
              value={`${formatMillicores(workload.reqCpuM)} / ${formatMillicores(allocCpuM)} allocatable`}
            />
            <DetailRow
              label="Memory requests"
              value={`${formatBytesBin(workload.reqMemB)} / ${formatBytesBin(allocMemB)} allocatable`}
            />
            {(workload.reqEphemeralB > 0 || allocEphemB > 0 || capEphemB > 0) && (
              <DetailRow
                label="Ephemeral storage requests"
                value={
                  allocEphemB > 0 || capEphemB > 0
                    ? `${formatBytesBin(workload.reqEphemeralB)} / ${formatBytesBin(allocEphemB || capEphemB)}`
                    : formatBytesBin(workload.reqEphemeralB)
                }
              />
            )}
            <DetailRow
              label="CPU limits (sum)"
              value={workload.limCpuM > 0 ? formatMillicores(workload.limCpuM) : '-'}
            />
            <View style={[styles.detailRow, styles.noBorder]}>
              <Text style={styles.detailLabel}>Memory limits (sum)</Text>
              <Text style={styles.detailValue}>
                {workload.limMemB > 0 ? formatBytesBin(workload.limMemB) : '-'}
              </Text>
            </View>
          </View>
          {(allocCpuM > 0 || allocMemB > 0 || allocEphemB > 0 || capEphemB > 0) && (
            <View style={styles.barSection}>
              {allocCpuM > 0 && workload.reqCpuM > 0 && (
                <UsageBar label="CPU requests vs allocatable" usedFrac={cpuReqFrac} />
              )}
              {allocMemB > 0 && workload.reqMemB > 0 && (
                <UsageBar label="Memory requests vs allocatable" usedFrac={memReqFrac} />
              )}
              {(allocEphemB > 0 || capEphemB > 0) && workload.reqEphemeralB > 0 && diskReqFrac > 0 && (
                <UsageBar label="Ephemeral requests vs capacity" usedFrac={diskReqFrac} />
              )}
            </View>
          )}
        </View>

        {Array.isArray(spec.taints) && spec.taints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Taints</Text>
            {spec.taints.map((t: any, i: number) => (
              <View key={i} style={styles.taintRow}>
                <Text style={styles.taintText}>
                  {t.key}
                  {t.value != null && t.value !== '' ? `=${t.value}` : ''}
                  {t.effect ? `:${t.effect}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {conditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            {conditions.map((c: any, i: number) => {
              const healthy = conditionIsHealthy(c.type, c.status);
              return (
                <View key={i} style={styles.conditionRow}>
                  <View style={styles.conditionLeft}>
                    {healthy === true && <CheckCircle2 size={16} color="#50FA7B" />}
                    {healthy === false && <XCircle size={16} color="#FF5757" />}
                    {healthy === null && <AlertCircle size={16} color="#8B92A8" />}
                    <View style={styles.conditionInfo}>
                      <Text style={styles.conditionType}>{c.type}</Text>
                      {c.message ? (
                        <Text style={styles.conditionMessage} numberOfLines={3}>{c.message}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.conditionStatus}>{c.status}</Text>
                </View>
              );
            })}
          </View>
        )}

        {Object.keys(labels).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Labels</Text>
            <View style={styles.tagsWrap}>
              {Object.entries(labels).map(([k, v]) => (
                <View key={k} style={styles.tag}>
                  <Text style={styles.tagText}>{k}={String(v)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {Object.keys(annotations).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Annotations ({Object.keys(annotations).length})</Text>
            <View style={styles.tagsWrap}>
              {Object.entries(annotations).map(([k]) => (
                <View key={k} style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>{k}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Events */}
        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Events ({events.length})</Text>
            {events.map((e: any, i: number) => {
              const isWarning = e.type === 'Warning';
              const ts = e.lastTimestamp ?? e.eventTime ?? e.metadata?.creationTimestamp;
              return (
                <View key={i} style={[styles.eventCard, isWarning && styles.eventCardWarning]}>
                  <View style={styles.eventTop}>
                    {isWarning
                      ? <AlertTriangle size={14} color="#FFB86C" />
                      : <Info size={14} color="#00D9FF" />}
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventReason}>{e.reason ?? '-'}</Text>
                      <Text style={styles.eventMessage} numberOfLines={2}>{e.message ?? '-'}</Text>
                    </View>
                    <View style={styles.eventMeta}>
                      <Text style={[styles.eventType, isWarning ? styles.eventTypeWarning : styles.eventTypeNormal]}>{e.type ?? '-'}</Text>
                      <Text style={styles.eventAge}>{toAge(ts)}</Text>
                      {(e.count ?? 0) > 1 && <Text style={styles.eventCount}>×{e.count}</Text>}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  center: { flex: 1, backgroundColor: '#0A0E1A', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { color: '#8B92A8', fontSize: 14 },
  errorText: { color: '#FF5757', fontSize: 16, fontWeight: '600' as const, marginTop: 8, textAlign: 'center' },
  backBtn: { backgroundColor: '#00D9FF', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  backBtnText: { color: '#000', fontWeight: '600' as const },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#162033', borderRadius: 12, padding: 16, marginBottom: 20 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#50FA7B20', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#8B92A8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusGreen: { backgroundColor: '#50FA7B20' },
  statusRed: { backgroundColor: '#FF575720' },
  statusText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 12 },
  sectionHint: { fontSize: 12, color: '#8B92A8', marginBottom: 10, lineHeight: 18 },
  detailCard: { backgroundColor: '#162033', borderRadius: 10, padding: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0D1219', gap: 12 },
  noBorder: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const, flexShrink: 0, maxWidth: '42%' },
  detailValue: { fontSize: 13, color: '#FFFFFF', flex: 1, textAlign: 'right' },
  grid: { flexDirection: 'row', gap: 10 },
  gridCard: { flex: 1, backgroundColor: '#162033', borderRadius: 10, padding: 14 },
  gridLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 6, fontWeight: '600' as const },
  gridValue: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  gridRaw: { fontSize: 10, color: '#5C6578', marginTop: 4 },
  barSection: { marginTop: 14, gap: 14 },
  barBlock: { gap: 6 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 12, color: '#8B92A8', fontWeight: '600' as const },
  barPct: { fontSize: 12, color: '#50FA7B', fontWeight: '700' as const },
  barTrack: { height: 6, backgroundColor: '#0D1219', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#50FA7B', borderRadius: 3 },
  conditionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#162033', borderRadius: 8, padding: 12, marginBottom: 6 },
  conditionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  conditionInfo: { flex: 1 },
  conditionType: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 2 },
  conditionMessage: { fontSize: 11, color: '#8B92A8', lineHeight: 16 },
  conditionStatus: { fontSize: 11, color: '#8B92A8', marginLeft: 8 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#162033', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#1E2B42', maxWidth: '100%' },
  tagText: { fontSize: 11, color: '#8B92A8' },
  taintRow: { backgroundColor: '#162033', borderRadius: 8, padding: 12, marginBottom: 6 },
  taintText: { fontSize: 13, color: '#FFB800', fontFamily: 'monospace' },
  eventCard: { backgroundColor: '#162033', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1E2B42' },
  eventCardWarning: { borderColor: '#FFB86C40' },
  eventTop: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
  eventInfo: { flex: 1 },
  eventReason: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 3 },
  eventMessage: { fontSize: 12, color: '#8B92A8', lineHeight: 17 },
  eventMeta: { alignItems: 'flex-end' as const, gap: 3 },
  eventType: { fontSize: 10, fontWeight: '700' as const, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  eventTypeWarning: { backgroundColor: '#FFB86C25', color: '#FFB86C' },
  eventTypeNormal: { backgroundColor: '#00D9FF20', color: '#00D9FF' },
  eventAge: { fontSize: 11, color: '#8B92A8' },
  eventCount: { fontSize: 10, color: '#8B92A8' },
});
