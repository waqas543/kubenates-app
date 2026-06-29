import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedIcon } from '@/components/AnimatedIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { useKubernetes } from '@/context/KubernetesContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import type { Pod } from '@/types/kubernetes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertCircle, Box, ChevronRight, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function PodsScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeNamespace, pods, isPodsLoading } = useKubernetes();
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const filteredPods = pods.filter((pod) => {
    const matchesSearch = pod.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNamespace = activeNamespace === 'all' || pod.namespace === activeNamespace;
    return matchesSearch && matchesNamespace;
  });

  const renderPod = ({ item, index }: { item: Pod; index: number }) => (
    <AnimatedCard index={index}>
    <TouchableOpacity
      style={styles.podCard}
      onPress={() => navigation.navigate('PodDetails', { name: item.name, namespace: item.namespace })}
    >
      <View style={styles.podMain}>
        <View style={styles.podLeft}>
          <View style={styles.podIcon}>
            <AnimatedIcon type="float">
              <Box size={16} color={colors.accent} />
            </AnimatedIcon>
          </View>
          <View style={styles.podInfo}>
            <Text style={styles.podName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.podMeta}>
              <Text style={styles.podMetaText}>{item.namespace}</Text>
              <Text style={styles.podMetaText}>•</Text>
              <Text style={styles.podMetaText}>{item.node || 'N/A'}</Text>
            </View>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>

      <View style={styles.podDetails}>
        <View style={styles.podDetail}>
          <Text style={styles.detailLabel}>Status</Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.podDetail}>
          <Text style={styles.detailLabel}>Ready</Text>
          <Text style={styles.detailValue}>{item.ready}</Text>
        </View>
        <View style={styles.podDetail}>
          <Text style={styles.detailLabel}>Restarts</Text>
          <View style={[styles.restartsBadge, item.restarts > 0 && styles.restartsWarning]}>
            {item.restarts > 0 && <AlertCircle size={12} color={colors.accentYellow} />}
            <Text style={[styles.detailValue, item.restarts > 0 && styles.restartsValue]}>
              {item.restarts}
            </Text>
          </View>
        </View>
        <View style={styles.podDetail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
    </AnimatedCard>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pods..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Text style={styles.currentNamespace}>
          Namespace:{' '}
          <Text style={styles.currentNamespaceValue}>
            {activeNamespace === 'all' ? 'All namespaces' : activeNamespace}
          </Text>
        </Text>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {isPodsLoading
            ? 'Loading pods…'
            : `${filteredPods.length} pod${filteredPods.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>
          {filteredPods.filter((p) => p.status === 'Running').length} running
        </Text>
      </View>

      {isPodsLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredPods}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          renderItem={renderPod}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Box size={40} color={colors.border} />
              <Text style={styles.emptyText}>No pods found</Text>
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
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgCard, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 15, color: c.text },
    currentNamespace: { marginTop: 8, fontSize: 12, color: c.textSecondary },
    currentNamespaceValue: { fontWeight: '600' as const, color: c.text },
    statsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.bgSecondary },
    statsText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },
    list: { padding: 16 },
    podCard: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    podMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    podLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    podIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    podInfo: { flex: 1 },
    podName: { fontSize: 15, fontWeight: '600' as const, color: c.text, marginBottom: 4 },
    podMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    podMetaText: { fontSize: 12, color: c.textSecondary },
    podDetails: { flexDirection: 'row', gap: 12 },
    podDetail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    restartsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    restartsWarning: { backgroundColor: '#FFB80020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    restartsValue: { color: '#FFB800' },
    emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
