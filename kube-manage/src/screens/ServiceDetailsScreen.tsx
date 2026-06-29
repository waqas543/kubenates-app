import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getEvents, getService } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Info, Network } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'ServiceDetails'>;

function toAge(ts?: string): string {
  if (!ts) return '-';
  const diff = Date.now() - new Date(ts).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor(diff / 60000);
  return m > 0 ? `${m}m` : `${Math.floor(diff / 1000)}s`;
}

function typeBadgeStyle(type: string) {
  switch (type) {
    case 'LoadBalancer': return { bg: '#00D9FF20', color: '#00D9FF' };
    case 'NodePort': return { bg: '#FFB80020', color: '#FFB800' };
    case 'ExternalName': return { bg: '#FF6B9D20', color: '#FF6B9D' };
    default: return { bg: '#AA66FF20', color: '#AA66FF' };
  }
}

export default function ServiceDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name, namespace } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function DetailRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
      </View>
    );
  }

  const { data: svc, isLoading } = useQuery({
    queryKey: ['service-detail', namespace, name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getService(toParsedConfig(activeConnection!), namespace, name);
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
        <ActivityIndicator size="large" color={colors.accentPurple} />
        <Text style={styles.loadingText}>Loading service...</Text>
      </View>
    );
  }

  if (!svc) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color={colors.accentRed} />
        <Text style={styles.errorText}>Service not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = svc.metadata ?? {};
  const spec = svc.spec ?? {};
  const status = svc.status ?? {};
  const labels = meta.labels ?? {};
  const selector = spec.selector ?? {};
  const ports: any[] = spec.ports ?? [];
  const serviceType: string = spec.type ?? 'ClusterIP';
  const clusterIP: string = spec.clusterIP ?? '-';
  const externalIP: string = status.loadBalancer?.ingress?.[0]?.ip ?? '';
  const badge = typeBadgeStyle(serviceType);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Network size={24} color={colors.accentPurple} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>{namespace}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: badge.color }]}>{serviceType}</Text>
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.grid}>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Type</Text>
              <Text style={[styles.gridValue, { color: badge.color }]}>{serviceType}</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Cluster IP</Text>
              <Text style={styles.gridValue} numberOfLines={1}>{clusterIP}</Text>
            </View>
            {externalIP ? (
              <View style={styles.gridCard}>
                <Text style={styles.gridLabel}>External IP</Text>
                <Text style={[styles.gridValue, styles.cyan]} numberOfLines={1}>{externalIP}</Text>
              </View>
            ) : null}
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Age</Text>
              <Text style={styles.gridValue}>{toAge(meta.creationTimestamp)}</Text>
            </View>
          </View>
        </View>

        {/* Ports */}
        {ports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ports</Text>
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Port</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Target Port</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Node Port</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Protocol</Text>
              </View>
              {ports.map((p: any, i: number) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{p.port ?? '-'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{p.targetPort ?? '-'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{p.nodePort ?? '-'}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{p.protocol ?? 'TCP'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Selector */}
        {Object.keys(selector).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selector</Text>
            <View style={styles.tagsWrap}>
              {Object.entries(selector).map(([k, v]) => (
                <View key={k} style={styles.selectorTag}>
                  <Text style={styles.selectorTagText}>{k}={String(v)}</Text>
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
    backBtn: { backgroundColor: c.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
    backBtnText: { color: '#000', fontWeight: '600' as const },
    content: { padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bgCard, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: c.border },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#AA66FF20', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    title: { fontSize: 18, fontWeight: '700' as const, color: c.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: c.textSecondary },
    typeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    typeBadgeText: { fontSize: 12, fontWeight: '700' as const },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: c.text, marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridCard: { flex: 1, minWidth: '47%', backgroundColor: c.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: c.border },
    gridLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 6, fontWeight: '600' as const },
    gridValue: { fontSize: 15, fontWeight: '700' as const, color: c.text },
    cyan: { color: c.accent },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.bgSecondary },
    detailLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, maxWidth: '60%' },
    tableCard: { backgroundColor: c.bgCard, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
    tableHeader: { flexDirection: 'row', backgroundColor: c.border, paddingHorizontal: 12, paddingVertical: 10 },
    tableHeaderCell: { fontSize: 11, fontWeight: '700' as const, color: c.textSecondary, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
    tableRowEven: { backgroundColor: c.bgSecondary },
    tableCell: { fontSize: 13, color: c.text },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    selectorTag: { backgroundColor: '#00D9FF15', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#00D9FF40' },
    selectorTagText: { fontSize: 12, color: '#00D9FF', fontWeight: '600' as const },
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
