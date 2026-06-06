import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { deleteNamespaced, getEvents, getReplicaSet } from '@/lib/kubernetesClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'ReplicaSetDetails'>;

function toAge(ts?: string): string {
  if (!ts) return '-';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m > 0 ? `${m}m` : `${Math.floor((Date.now() - new Date(ts).getTime()) / 1000)}s`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function ReplicaSetDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name, namespace } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: rs, isLoading } = useQuery({
    queryKey: ['replicaset-detail', namespace, name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getReplicaSet(toParsedConfig(activeConnection!), namespace, name);
      return res.data as any;
    },
  });

  const cfg = activeConnection ? toParsedConfig(activeConnection) : null;

  const { data: events = [] } = useQuery({
    queryKey: ['events-for', namespace, name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getEvents(toParsedConfig(activeConnection!), namespace);
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

  const handleDelete = () => {
    Alert.alert('Delete ReplicaSet', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (!cfg) return;
          setActionLoading('delete');
          try {
            await deleteNamespaced(cfg, 'replicasets', namespace, name);
            queryClient.invalidateQueries({ queryKey: ['replicasets'] });
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Delete failed');
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8BE9FD" />
        <Text style={styles.loadingText}>Loading replicaset...</Text>
      </View>
    );
  }

  if (!rs) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#FF5757" />
        <Text style={styles.errorText}>ReplicaSet not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spec = rs.spec ?? {};
  const status = rs.status ?? {};
  const meta = rs.metadata ?? {};
  const desired = spec.replicas ?? 0;
  const current = status.replicas ?? 0;
  const ready = status.readyReplicas ?? 0;
  const allReady = ready === desired && desired > 0;
  const containers: any[] = spec.template?.spec?.containers ?? [];
  const labels = meta.labels ?? {};
  const ownerReferences: any[] = meta.ownerReferences ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}><RefreshCw size={24} color="#8BE9FD" /></View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>{namespace}</Text>
          </View>
          <View style={[styles.statusBadge, allReady ? styles.statusGreen : styles.statusOrange]}>
            <Text style={styles.statusText}>{allReady ? 'Ready' : 'Not Ready'}</Text>
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.grid}>
            <View style={styles.gridCard}><Text style={styles.gridLabel}>Desired</Text><Text style={styles.gridValue}>{desired}</Text></View>
            <View style={styles.gridCard}><Text style={styles.gridLabel}>Current</Text><Text style={styles.gridValue}>{current}</Text></View>
            <View style={styles.gridCard}><Text style={styles.gridLabel}>Ready</Text><Text style={[styles.gridValue, allReady && styles.green]}>{ready}</Text></View>
            <View style={styles.gridCard}><Text style={styles.gridLabel}>Age</Text><Text style={styles.gridValue}>{toAge(meta.creationTimestamp)}</Text></View>
          </View>
          <View style={styles.detailCard}>
            <DetailRow label="Selector" value={Object.entries(spec.selector?.matchLabels ?? {}).map(([k, v]) => `${k}=${v}`).join(', ') || '-'} />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnRed, actionLoading === 'delete' && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={!!actionLoading}
          >
            <Trash2 size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>{actionLoading === 'delete' ? 'Deleting...' : 'Delete ReplicaSet'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnDark]}
            onPress={() => navigation.navigate('Logs', { type: 'replicaset', name, namespace })}
            disabled={!!actionLoading}
          >
            <Text style={styles.actionBtnText}>View Logs</Text>
          </TouchableOpacity>
        </View>

        {/* Owner References */}
        {ownerReferences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner References</Text>
            {ownerReferences.map((ref: any, i: number) => (
              <View key={i} style={styles.ownerCard}>
                <View style={styles.ownerRow}>
                  <Text style={styles.ownerLabel}>Kind</Text>
                  <Text style={styles.ownerValue}>{ref.kind ?? '-'}</Text>
                </View>
                <View style={styles.ownerRow}>
                  <Text style={styles.ownerLabel}>Name</Text>
                  <Text style={styles.ownerValue} numberOfLines={1}>{ref.name ?? '-'}</Text>
                </View>
                <View style={styles.ownerRow}>
                  <Text style={styles.ownerLabel}>Controller</Text>
                  <Text style={styles.ownerValue}>{ref.controller ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Containers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Containers ({containers.length})</Text>
          {containers.map((c: any) => (
            <View key={c.name} style={styles.containerCard}>
              <View style={styles.containerHeader}>
                <Text style={styles.containerName}>{c.name}</Text>
                <View style={styles.portRow}>
                  {(c.ports ?? []).map((p: any, i: number) => (
                    <Text key={i} style={styles.portBadge}>{p.containerPort}/{p.protocol ?? 'TCP'}</Text>
                  ))}
                </View>
              </View>
              <Text style={styles.containerImage} numberOfLines={1}>{c.image}</Text>
              {c.resources?.requests && (
                <View style={styles.resourceRow}>
                  <Text style={styles.resourceText}>CPU req: {c.resources.requests.cpu ?? '-'}</Text>
                  <Text style={styles.resourceText}>Mem req: {c.resources.requests.memory ?? '-'}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Labels */}
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
  center: { flex: 1, backgroundColor: '#0A0E1A', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#8B92A8', fontSize: 14 },
  errorText: { color: '#FF5757', fontSize: 16, fontWeight: '600' as const, marginTop: 8 },
  backBtn: { backgroundColor: '#00D9FF', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  backBtnText: { color: '#000', fontWeight: '600' as const },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#162033', borderRadius: 12, padding: 16, marginBottom: 20 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8BE9FD20', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#8B92A8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusGreen: { backgroundColor: '#00FF8820' },
  statusOrange: { backgroundColor: '#FFB80020' },
  statusText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  gridCard: { flex: 1, minWidth: '47%', backgroundColor: '#162033', borderRadius: 10, padding: 12 },
  gridLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 6, fontWeight: '600' as const },
  gridValue: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF' },
  green: { color: '#00FF88' },
  detailCard: { backgroundColor: '#162033', borderRadius: 10, padding: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0D1219' },
  detailLabel: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  detailValue: { fontSize: 13, color: '#FFFFFF', maxWidth: '60%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, flex: 1 },
  btnRed: { backgroundColor: '#FF5757' },
  btnDark: { backgroundColor: '#1E2B42' },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF' },
  ownerCard: { backgroundColor: '#162033', borderRadius: 10, padding: 12, marginBottom: 8 },
  ownerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ownerLabel: { fontSize: 12, color: '#8B92A8', fontWeight: '600' as const },
  ownerValue: { fontSize: 12, color: '#FFFFFF', maxWidth: '60%' },
  containerCard: { backgroundColor: '#162033', borderRadius: 10, padding: 12, marginBottom: 8 },
  containerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  containerName: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF' },
  portRow: { flexDirection: 'row', gap: 4 },
  portBadge: { fontSize: 10, color: '#00D9FF', backgroundColor: '#00D9FF20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  containerImage: { fontSize: 12, color: '#8B92A8', marginBottom: 6 },
  resourceRow: { flexDirection: 'row', gap: 12 },
  resourceText: { fontSize: 11, color: '#8B92A8' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#162033', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#1E2B42' },
  tagText: { fontSize: 11, color: '#8B92A8' },
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
