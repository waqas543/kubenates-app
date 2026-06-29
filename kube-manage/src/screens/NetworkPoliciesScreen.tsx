import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getNetworkPolicies } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { Search, Shield } from 'lucide-react-native';
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

type NetPolicy = { name: string; namespace: string; podSelector: string; ingress: boolean; egress: boolean; age: string };

export default function NetworkPoliciesScreen() {
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: policies = [], isLoading } = useQuery<NetPolicy[]>({
    queryKey: ['networkpolicies', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 30000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getNetworkPolicies(cfg, activeNamespace);
      return (res.data?.items ?? []).map((p: any) => {
        const sel = p.spec?.podSelector?.matchLabels ?? {};
        const selStr = Object.keys(sel).length === 0 ? 'All pods' : Object.entries(sel).map(([k, v]) => `${k}=${v}`).join(', ');
        const types: string[] = p.spec?.policyTypes ?? [];
        return {
          name: p.metadata?.name ?? 'unknown',
          namespace: p.metadata?.namespace ?? 'default',
          podSelector: selStr,
          ingress: types.includes('Ingress'),
          egress: types.includes('Egress'),
          age: toAge(p.metadata?.creationTimestamp),
        };
      });
    },
  });

  const filtered = policies.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Search policies..." placeholderTextColor={colors.textSecondary} value={search} onChangeText={setSearch} />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{isLoading ? 'Loading...' : `${filtered.length} polic${filtered.length !== 1 ? 'ies' : 'y'}`}</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color="#9D6CFF" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardMain}>
                <View style={styles.icon}><Shield size={16} color="#9D6CFF" /></View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.ns}>{item.namespace}</Text>
                </View>
                <View style={styles.badges}>
                  {item.ingress && <View style={styles.ingressBadge}><Text style={styles.badgeText}>Ingress</Text></View>}
                  {item.egress && <View style={styles.egressBadge}><Text style={styles.badgeText}>Egress</Text></View>}
                </View>
              </View>
              <View style={styles.selectorRow}>
                <Text style={styles.selectorLabel}>Pod Selector: </Text>
                <Text style={styles.selectorValue} numberOfLines={1}>{item.podSelector}</Text>
              </View>
              <Text style={styles.age}>Age: {item.age}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}><Shield size={40} color={colors.border} /><Text style={styles.emptyText}>No network policies</Text></View>
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
    statsBar: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.bgSecondary },
    statsText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },
    loader: { marginTop: 40 },
    list: { padding: 16 },
    card: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    cardMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#9D6CFF20', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: '600' as const, color: c.text, marginBottom: 2 },
    ns: { fontSize: 12, color: c.textSecondary },
    badges: { flexDirection: 'row', gap: 4 },
    ingressBadge: { backgroundColor: '#00D9FF20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    egressBadge: { backgroundColor: '#AA66FF20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 10, color: c.text, fontWeight: '600' as const },
    selectorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    selectorLabel: { fontSize: 12, color: c.textSecondary, fontWeight: '600' as const },
    selectorValue: { fontSize: 12, color: c.text, flex: 1 },
    age: { fontSize: 11, color: c.textSecondary },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
