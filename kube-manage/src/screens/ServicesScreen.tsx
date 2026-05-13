import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getServices } from '@/lib/kubernetesClient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Network, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

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

interface ServiceItem {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP: string;
  ports: string;
  age: string;
}

function typeBadgeStyle(type: string) {
  switch (type) {
    case 'LoadBalancer': return { bg: '#00D9FF20', color: '#00D9FF' };
    case 'NodePort': return { bg: '#FFB80020', color: '#FFB800' };
    case 'ExternalName': return { bg: '#FF6B9D20', color: '#FF6B9D' };
    default: return { bg: '#AA66FF20', color: '#AA66FF' };
  }
}

export default function ServicesScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');

  const { data: services = [], isLoading } = useQuery<ServiceItem[]>({
    queryKey: ['services', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getServices(cfg, activeNamespace);
      return (res.data?.items ?? []).map((s: any) => ({
        name: s.metadata?.name ?? 'unknown',
        namespace: s.metadata?.namespace ?? 'default',
        type: s.spec?.type ?? 'ClusterIP',
        clusterIP: s.spec?.clusterIP ?? '-',
        externalIP: s.status?.loadBalancer?.ingress?.[0]?.ip ?? '',
        ports: (s.spec?.ports ?? []).map((p: any) => `${p.port}/${p.protocol ?? 'TCP'}`).join(', ') || '-',
        age: toAge(s.metadata?.creationTimestamp),
      }));
    },
  });

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.namespace.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: ServiceItem }) => {
    const badge = typeBadgeStyle(item.type);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ServiceDetails', { name: item.name, namespace: item.namespace })}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardLeft}>
            <View style={styles.icon}>
              <Network size={16} color="#AA66FF" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.ns}>{item.namespace}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.typeBadgeText, { color: badge.color }]}>{item.type}</Text>
            </View>
            <ChevronRight size={18} color="#8B92A8" />
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Cluster IP</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.clusterIP}</Text>
          </View>
          {item.externalIP ? (
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>External IP</Text>
              <Text style={[styles.detailValue, styles.cyan]} numberOfLines={1}>{item.externalIP}</Text>
            </View>
          ) : null}
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Ports</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.ports}</Text>
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
          <Search size={16} color="#8B92A8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            placeholderTextColor="#8B92A8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} service${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((s) => s.type === 'LoadBalancer').length} LoadBalancer
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
              <Network size={40} color="#1E2B42" />
              <Text style={styles.emptyText}>No services found</Text>
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
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#AA66FF20', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 3 },
  ns: { fontSize: 12, color: '#8B92A8' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' as const },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detail: { minWidth: '45%', flex: 1 },
  detailLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 4, fontWeight: '600' as const },
  detailValue: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' as const },
  cyan: { color: '#00D9FF' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#8B92A8' },
});
