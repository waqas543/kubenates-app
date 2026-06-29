import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getEvents, getSecret } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, FileKey, Info, Lock } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'SecretDetails'>;

function toAge(ts?: string): string {
  if (!ts) return '-';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m > 0 ? `${m}m` : `${Math.floor((Date.now() - new Date(ts).getTime()) / 1000)}s`;
}

export default function SecretDetailsScreen() {
  const navigation = useNavigation<NavProp>();
  const { name, namespace } = useRoute<RouteType>().params;
  const { activeConnection } = useKubernetes();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: secret, isLoading } = useQuery({
    queryKey: ['secret-detail', namespace, name],
    enabled: !!activeConnection,
    queryFn: async () => {
      const res = await getSecret(toParsedConfig(activeConnection!), namespace, name);
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
        <ActivityIndicator size="large" color={colors.accentRed} />
        <Text style={styles.loadingText}>Loading secret...</Text>
      </View>
    );
  }

  if (!secret) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color={colors.accentRed} />
        <Text style={styles.errorText}>Secret not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = secret.metadata ?? {};
  const dataKeys = Object.keys(secret.data ?? {});
  const labels: Record<string, string> = meta.labels ?? {};

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FileKey size={24} color={colors.accentRed} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{name}</Text>
            <Text style={styles.subtitle}>{namespace}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText} numberOfLines={1}>{secret.type ?? 'Opaque'}</Text>
          </View>
        </View>

        {/* Security notice */}
        <View style={styles.securityNotice}>
          <Lock size={16} color="#FFB800" />
          <Text style={styles.securityText}>Secret values are not displayed for security</Text>
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
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{secret.type ?? 'Opaque'}</Text>
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

        {/* Keys section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keys ({dataKeys.length})</Text>
          {dataKeys.length === 0 ? (
            <View style={styles.emptyState}>
              <Lock size={32} color={colors.border} />
              <Text style={styles.emptyStateText}>No data keys</Text>
            </View>
          ) : (
            <View style={styles.keysCard}>
              {dataKeys.map((key, index) => (
                <View
                  key={key}
                  style={[styles.keyRow, index === dataKeys.length - 1 && styles.noBorder]}
                >
                  <Lock size={14} color={colors.accentRed} />
                  <Text style={styles.keyName}>{key}</Text>
                  <View style={styles.hiddenBadge}>
                    <Text style={styles.hiddenBadgeText}>hidden</Text>
                  </View>
                </View>
              ))}
            </View>
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.bgCard, borderRadius: 12, padding: 16, marginBottom: 12 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF575720', alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    title: { fontSize: 18, fontWeight: '700' as const, color: c.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: c.textSecondary },
    typeBadge: { backgroundColor: '#FF575720', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: 120 },
    typeBadgeText: { fontSize: 11, fontWeight: '700' as const, color: '#FF5757' },
    securityNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFB80015', borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FFB80030' },
    securityText: { fontSize: 13, color: '#FFB800', flex: 1 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: c.text, marginBottom: 12 },
    detailCard: { backgroundColor: c.bgCard, borderRadius: 10, padding: 14 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.bgSecondary },
    noBorder: { borderBottomWidth: 0 },
    detailLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, maxWidth: '60%' },
    emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10, backgroundColor: c.bgCard, borderRadius: 10 },
    emptyStateText: { fontSize: 14, color: c.textSecondary },
    keysCard: { backgroundColor: c.bgCard, borderRadius: 10, padding: 14 },
    keyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.bgSecondary },
    keyName: { flex: 1, fontSize: 13, color: c.text, fontWeight: '500' as const },
    hiddenBadge: { backgroundColor: '#FF575720', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    hiddenBadgeText: { fontSize: 10, color: '#FF5757', fontWeight: '600' as const },
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
