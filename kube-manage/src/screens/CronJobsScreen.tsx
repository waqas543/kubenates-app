import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getCronJobs } from '@/lib/kubernetesClient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Clock, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function toAge(ts?: string): string {
  if (!ts) return '-';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m > 0 ? `${m}m` : `${Math.floor((Date.now() - new Date(ts).getTime()) / 1000)}s`;
}

interface CronJobItem {
  name: string;
  namespace: string;
  schedule: string;
  lastSchedule: string;
  active: number;
  suspended: boolean;
}

export default function CronJobsScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');

  const { data: cronJobs = [], isLoading } = useQuery<CronJobItem[]>({
    queryKey: ['cronjobs', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getCronJobs(cfg, activeNamespace);
      return (res.data?.items ?? []).map((c: any) => ({
        name: c.metadata?.name ?? 'unknown',
        namespace: c.metadata?.namespace ?? 'default',
        schedule: c.spec?.schedule ?? '-',
        lastSchedule: c.status?.lastScheduleTime ? toAge(c.status.lastScheduleTime) + ' ago' : 'Never',
        active: c.status?.active?.length ?? 0,
        suspended: c.spec?.suspend ?? false,
      }));
    },
  });

  const filtered = cronJobs.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: CronJobItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CronJobDetails', { name: item.name, namespace: item.namespace })}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <View style={styles.icon}>
            <Clock size={16} color="#AA66FF" />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.ns}>{item.namespace}</Text>
          </View>
        </View>
        <View style={styles.rightRow}>
          {item.suspended && (
            <View style={styles.suspendedBadge}>
              <Text style={styles.suspendedText}>Suspended</Text>
            </View>
          )}
          <ChevronRight size={18} color="#8B92A8" />
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Schedule</Text>
          <Text style={styles.detailValue}>{item.schedule}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Last Run</Text>
          <Text style={styles.detailValue}>{item.lastSchedule}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Active</Text>
          <Text style={[styles.detailValue, item.active > 0 && styles.cyan]}>{item.active}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color="#8B92A8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cronjobs..."
            placeholderTextColor="#8B92A8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} cronjob${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((c) => c.suspended).length} suspended
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#AA66FF" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Clock size={40} color="#1E2B42" />
              <Text style={styles.emptyText}>No cronjobs found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: { padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1E2B42' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#162033', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0D1219' },
  statsText: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  loader: { marginTop: 40 },
  list: { padding: 16 },
  card: { backgroundColor: '#162033', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1E2B42' },
  cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#AA66FF20', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 3 },
  ns: { fontSize: 12, color: '#8B92A8' },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suspendedBadge: { backgroundColor: '#FFB80020', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  suspendedText: { fontSize: 10, color: '#FFB800', fontWeight: '700' as const },
  cardDetails: { flexDirection: 'row', gap: 12 },
  detail: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 4, fontWeight: '600' as const },
  detailValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' as const },
  cyan: { color: '#00D9FF' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#8B92A8' },
});
