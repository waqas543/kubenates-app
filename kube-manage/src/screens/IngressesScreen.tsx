import { AnimatedIcon } from '@/components/AnimatedIcon';
import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getIngresses } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Globe, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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

interface IngressItem {
  name: string;
  namespace: string;
  hosts: string;
  ingressClass: string;
  address: string;
  age: string;
}

export default function IngressesScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: ingresses = [], isLoading } = useQuery<IngressItem[]>({
    queryKey: ['ingresses', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getIngresses(cfg, activeNamespace);
      return (res.data?.items ?? []).map((ing: any) => ({
        name: ing.metadata?.name ?? 'unknown',
        namespace: ing.metadata?.namespace ?? 'default',
        hosts: (ing.spec?.rules ?? []).map((r: any) => r.host ?? '*').join(', ') || '-',
        ingressClass: ing.spec?.ingressClassName ?? '-',
        address: ing.status?.loadBalancer?.ingress?.[0]?.ip
          ?? ing.status?.loadBalancer?.ingress?.[0]?.hostname
          ?? '-',
        age: toAge(ing.metadata?.creationTimestamp),
      }));
    },
  });

  const filtered = ingresses.filter((ing) =>
    ing.name.toLowerCase().includes(search.toLowerCase()) ||
    ing.namespace.toLowerCase().includes(search.toLowerCase()) ||
    ing.hosts.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: IngressItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('IngressDetails', { name: item.name, namespace: item.namespace })}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <View style={styles.icon}>
            <AnimatedIcon type="spin">
              <Globe size={16} color={colors.accentPink} />
            </AnimatedIcon>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.ns}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.hostsRow}>
        <Globe size={12} color={colors.accentPink} />
        <Text style={styles.hostsText} numberOfLines={1}>{item.hosts}</Text>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Class</Text>
          <Text style={styles.detailValue}>{item.ingressClass}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={[styles.detailValue, item.address !== '-' && styles.cyan]} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ingresses..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} ingress${filtered.length !== 1 ? 'es' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((i) => i.address !== '-').length} with address
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accentPink} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Globe size={40} color={colors.border} />
              <Text style={styles.emptyText}>No ingresses found</Text>
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
    cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FF6B9D20', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    ns: { fontSize: 12, color: c.textSecondary },
    hostsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 2 },
    hostsText: { fontSize: 12, color: '#FF6B9D', flex: 1 },
    cardDetails: { flexDirection: 'row', gap: 12 },
    detail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 12, color: c.text, fontWeight: '600' as const },
    cyan: { color: c.accent },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
