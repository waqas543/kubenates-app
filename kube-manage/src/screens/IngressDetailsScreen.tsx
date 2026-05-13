import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getEvents, getIngress } from '@/lib/kubernetesClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Globe, Info, Lock, Route } from 'lucide-react-native';
import React from 'react';
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
type RouteType = RouteProp<RootStackParamList, 'IngressDetails'>;

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

export default function IngressDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name, namespace } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();
  const queryClient = useQueryClient();

  const { data: ing, isLoading } = useQuery({
    queryKey: ['ingress-detail', namespace, name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getIngress(toParsedConfig(activeConnection!), namespace, name);
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
        <ActivityIndicator size="large" color="#FF6B9D" />
        <Text style={styles.loadingText}>Loading ingress...</Text>
      </View>
    );
  }

  if (!ing) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#FF5757" />
        <Text style={styles.errorText}>Ingress not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = ing.metadata ?? {};
  const spec = ing.spec ?? {};
  const status = ing.status ?? {};
  const labels = meta.labels ?? {};
  const rules: any[] = spec.rules ?? [];
  const tlsEntries: any[] = spec.tls ?? [];
  const ingressClass: string = spec.ingressClassName ?? '-';
  const address: string = status.loadBalancer?.ingress?.[0]?.ip
    ?? status.loadBalancer?.ingress?.[0]?.hostname
    ?? '-';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Globe size={24} color="#FF6B9D" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>{namespace}</Text>
          </View>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.grid}>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Class</Text>
              <Text style={styles.gridValue} numberOfLines={1}>{ingressClass}</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Address</Text>
              <Text style={[styles.gridValue, address !== '-' && styles.cyan]} numberOfLines={1}>
                {address}
              </Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Age</Text>
              <Text style={styles.gridValue}>{toAge(meta.creationTimestamp)}</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>Rules</Text>
              <Text style={styles.gridValue}>{rules.length}</Text>
            </View>
          </View>
        </View>

        {/* Rules */}
        {rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rules</Text>
            {rules.map((rule: any, ri: number) => {
              const host: string = rule.host ?? '*';
              const paths: any[] = rule.http?.paths ?? [];
              return (
                <View key={ri} style={styles.ruleCard}>
                  <View style={styles.ruleHostRow}>
                    <Globe size={14} color="#FF6B9D" />
                    <Text style={styles.ruleHost}>{host}</Text>
                  </View>
                  {paths.length > 0 ? (
                    <View style={styles.pathsContainer}>
                      <View style={styles.pathHeader}>
                        <Text style={[styles.pathHeaderText, { flex: 2 }]}>Path</Text>
                        <Text style={[styles.pathHeaderText, { flex: 2 }]}>Service</Text>
                        <Text style={[styles.pathHeaderText, { flex: 1 }]}>Port</Text>
                      </View>
                      {paths.map((p: any, pi: number) => {
                        const svcName: string = p.backend?.service?.name ?? '-';
                        const svcPort: string = String(
                          p.backend?.service?.port?.number ?? p.backend?.service?.port?.name ?? '-'
                        );
                        return (
                          <View key={pi} style={[styles.pathRow, pi % 2 === 0 && styles.pathRowEven]}>
                            <View style={styles.pathCellLeft}>
                              <Route size={12} color="#8B92A8" />
                              <Text style={[styles.pathCell, { flex: 2 }]} numberOfLines={1}>
                                {p.path ?? '/'}
                              </Text>
                            </View>
                            <Text style={[styles.pathCell, { flex: 2 }]} numberOfLines={1}>{svcName}</Text>
                            <Text style={[styles.pathCell, { flex: 1 }]}>{svcPort}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noPathsText}>No paths defined</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* TLS */}
        {tlsEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TLS</Text>
            {tlsEntries.map((tls: any, ti: number) => {
              const tlsHosts: string[] = tls.hosts ?? [];
              const secret: string = tls.secretName ?? '-';
              return (
                <View key={ti} style={styles.tlsCard}>
                  <View style={styles.tlsHeaderRow}>
                    <Lock size={14} color="#00D9FF" />
                    <Text style={styles.tlsSecretLabel}>Secret: </Text>
                    <Text style={styles.tlsSecretValue}>{secret}</Text>
                  </View>
                  {tlsHosts.length > 0 && (
                    <View style={styles.tlsHostsRow}>
                      {tlsHosts.map((h, hi) => (
                        <View key={hi} style={styles.tlsHostBadge}>
                          <Text style={styles.tlsHostText}>{h}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#162033', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1E2B42' },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF6B9D20', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#8B92A8' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { flex: 1, minWidth: '47%', backgroundColor: '#162033', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#1E2B42' },
  gridLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 6, fontWeight: '600' as const },
  gridValue: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  cyan: { color: '#00D9FF' },
  ruleCard: { backgroundColor: '#162033', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E2B42' },
  ruleHostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ruleHost: { fontSize: 14, fontWeight: '700' as const, color: '#FF6B9D' },
  pathsContainer: { borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#1E2B42' },
  pathHeader: { flexDirection: 'row', backgroundColor: '#1E2B42', paddingHorizontal: 10, paddingVertical: 8 },
  pathHeaderText: { fontSize: 11, fontWeight: '700' as const, color: '#8B92A8', textTransform: 'uppercase' },
  pathRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  pathRowEven: { backgroundColor: '#0D1219' },
  pathCellLeft: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pathCell: { fontSize: 12, color: '#FFFFFF' },
  noPathsText: { fontSize: 12, color: '#8B92A8', fontStyle: 'italic' },
  tlsCard: { backgroundColor: '#162033', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#00D9FF30' },
  tlsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tlsSecretLabel: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  tlsSecretValue: { fontSize: 13, color: '#00D9FF', fontWeight: '700' as const, flex: 1 },
  tlsHostsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tlsHostBadge: { backgroundColor: '#00D9FF15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#00D9FF30' },
  tlsHostText: { fontSize: 11, color: '#00D9FF' },
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
