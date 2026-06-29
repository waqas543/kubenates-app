import { AnimatedIcon } from '@/components/AnimatedIcon';
import { useKubernetes } from '@/context/KubernetesContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Database, Search } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export default function NamespacesScreen() {
  const navigation = useNavigation<NavProp>();
  const { namespaces } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const filtered = (namespaces ?? []).filter((ns: any) =>
    (ns.metadata?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => {
    const meta = item.metadata ?? {};
    const phase = item.status?.phase ?? '-';
    const isActive = phase === 'Active';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('NamespaceDetails', { name: meta.name })}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardLeft}>
            <View style={styles.icon}>
              <AnimatedIcon type="bounce">
                <Database size={16} color={colors.accentPurple} />
              </AnimatedIcon>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{meta.name}</Text>
              <Text style={styles.sub}>{toAge(meta.creationTimestamp)}</Text>
            </View>
          </View>
          <View style={styles.rightRow}>
            <View style={[styles.badge, isActive ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={styles.badgeText}>{phase}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const activeCount = filtered.filter((ns: any) => ns.status?.phase === 'Active').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search namespaces..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {`${filtered.length} namespace${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>{activeCount} active</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.metadata?.name ?? Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Database size={40} color={colors.border} />
            <Text style={styles.emptyText}>No namespaces found</Text>
          </View>
        }
      />
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
    list: { padding: 16 },
    card: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#AA66FF20', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    sub: { fontSize: 12, color: c.textSecondary },
    rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' as const, color: c.text },
    badgeGreen: { backgroundColor: '#00FF8830' },
    badgeRed: { backgroundColor: '#FF575730' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
