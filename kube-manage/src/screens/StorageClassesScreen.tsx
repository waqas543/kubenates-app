import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getStorageClasses } from '@/lib/kubernetesClient';
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

interface SCItem {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion: boolean;
  age: string;
}

export default function StorageClassesScreen() {
  const { activeConnection } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: scs = [], isLoading } = useQuery<SCItem[]>({
    queryKey: ['storageclasses', activeConnection?.name],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getStorageClasses(cfg);
      return (res.data?.items ?? []).map((sc: any) => ({
        name: sc.metadata?.name ?? 'unknown',
        provisioner: sc.provisioner ?? '-',
        reclaimPolicy: sc.reclaimPolicy ?? '-',
        volumeBindingMode: sc.volumeBindingMode ?? '-',
        allowVolumeExpansion: sc.allowVolumeExpansion === true,
        age: toAge(sc.metadata?.creationTimestamp),
      }));
    },
  });

  const filtered = scs.filter((sc) =>
    sc.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: SCItem }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <View style={styles.icon}>
            <HardDrive size={16} color={colors.accent} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>{item.provisioner}</Text>
          </View>
        </View>
        <View style={[styles.badge, item.allowVolumeExpansion ? styles.badgeGreen : styles.badgeGray]}>
          <Text style={styles.badgeText}>{item.allowVolumeExpansion ? 'Expandable' : 'Fixed'}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Reclaim Policy</Text>
          <Text style={styles.detailValue}>{item.reclaimPolicy}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Binding Mode</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.volumeBindingMode}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Expansion</Text>
          <Text style={[styles.detailValue, item.allowVolumeExpansion ? styles.green : styles.muted]}>
            {item.allowVolumeExpansion ? 'Yes' : 'No'}
          </Text>
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
            placeholder="Search storage classes..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} storage class${filtered.length !== 1 ? 'es' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((sc) => sc.allowVolumeExpansion).length} expandable
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <HardDrive size={40} color={colors.border} />
              <Text style={styles.emptyText}>No storage classes found</Text>
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
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: `${c.accent}20`, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    sub: { fontSize: 12, color: c.textSecondary },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' as const, color: c.text },
    badgeGreen: { backgroundColor: '#00FF8830' },
    badgeGray: { backgroundColor: '#8B92A830' },
    cardDetails: { flexDirection: 'row', gap: 12 },
    detail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    green: { color: '#00FF88' },
    muted: { color: c.textSecondary },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
