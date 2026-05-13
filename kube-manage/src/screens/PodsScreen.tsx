import { StatusBadge } from '@/components/StatusBadge';
import { useKubernetes } from '@/context/KubernetesContext';
import type { Pod } from '@/types/kubernetes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertCircle, Box, ChevronRight, Search } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function PodsScreen() {
  const navigation = useNavigation<NavProp>();
  const { activeNamespace, pods, isPodsLoading } = useKubernetes();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPods = pods.filter((pod) => {
    const matchesSearch = pod.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNamespace = activeNamespace === 'all' || pod.namespace === activeNamespace;
    return matchesSearch && matchesNamespace;
  });

  const renderPod = ({ item }: { item: Pod }) => (
    <TouchableOpacity
      style={styles.podCard}
      onPress={() => navigation.navigate('PodDetails', { name: item.name, namespace: item.namespace })}
    >
      <View style={styles.podMain}>
        <View style={styles.podLeft}>
          <View style={styles.podIcon}>
            <Box size={16} color="#00D9FF" />
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
        <ChevronRight size={18} color="#8B92A8" />
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
            {item.restarts > 0 && <AlertCircle size={12} color="#FFB800" />}
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
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#8B92A8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pods..."
            placeholderTextColor="#8B92A8"
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
        <ActivityIndicator size="large" color="#00D9FF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredPods}
          keyExtractor={(item) => `${item.namespace}/${item.name}`}
          renderItem={renderPod}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Box size={40} color="#1E2B42" />
              <Text style={styles.emptyText}>No pods found</Text>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#162033', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  currentNamespace: { marginTop: 8, fontSize: 12, color: '#8B92A8' },
  currentNamespaceValue: { fontWeight: '600' as const, color: '#FFFFFF' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0D1219' },
  statsText: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  list: { padding: 16 },
  podCard: { backgroundColor: '#162033', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#1E2B42' },
  podMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  podLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  podIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#0D1219', alignItems: 'center', justifyContent: 'center' },
  podInfo: { flex: 1 },
  podName: { fontSize: 15, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 4 },
  podMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  podMetaText: { fontSize: 12, color: '#8B92A8' },
  podDetails: { flexDirection: 'row', gap: 12 },
  podDetail: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 4, fontWeight: '600' as const },
  detailValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' as const },
  restartsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  restartsWarning: { backgroundColor: '#FFB80020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  restartsValue: { color: '#FFB800' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#8B92A8' },
});
