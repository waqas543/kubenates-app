import { mockConfigMaps, mockSecrets } from '@/mocks/kubernetes';
import type { ConfigMap, Secret } from '@/types/kubernetes';
import { ChevronRight, FileKey, FileText } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ConfigTab = 'configmaps' | 'secrets';

export default function ConfigScreen() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('configmaps');

  const renderConfigMap = ({ item }: { item: ConfigMap }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#00D9FF20' }]}>
            <FileText size={20} color="#00D9FF" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#8B92A8" />
      </View>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Data Keys</Text>
          <Text style={styles.statValue}>{item.data}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Age</Text>
          <Text style={styles.statValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSecret = ({ item }: { item: Secret }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: '#FF575720' }]}>
            <FileKey size={20} color="#FF5757" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#8B92A8" />
      </View>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Type</Text>
          <Text style={styles.statValue} numberOfLines={1}>{item.type}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Data</Text>
          <Text style={styles.statValue}>{item.data} keys</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Age</Text>
          <Text style={styles.statValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'configmaps' && styles.tabActive]}
          onPress={() => setActiveTab('configmaps')}
        >
          <FileText size={16} color={activeTab === 'configmaps' ? '#00D9FF' : '#8B92A8'} />
          <Text style={[styles.tabText, activeTab === 'configmaps' && styles.tabTextActive]}>
            ConfigMaps
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'secrets' && styles.tabActive]}
          onPress={() => setActiveTab('secrets')}
        >
          <FileKey size={16} color={activeTab === 'secrets' ? '#FF5757' : '#8B92A8'} />
          <Text style={[styles.tabText, activeTab === 'secrets' && styles.tabTextActive]}>
            Secrets
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {activeTab === 'configmaps' ? (
        <FlatList
          data={mockConfigMaps}
          keyExtractor={(item) => item.name}
          renderItem={renderConfigMap}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={mockSecrets}
          keyExtractor={(item) => item.name}
          renderItem={renderSecret}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  tabsScroll: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E2B42',
    maxHeight: 60,
  },
  tabsContainer: {
    padding: 12,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#162033',
    borderWidth: 1,
    borderColor: '#1E2B42',
  },
  tabActive: {
    backgroundColor: '#1E2B42',
    borderColor: '#00D9FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#8B92A8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E2B42',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardNamespace: {
    fontSize: 13,
    color: '#8B92A8',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#8B92A8',
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  statValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
});
