import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedIcon } from '@/components/AnimatedIcon';
import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getDeployments } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import type { Deployment } from '@/types/kubernetes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Layers, Search } from 'lucide-react-native';
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

export default function DeploymentsScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: deployments = [], isLoading } = useQuery<Deployment[]>({
    queryKey: ['deployments', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getDeployments(cfg, activeNamespace);
      return (res.data?.items ?? []).map((d: any) => ({
        name: d.metadata?.name ?? 'unknown',
        namespace: d.metadata?.namespace ?? 'default',
        ready: `${d.status?.readyReplicas ?? 0}/${d.spec?.replicas ?? 0}`,
        upToDate: d.status?.updatedReplicas ?? 0,
        available: d.status?.availableReplicas ?? 0,
        age: toAge(d.metadata?.creationTimestamp),
      }));
    },
  });

  const filtered = deployments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item, index }: { item: Deployment; index: number }) => {
    const [ready, total] = item.ready.split('/').map(Number);
    const allReady = !isNaN(ready) && !isNaN(total) && ready === total && total > 0;
    return (
      <AnimatedCard index={index}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DeploymentDetails', { name: item.name, namespace: item.namespace })}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardLeft}>
            <View style={styles.icon}>
              <AnimatedIcon type="pulse">
                <Layers size={16} color="#FFB800" />
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
            <Text style={styles.detailLabel}>Ready</Text>
            <Text style={[styles.detailValue, allReady && styles.green]}>{item.ready}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Up-to-date</Text>
            <Text style={styles.detailValue}>{item.upToDate}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Available</Text>
            <Text style={styles.detailValue}>{item.available}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{item.age}</Text>
          </View>
        </View>
      </TouchableOpacity>
      </AnimatedCard>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deployments..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} deployment${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((d) => {
            const [r, t] = d.ready.split('/').map(Number);
            return !isNaN(r) && !isNaN(t) && r === t && t > 0;
          }).length} ready
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#FFB800" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Layers size={40} color={colors.border} />
              <Text style={styles.emptyText}>No deployments found</Text>
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
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFB80020', alignItems: 'center', justifyContent: 'center' },
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
