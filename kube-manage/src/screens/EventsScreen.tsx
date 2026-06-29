import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getEvents } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Info, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

function toAge(ts?: string): string {
  if (!ts) return '-';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m > 0 ? `${m}m` : `${Math.floor((Date.now() - new Date(ts).getTime()) / 1000)}s`;
}

export default function EventsScreen() {
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    queryFn: async () => {
      const ns = activeNamespace === 'all' || !activeNamespace ? 'all' : activeNamespace;
      const res = await getEvents(toParsedConfig(activeConnection!), ns);
      const items: any[] = res.data?.items ?? [];
      return items.sort((a, b) => {
        const ta = a.lastTimestamp ?? a.eventTime ?? a.metadata?.creationTimestamp ?? '';
        const tb = b.lastTimestamp ?? b.eventTime ?? b.metadata?.creationTimestamp ?? '';
        return tb.localeCompare(ta);
      });
    },
  });

  const filtered = events.filter((e: any) => {
    const q = search.toLowerCase();
    return (
      (e.reason ?? '').toLowerCase().includes(q) ||
      (e.message ?? '').toLowerCase().includes(q) ||
      (e.involvedObject?.name ?? '').toLowerCase().includes(q) ||
      (e.involvedObject?.kind ?? '').toLowerCase().includes(q) ||
      (e.metadata?.namespace ?? '').toLowerCase().includes(q)
    );
  });

  const warningCount = filtered.filter((e: any) => e.type === 'Warning').length;

  const renderItem = ({ item }: { item: any }) => {
    const isWarning = item.type === 'Warning';
    const obj = item.involvedObject ?? {};
    const ts = item.lastTimestamp ?? item.eventTime ?? item.metadata?.creationTimestamp;

    return (
      <View style={[styles.card, isWarning && styles.cardWarning]}>
        <View style={styles.cardTop}>
          <View style={styles.iconWrap}>
            {isWarning
              ? <AlertTriangle size={16} color="#FFB86C" />
              : <Info size={16} color={colors.accent} />}
          </View>
          <View style={styles.info}>
            <Text style={styles.reason} numberOfLines={1}>{item.reason ?? '-'}</Text>
            <Text style={styles.object} numberOfLines={1}>
              {obj.kind}/{obj.name}
              {obj.namespace ? ` · ${obj.namespace}` : ''}
            </Text>
          </View>
          <View style={styles.metaRight}>
            <View style={[styles.typeBadge, isWarning ? styles.badgeWarning : styles.badgeNormal]}>
              <Text style={styles.typeText}>{item.type ?? '-'}</Text>
            </View>
            <Text style={styles.age}>{toAge(ts)}</Text>
          </View>
        </View>
        {item.message ? (
          <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
        ) : null}
        {(item.count ?? 0) > 1 ? (
          <Text style={styles.count}>×{item.count}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {`${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        {warningCount > 0 && (
          <Text style={[styles.statsText, styles.warnText]}>{warningCount} warning{warningCount !== 1 ? 's' : ''}</Text>
        )}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => `${item.metadata?.uid ?? item.metadata?.name}-${item.metadata?.resourceVersion}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <Activity size={40} color={colors.border} />
              <Text style={styles.emptyText}>Loading events...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Activity size={40} color={colors.border} />
              <Text style={styles.emptyText}>No events found</Text>
            </View>
          )
        }
      />
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgCard, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    searchInput: { flex: 1, fontSize: 15, color: c.text },
    statsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.bgSecondary },
    statsText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },
    warnText: { color: '#FFB86C' },
    list: { padding: 16 },
    card: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    cardWarning: { borderColor: '#FFB86C30' },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
    iconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    info: { flex: 1 },
    reason: { fontSize: 14, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    object: { fontSize: 12, color: c.textSecondary },
    metaRight: { alignItems: 'flex-end', gap: 4 },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    badgeWarning: { backgroundColor: '#FFB86C25' },
    badgeNormal: { backgroundColor: '#00D9FF20' },
    typeText: { fontSize: 10, fontWeight: '700' as const, color: c.text },
    age: { fontSize: 11, color: c.textSecondary },
    message: { fontSize: 12, color: c.textSecondary, lineHeight: 18 },
    count: { fontSize: 11, color: c.textSecondary, marginTop: 4, alignSelf: 'flex-end' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
