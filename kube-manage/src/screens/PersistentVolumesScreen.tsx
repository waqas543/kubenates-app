import { AnimatedIcon } from '@/components/AnimatedIcon';
import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getPersistentVolumes } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { HardDrive, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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

interface PVItem {
  name: string;
  capacity: string;
  accessModes: string;
  reclaimPolicy: string;
  phase: string;
  storageClass: string;
  age: string;
}

export default function PersistentVolumesScreen() {
  const { activeConnection } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: pvs = [], isLoading } = useQuery<PVItem[]>({
    queryKey: ['persistentvolumes', activeConnection?.name],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getPersistentVolumes(cfg);
      return (res.data?.items ?? []).map((pv: any) => ({
        name: pv.metadata?.name ?? 'unknown',
        capacity: pv.spec?.capacity?.storage ?? '-',
        accessModes: (pv.spec?.accessModes ?? []).join(', ') || '-',
        reclaimPolicy: pv.spec?.persistentVolumeReclaimPolicy ?? '-',
        phase: pv.status?.phase ?? pv.spec?.volumeMode ?? '-',
        storageClass: pv.spec?.storageClassName ?? '-',
        age: toAge(pv.metadata?.creationTimestamp),
      }));
    },
  });

  const filtered = pvs.filter((pv) =>
    pv.name.toLowerCase().includes(search.toLowerCase())
  );

  function phaseStyle(phase: string) {
    if (phase === 'Bound') return styles.badgeGreen;
    if (phase === 'Available') return styles.badgeBlue;
    if (phase === 'Released') return styles.badgeOrange;
    if (phase === 'Failed') return styles.badgeRed;
    return styles.badgeGray;
  }

  const renderItem = ({ item }: { item: PVItem }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <View style={styles.icon}>
            <AnimatedIcon type="float">
              <HardDrive size={16} color="#FFB86C" />
            </AnimatedIcon>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.sub}>{item.storageClass}</Text>
          </View>
        </View>
        <View style={[styles.badge, phaseStyle(item.phase)]}>
          <Text style={styles.badgeText}>{item.phase}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Capacity</Text>
          <Text style={styles.detailValue}>{item.capacity}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Access Modes</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.accessModes}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Reclaim</Text>
          <Text style={styles.detailValue}>{item.reclaimPolicy}</Text>
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
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search persistent volumes..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} persistent volume${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((pv) => pv.phase === 'Bound').length} bound
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFB86C" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <HardDrive size={40} color={colors.border} />
              <Text style={styles.emptyText}>No persistent volumes found</Text>
            </View>
          }
        />
      )}
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
    loader: { marginTop: 40 },
    list: { padding: 16 },
    card: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFB86C20', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    sub: { fontSize: 12, color: c.textSecondary },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' as const, color: c.text },
    badgeGreen: { backgroundColor: '#00FF8830' },
    badgeBlue: { backgroundColor: '#00D9FF30' },
    badgeOrange: { backgroundColor: '#FFB80030' },
    badgeRed: { backgroundColor: '#FF575730' },
    badgeGray: { backgroundColor: '#8B92A830' },
    cardDetails: { flexDirection: 'row', gap: 12 },
    detail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
