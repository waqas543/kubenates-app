import { AnimatedIcon } from '@/components/AnimatedIcon';
import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import { getJobs } from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Search, Zap } from 'lucide-react-native';
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

type JobStatus = 'Complete' | 'Failed' | 'Active';

interface JobItem {
  name: string;
  namespace: string;
  completions: string;
  age: string;
  jobStatus: JobStatus;
}

function getJobStatus(item: any): JobStatus {
  if (item.status?.completionTime) return 'Complete';
  if ((item.status?.failed ?? 0) > 0) return 'Failed';
  return 'Active';
}

export default function JobsScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeConnection, activeNamespace } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: jobs = [], isLoading } = useQuery<JobItem[]>({
    queryKey: ['jobs', activeConnection?.name, activeNamespace],
    enabled: !!activeConnection,
    staleTime: 15000,
    retry: 1,
    queryFn: async () => {
      const cfg = toParsedConfig(activeConnection!);
      const res = await getJobs(cfg, activeNamespace);
      return (res.data?.items ?? []).map((j: any) => ({
        name: j.metadata?.name ?? 'unknown',
        namespace: j.metadata?.namespace ?? 'default',
        completions: `${j.status?.succeeded ?? 0}/${j.spec?.completions ?? '?'}`,
        age: toAge(j.metadata?.creationTimestamp),
        jobStatus: getJobStatus(j),
      }));
    },
  });

  const filtered = jobs.filter((j) =>
    j.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: JobStatus) => {
    if (s === 'Complete') return '#00FF88';
    if (s === 'Failed') return '#FF5757';
    return '#FFB800';
  };

  const statusBg = (s: JobStatus) => {
    if (s === 'Complete') return '#00FF8820';
    if (s === 'Failed') return '#FF575720';
    return '#FFB80020';
  };

  const renderItem = ({ item }: { item: JobItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetails', { name: item.name, namespace: item.namespace })}
    >
      <View style={styles.cardMain}>
        <View style={styles.cardLeft}>
          <View style={styles.icon}>
            <AnimatedIcon type="flash">
              <Zap size={16} color={colors.accent} />
            </AnimatedIcon>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.ns}>{item.namespace}</Text>
          </View>
        </View>
        <View style={styles.rightRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg(item.jobStatus) }]}>
            <Text style={[styles.statusText, { color: statusColor(item.jobStatus) }]}>{item.jobStatus}</Text>
          </View>
          <ChevronRight size={18} color={colors.textSecondary} />
        </View>
      </View>
      <View style={styles.cardDetails}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Completions</Text>
          <Text style={styles.detailValue}>{item.completions}</Text>
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
            placeholder="Search jobs..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isLoading ? 'Loading...' : `${filtered.length} job${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filtered.filter((j) => j.jobStatus === 'Complete').length} complete
        </Text>
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Zap size={40} color={colors.border} />
              <Text style={styles.emptyText}>No jobs found</Text>
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
    ns: { fontSize: 12, color: c.textSecondary },
    rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 11, fontWeight: '700' as const },
    cardDetails: { flexDirection: 'row', gap: 12 },
    detail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
