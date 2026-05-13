import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { deleteNamespaced, getCronJob, getEvents, patchNamespaced } from '@/lib/kubernetesClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Info,
  Pause,
  Play,
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
type RouteType = RouteProp<RootStackParamList, 'CronJobDetails'>;

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

export default function CronJobDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name, namespace } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: cronJob, isLoading, refetch } = useQuery({
    queryKey: ['cronjob-detail', namespace, name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getCronJob(toParsedConfig(activeConnection!), namespace, name);
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

  const handleSuspendToggle = (currentlySuspended: boolean) => {
    const action = currentlySuspended ? 'Resume' : 'Suspend';
    Alert.alert(`${action} CronJob`, `${action} "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action, onPress: async () => {
          if (!cfg) return;
          setActionLoading('suspend');
          try {
            await patchNamespaced(cfg, 'cronjobs', namespace, name, {
              spec: { suspend: !currentlySuspended },
            });
            await refetch();
            queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? `${action} failed`);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete CronJob', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (!cfg) return;
          setActionLoading('delete');
          try {
            await deleteNamespaced(cfg, 'cronjobs', namespace, name);
            queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
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
        <ActivityIndicator size="large" color="#AA66FF" />
        <Text style={styles.loadingText}>Loading cronjob...</Text>
      </View>
    );
  }

  if (!cronJob) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#FF5757" />
        <Text style={styles.errorText}>CronJob not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const spec = cronJob.spec ?? {};
  const status = cronJob.status ?? {};
  const meta = cronJob.metadata ?? {};
  const suspended = spec.suspend ?? false;
  const active = status.active?.length ?? 0;
  const labels = meta.labels ?? {};

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}><Clock size={24} color="#AA66FF" /></View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>{namespace}</Text>
          </View>
          <View style={[styles.statusBadge, suspended ? styles.statusSuspended : styles.statusActive]}>
            <Text style={[styles.statusText, suspended ? styles.statusSuspendedText : styles.statusActiveText]}>
              {suspended ? 'Suspended' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.grid}>
            <View style={styles.gridCard}><Text style={styles.gridLabel}>Active Jobs</Text><Text style={[styles.gridValue, active > 0 && styles.cyan]}>{active}</Text></View>
            <View style={styles.gridCard}><Text style={styles.gridLabel}>Age</Text><Text style={styles.gridValue}>{toAge(meta.creationTimestamp)}</Text></View>
          </View>
          <View style={styles.detailCard}>
            <DetailRow label="Schedule" value={spec.schedule ?? '-'} />
            <DetailRow label="Suspended" value={suspended ? 'Yes' : 'No'} />
            <DetailRow label="Last Schedule" value={status.lastScheduleTime ? toAge(status.lastScheduleTime) + ' ago' : 'Never'} />
            <DetailRow label="Concurrency Policy" value={spec.concurrencyPolicy ?? '-'} />
            <DetailRow label="Successful Jobs History" value={String(spec.successfulJobsHistoryLimit ?? 3)} />
            <DetailRow label="Failed Jobs History" value={String(spec.failedJobsHistoryLimit ?? 1)} />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, suspended ? styles.btnGreen : styles.btnOrange, actionLoading === 'suspend' && styles.btnDisabled]}
            onPress={() => handleSuspendToggle(suspended)}
            disabled={!!actionLoading}
          >
            {suspended ? <Play size={16} color="#FFF" /> : <Pause size={16} color="#FFF" />}
            <Text style={styles.actionBtnText}>
              {actionLoading === 'suspend' ? 'Updating...' : (suspended ? 'Resume' : 'Suspend')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnRed, actionLoading === 'delete' && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={!!actionLoading}
          >
            <Trash2 size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>{actionLoading === 'delete' ? 'Deleting...' : 'Delete'}</Text>
          </TouchableOpacity>
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
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#AA66FF20', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#8B92A8' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusActive: { backgroundColor: '#00FF8820' },
  statusSuspended: { backgroundColor: '#FFB80020' },
  statusText: { fontSize: 12, fontWeight: '700' as const },
  statusActiveText: { color: '#00FF88' },
  statusSuspendedText: { color: '#FFB800' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  gridCard: { flex: 1, minWidth: '47%', backgroundColor: '#162033', borderRadius: 10, padding: 12 },
  gridLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 6, fontWeight: '600' as const },
  gridValue: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF' },
  cyan: { color: '#00D9FF' },
  detailCard: { backgroundColor: '#162033', borderRadius: 10, padding: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0D1219' },
  detailLabel: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  detailValue: { fontSize: 13, color: '#FFFFFF', maxWidth: '60%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, minWidth: '47%', flex: 1 },
  btnGreen: { backgroundColor: '#00FF88' },
  btnOrange: { backgroundColor: '#FFB800' },
  btnRed: { backgroundColor: '#FF5757' },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF' },
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
