import { AnimatedIcon } from '@/components/AnimatedIcon';
import { useKubernetes } from '@/context/KubernetesContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import type { Node } from '@/types/kubernetes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Search, Server } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

function formatRoles(roles: string): string {
  if (!roles || roles === 'worker') return 'worker';
  return roles.split(',').map((r) => r.trim()).filter(Boolean).join(', ');
}

export default function NodesScreen() {
  const navigation = useNavigation<NavProp>();
  const { nodes, isNodesLoading } = useKubernetes();
  const [search, setSearch] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const filtered = (nodes ?? []).filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: Node }) => {
    const ready = item.status === 'Ready';
    const roles = formatRoles(item.roles);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('NodeDetails', { name: item.name })}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardLeft}>
            <View style={styles.icon}>
              <AnimatedIcon type="pulse">
                <Server size={16} color="#50FA7B" />
              </AnimatedIcon>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.sub}>{roles}</Text>
            </View>
          </View>
          <View style={styles.rightRow}>
            <View style={[styles.badge, ready ? styles.badgeGreen : styles.badgeRed]}>
              <Text style={styles.badgeText}>{ready ? 'Ready' : 'NotReady'}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Version</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{item.version}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Roles</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{roles}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Age</Text>
            <Text style={styles.detailValue}>{item.age}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const readyCount = filtered.filter((n) => n.status === 'Ready').length;

  if (isNodesLoading && (nodes?.length ?? 0) === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#50FA7B" />
        <Text style={styles.loadingText}>Loading nodes…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search nodes..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {`${filtered.length} node${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={styles.statsText}>{readyCount} ready</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Server size={40} color={colors.border} />
            <Text style={styles.emptyText}>No nodes found</Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    loadingWrap: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: c.textSecondary, fontSize: 14 },
    header: { padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgCard, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    searchInput: { flex: 1, fontSize: 15, color: c.text },
    statsBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.bgSecondary },
    statsText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },
    list: { padding: 16 },
    card: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#50FA7B20', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '600' as const, color: c.text, marginBottom: 3 },
    sub: { fontSize: 12, color: c.textSecondary },
    rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' as const, color: c.text },
    badgeGreen: { backgroundColor: '#50FA7B30' },
    badgeRed: { backgroundColor: '#FF575730' },
    cardDetails: { flexDirection: 'row', gap: 12 },
    detail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.textSecondary },
  });
}
