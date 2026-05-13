import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getPersistentVolumeClaims } from '@/lib/kubernetesClient';
import { useQuery } from '@tanstack/react-query';
import { HardDrive, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

function toAge(ts?: string): string {
  if (!ts) return '-';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  return m > 0 ? `${m}m` : `${Math.floor((Date.now() - new Date(ts).getTime()) / 1000)}s`;
}

interface PVCItem {
  name: string;
  namespace: string;
  phase: string;
  volumeName: string;
  capacity: string;
  storageClass: string;
  age: string;
}

export default function PersistentVolumeClaimsScreen() {
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');

  const { data: pvcs = [], isLoading } = useQuery<PVCItem[]>({
    queryKey: ['persistentvolumeclaims', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getPersistentVolumeClaims(cfg, activeNamespace);
      return (res.data?.items ?? []).map((pvc: any) => ({
        name: pvc.metadata?.name ?? 'unknown',
        namespace: pvc.metadata?.namespace ?? '-',
        phase: pvc.status?.phase ?? '-',
        volumeName: pvc.spec?.volumeName || '-',
        capacity: pvc.status?.capacity?.storage ?? '-',
        storageClass: pvc.spec?.storageClassName ?? '-',
        age: toAge(pvc.metadata?.creationTimestamp),
      }));
    },
  });

  const filtered = pvcs.filter((pvc) =>
    pvc.name.toLowerCase().includes(search.toLowerCase())
  );

  function phaseColor(phase: string) {
    if (phase === 'Bound') return styles.badgeGreen;
    if (phase === 'Pending') return styles.badgeYellow;
    if (phase === 'Lost') return styles.badgeRed;
    return styles.badgeGray;
  }

  const renderItem = ({ item }: { item: PVCItem }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <View style={styles.icon}>
            <HardDrive size={16} color="#8BE9FD" />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.sub}>{item.namespace}</Text>
          </View>
        </View>
        <View style={[styles.badge, phaseColor(item.phase)]}>
          <Text style={styles.badgeText}>{item.phase}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Volume</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.volumeName}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Capacity</Text>
          <Text style={styles.detailValue}>{item.capacity}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Storage Class</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.storageClass}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color="#8B92A8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PVCs..."
            placeholderTextColor="#8B92A8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} claim${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((pvc) => pvc.phase === 'Bound').length} bound
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#8BE9FD" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <HardDrive size={40} color="#1E2B42" />
              <Text style={styles.emptyText}>No PVCs found</Text>
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
  icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#8BE9FD20', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 3 },
  sub: { fontSize: 12, color: '#8B92A8' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' as const, color: '#FFFFFF' },
  badgeGreen: { backgroundColor: '#00FF8830' },
  badgeYellow: { backgroundColor: '#FFD70030' },
  badgeRed: { backgroundColor: '#FF575730' },
  badgeGray: { backgroundColor: '#8B92A830' },
  cardDetails: { flexDirection: 'row', gap: 12 },
  detail: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 4, fontWeight: '600' as const },
  detailValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' as const },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#8B92A8' },
});
