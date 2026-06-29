import { mockConfigMaps, mockSecrets } from '@/mocks/kubernetes';
import type { ConfigMap, Secret } from '@/types/kubernetes';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { ChevronRight, FileKey, FileText } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ConfigTab = 'configmaps' | 'secrets';

export default function ConfigScreen() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('configmaps');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const renderConfigMap = ({ item }: { item: ConfigMap }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}20` }]}>
            <FileText size={20} color={colors.accent} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
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
            <FileKey size={20} color={colors.accentRed} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'configmaps' && styles.tabActive]} onPress={() => setActiveTab('configmaps')}>
          <FileText size={16} color={activeTab === 'configmaps' ? colors.accent : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'configmaps' && styles.tabTextActive]}>ConfigMaps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'secrets' && styles.tabActiveRed]} onPress={() => setActiveTab('secrets')}>
          <FileKey size={16} color={activeTab === 'secrets' ? colors.accentRed : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'secrets' && styles.tabTextActiveRed]}>Secrets</Text>
        </TouchableOpacity>
      </ScrollView>

      {activeTab === 'configmaps' ? (
        <FlatList data={mockConfigMaps} keyExtractor={(item) => item.name} renderItem={renderConfigMap} contentContainerStyle={styles.list} />
      ) : (
        <FlatList data={mockSecrets} keyExtractor={(item) => item.name} renderItem={renderSecret} contentContainerStyle={styles.list} />
      )}
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    tabsScroll: { borderBottomWidth: 1, borderBottomColor: c.border, maxHeight: 60 },
    tabsContainer: { padding: 12, gap: 12 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border },
    tabActive: { backgroundColor: c.border, borderColor: c.accent },
    tabActiveRed: { backgroundColor: c.border, borderColor: c.accentRed },
    tabText: { fontSize: 13, fontWeight: '600' as const, color: c.textSecondary },
    tabTextActive: { color: c.text },
    tabTextActiveRed: { color: c.text },
    list: { padding: 16 },
    card: { backgroundColor: c.bgCard, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    iconContainer: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: '700' as const, color: c.text, marginBottom: 4 },
    cardNamespace: { fontSize: 13, color: c.textSecondary },
    cardStats: { flexDirection: 'row', gap: 16 },
    stat: { flex: 1 },
    statLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    statValue: { fontSize: 14, color: c.text, fontWeight: '700' as const },
  });
}
