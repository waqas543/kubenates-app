import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getConfigMap, getEvents } from '@/lib/kubernetesClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, FileText, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'ConfigMapDetails'>;

function toAge(ts?: string): string {
  if (!ts) return '-';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m > 0 ? `${m}m` : `${Math.floor((Date.now() - new Date(ts).getTime()) / 1000)}s`;
}

const MAX_VALUE_LENGTH = 200;

function DataEntry({ keyName, value }: { keyName: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = value.length > MAX_VALUE_LENGTH;
  const displayValue = isLong && !expanded ? value.slice(0, MAX_VALUE_LENGTH) + '...' : value;

  return (
    <View style={entryStyles.container}>
      <Text style={entryStyles.key}>{keyName}</Text>
      <View style={entryStyles.valueBox}>
        <Text style={entryStyles.value}>{displayValue}</Text>
        {isLong && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={entryStyles.toggleBtn}>
            <Text style={entryStyles.toggleText}>{expanded ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const entryStyles = StyleSheet.create({
  container: { marginBottom: 14 },
  key: { fontSize: 13, fontWeight: '700' as const, color: '#00D9FF', marginBottom: 6 },
  valueBox: { backgroundColor: '#0D1219', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#1E2B42' },
  value: { fontSize: 12, color: '#FFFFFF', fontFamily: 'monospace', lineHeight: 18 },
  toggleBtn: { marginTop: 8, alignSelf: 'flex-start' },
  toggleText: { fontSize: 12, color: '#00D9FF', fontWeight: '600' as const },
});

export default function ConfigMapDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name, namespace } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();

  const { data: cm, isLoading } = useQuery({
    queryKey: ['configmap-detail', namespace, name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getConfigMap(toParsedConfig(activeConnection!), namespace, name);
      return res.data as any;
    },
  });

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00D9FF" />
        <Text style={styles.loadingText}>Loading configmap...</Text>
      </View>
    );
  }

  if (!cm) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#FF5757" />
        <Text style={styles.errorText}>ConfigMap not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = cm.metadata ?? {};
  const data: Record<string, string> = cm.data ?? {};
  const labels: Record<string, string> = meta.labels ?? {};
  const dataKeys = Object.keys(data);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FileText size={24} color="#00D9FF" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>{namespace}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{dataKeys.length} key{dataKeys.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Namespace</Text>
              <Text style={styles.detailValue}>{namespace}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>{toAge(meta.creationTimestamp)}</Text>
            </View>
            <View style={[styles.detailRow, styles.noBorder]}>
              <Text style={styles.detailLabel}>Data Keys</Text>
              <Text style={styles.detailValue}>{dataKeys.length}</Text>
            </View>
          </View>
        </View>

        {/* Data section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          {dataKeys.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={32} color="#1E2B42" />
              <Text style={styles.emptyStateText}>No data entries</Text>
            </View>
          ) : (
            dataKeys.map((key) => (
              <DataEntry key={key} keyName={key} value={data[key]} />
            ))
          )}
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
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00D9FF20', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#8B92A8' },
  countBadge: { backgroundColor: '#00D9FF20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  countBadgeText: { fontSize: 12, fontWeight: '700' as const, color: '#00D9FF' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 12 },
  detailCard: { backgroundColor: '#162033', borderRadius: 10, padding: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#0D1219' },
  noBorder: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  detailValue: { fontSize: 13, color: '#FFFFFF', maxWidth: '60%' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: '#162033', borderRadius: 10 },
  emptyStateText: { fontSize: 14, color: '#8B92A8' },
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
