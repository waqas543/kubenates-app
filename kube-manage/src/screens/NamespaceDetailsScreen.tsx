import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getEvents, getNamespace } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle2, Database, Info, XCircle } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'NamespaceDetails'>;

function toAge(ts?: string): string {
  if (!ts) return '-';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m > 0 ? `${m}m` : `${Math.floor((Date.now() - new Date(ts).getTime()) / 1000)}s`;
}

export default function NamespaceDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
    return (
      <View style={[styles.detailRow, last && styles.noBorder]}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
      </View>
    );
  }

  const { data: ns, isLoading } = useQuery({
    queryKey: ['namespace-detail', name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getNamespace(toParsedConfig(activeConnection!), name);
      return res.data as any;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-for', 'namespace', name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getEvents(toParsedConfig(activeConnection!), name);
      const items: any[] = res.data?.items ?? [];
      return items.sort((a: any, b: any) => {
        const ta = a.lastTimestamp ?? a.eventTime ?? a.metadata?.creationTimestamp ?? '';
        const tb = b.lastTimestamp ?? b.eventTime ?? b.metadata?.creationTimestamp ?? '';
        return tb.localeCompare(ta);
      });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accentPurple} />
        <Text style={styles.loadingText}>Loading namespace...</Text>
      </View>
    );
  }

  if (!ns) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color={colors.accentRed} />
        <Text style={styles.errorText}>Namespace not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = ns.metadata ?? {};
  const phase: string = ns.status?.phase ?? '-';
  const isActive = phase === 'Active';
  const labels: Record<string, string> = meta.labels ?? {};
  const annotations: Record<string, string> = meta.annotations ?? {};
  const finalizers: string[] = meta.finalizers ?? [];
  const conditions: any[] = ns.status?.conditions ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Database size={24} color={colors.accentPurple} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>Namespace</Text>
          </View>
          <View style={[styles.statusBadge, isActive ? styles.statusGreen : styles.statusRed]}>
            <Text style={styles.statusText}>{phase}</Text>
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.detailCard}>
            <DetailRow label="Phase" value={phase} />
            <DetailRow label="UID" value={meta.uid ?? '-'} />
            <DetailRow label="Resource Version" value={meta.resourceVersion ?? '-'} />
            <DetailRow label="Age" value={toAge(meta.creationTimestamp)} last />
          </View>
        </View>

        {/* Conditions */}
        {conditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            {conditions.map((c: any, i: number) => (
              <View key={i} style={styles.conditionRow}>
                <View style={styles.conditionLeft}>
                  {c.status === 'True'
                    ? <CheckCircle2 size={16} color="#50FA7B" />
                    : <XCircle size={16} color="#FF5757" />}
                  <View style={styles.conditionInfo}>
                    <Text style={styles.conditionType}>{c.type}</Text>
                    {c.message ? (
                      <Text style={styles.conditionMessage} numberOfLines={2}>{c.message}</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.conditionStatus}>{c.status}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Finalizers */}
        {finalizers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Finalizers</Text>
            <View style={styles.tagsWrap}>
              {finalizers.map((f, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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

        {/* Annotations */}
        {Object.keys(annotations).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Annotations</Text>
            <View style={styles.detailCard}>
              {Object.entries(annotations).map(([k, v], i, arr) => (
                <DetailRow key={k} label={k} value={String(v)} last={i === arr.length - 1} />
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
                      : <Info size={14} color={colors.accent} />}
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

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: c.textSecondary, fontSize: 14 },
    errorText: { color: c.accentRed, fontSize: 16, fontWeight: '600' as const, marginTop: 8 },
    backBtn: { backgroundColor: c.accentPurple, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
    backBtnText: { color: '#FFF', fontWeight: '600' as const },
    content: { padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bgCard, borderRadius: 12, padding: 16, marginBottom: 20 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#AA66FF20', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    title: { fontSize: 18, fontWeight: '700' as const, color: c.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: c.textSecondary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    statusGreen: { backgroundColor: '#50FA7B20' },
    statusRed: { backgroundColor: '#FF575720' },
    statusText: { fontSize: 12, fontWeight: '700' as const, color: c.text },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: c.text, marginBottom: 12 },
    detailCard: { backgroundColor: c.bgCard, borderRadius: 10, padding: 14 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.bgSecondary },
    noBorder: { borderBottomWidth: 0 },
    detailLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const, flex: 1 },
    detailValue: { fontSize: 13, color: c.text, maxWidth: '60%', textAlign: 'right' },
    conditionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: c.bgCard, borderRadius: 8, padding: 12, marginBottom: 6 },
    conditionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
    conditionInfo: { flex: 1 },
    conditionType: { fontSize: 13, fontWeight: '600' as const, color: c.text, marginBottom: 2 },
    conditionMessage: { fontSize: 11, color: c.textSecondary, lineHeight: 16 },
    conditionStatus: { fontSize: 11, color: c.textSecondary, marginLeft: 8 },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: c.bgCard, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: c.border },
    tagText: { fontSize: 11, color: c.textSecondary },
    eventCard: { backgroundColor: c.bgCard, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
    eventCardWarning: { borderColor: '#FFB86C40' },
    eventTop: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8 },
    eventInfo: { flex: 1 },
    eventReason: { fontSize: 13, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    eventMessage: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
    eventMeta: { alignItems: 'flex-end' as const, gap: 3 },
    eventType: { fontSize: 10, fontWeight: '700' as const, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    eventTypeWarning: { backgroundColor: '#FFB86C25', color: '#FFB86C' },
    eventTypeNormal: { backgroundColor: '#00D9FF20', color: '#00D9FF' },
    eventAge: { fontSize: 11, color: c.textSecondary },
    eventCount: { fontSize: 10, color: c.textSecondary },
  });
}
