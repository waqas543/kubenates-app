import { AnimatedIcon } from '@/components/AnimatedIcon';
import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getReplicaSets } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, RefreshCw, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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

interface ReplicaSetItem {
  name: string;
  namespace: string;
  desired: number;
  current: number;
  ready: number;
  age: string;
}

export default function ReplicaSetsScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: replicaSets = [], isLoading } = useQuery<ReplicaSetItem[]>({
    queryKey: ['replicasets', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getReplicaSets(cfg, activeNamespace);
      return (res.data?.items ?? []).map((r: any) => ({
        name: r.metadata?.name ?? 'unknown',
        namespace: r.metadata?.namespace ?? 'default',
        desired: r.spec?.replicas ?? 0,
        current: r.status?.replicas ?? 0,
        ready: r.status?.readyReplicas ?? 0,
        age: toAge(r.metadata?.creationTimestamp),
      }));
    },
  });

  const filtered = replicaSets.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: ReplicaSetItem }) => {
    const allReady = item.ready === item.desired && item.desired > 0;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ReplicaSetDetails', { name: item.name, namespace: item.namespace })}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardLeft}>
            <View style={styles.icon}>
              <AnimatedIcon type="spin">
                <RefreshCw size={16} color="#8BE9FD" />
              </AnimatedIcon>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.ns}>{item.namespace}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Desired</Text>
            <Text style={styles.detailValue}>{item.desired}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Current</Text>
            <Text style={styles.detailValue}>{item.current}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Ready</Text>
            <Text style={[styles.detailValue, allReady && styles.green]}>{item.ready}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{item.age}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search replicasets..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} replicaset${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((r) => r.ready === r.desired && r.desired > 0).length} ready
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
              <RefreshCw size={40} color={colors.border} />
              <Text style={styles.emptyText}>No replicasets found</Text>
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
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#8BE9FD20', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    ns: { fontSize: 12, color: c.textSecondary },
    cardDetails: { flexDirection: 'row', gap: 12 },
    detail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    green: { color: '#00FF88' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
