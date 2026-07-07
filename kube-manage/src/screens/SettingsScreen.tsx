import { useAuth } from '@/context/AuthContext';
import { useKubernetes } from '@/context/KubernetesContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import type { ClusterConnection } from '@/types/kubernetes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2, Cloud, LogOut, Moon, Plus, Server, Settings as SettingsIcon, Sun, Trash2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Alert, FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const { connections, activeConnection, setActiveConnection, deleteConnection } = useKubernetes();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NavProp>();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteConnection = (connection: ClusterConnection) => {
    Alert.alert(
      'Delete Connection',
      `Are you sure you want to delete "${connection.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteConnection(connection.name) },
      ],
    );
  };

  const renderConnection = ({ item }: { item: ClusterConnection }) => {
    const isActive = activeConnection?.name === item.name;
    return (
      <TouchableOpacity
        style={[styles.connectionCard, isActive && styles.connectionCardActive]}
        onPress={() => setActiveConnection(item)}
      >
        <View style={styles.connectionHeader}>
          <View style={styles.connectionLeft}>
            <View style={[
              styles.connectionIcon,
              isActive && styles.connectionIconActive,
              item.connectionType === 'eks' && styles.connectionIconEks,
            ]}>
              {item.connectionType === 'eks'
                ? <Cloud size={18} color="#FF9F43" />
                : <Server size={18} color={isActive ? colors.accent : colors.textSecondary} />}
            </View>
            <View style={styles.connectionInfo}>
              <View style={styles.connectionNameRow}>
                <Text style={styles.connectionName}>{item.name}</Text>
                {item.connectionType === 'eks' && (
                  <View style={styles.eksBadge}>
                    <Text style={styles.eksBadgeText}>EKS</Text>
                  </View>
                )}
                {isActive && <CheckCircle2 size={16} color={colors.accentGreen} />}
              </View>
              <Text style={styles.connectionServer} numberOfLines={1}>{item.server}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteConnection(item)}>
            <Trash2 size={18} color={colors.accentRed} />
          </TouchableOpacity>
        </View>
        <View style={styles.connectionDetails}>
          <View style={styles.connectionDetail}>
            <Text style={styles.detailLabel}>Namespace</Text>
            <Text style={styles.detailValue}>{item.namespace}</Text>
          </View>
          <View style={styles.connectionDetail}>
            <Text style={styles.detailLabel}>Auth</Text>
            <Text style={[styles.detailValue, item.connectionType === 'eks' && styles.detailValueEks]}>
              {item.connectionType === 'eks' ? 'EKS / IAM' : item.token ? 'Token' : 'Certificate'}
            </Text>
          </View>
          {item.connectionType === 'eks' && item.eks && (
            <View style={styles.connectionDetail}>
              <Text style={styles.detailLabel}>Region</Text>
              <Text style={styles.detailValue}>{item.eks.region}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SettingsIcon size={24} color={colors.accent} />
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      {/* Theme toggle */}
      <View style={styles.themeSection}>
        <View style={styles.themeRow}>
          {isDark
            ? <Moon size={20} color={colors.accent} />
            : <Sun size={20} color={colors.accentYellow} />}
          <View style={styles.themeInfo}>
            <Text style={styles.themeLabel}>Theme</Text>
            <Text style={styles.themeValue}>{isDark ? 'Dark' : 'Light'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: `${colors.accent}60` }}
            thumbColor={isDark ? colors.accent : colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cluster Connections</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('Setup')}>
            <Plus size={18} color="#000" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {connections.length === 0 ? (
          <View style={styles.emptyState}>
            <Server size={40} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Connections</Text>
            <Text style={styles.emptyText}>Add a cluster connection to get started</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Setup')}>
              <Plus size={18} color="#000" />
              <Text style={styles.emptyButtonText}>Add Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={connections}
            keyExtractor={(item) => item.name}
            renderItem={renderConnection}
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      <View style={styles.accountSection}>
        {user?.email && <Text style={styles.accountEmail}>{user.email}</Text>}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={16} color={colors.accentRed} />
          <Text style={styles.signOutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Kubernetes Manager v1.0.0</Text>
        <Text style={styles.footerSubtext}>Built with React Native</Text>
      </View>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: 28, fontWeight: '700' as const, color: c.text },

    themeSection: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    themeInfo: { flex: 1 },
    themeLabel: { fontSize: 15, fontWeight: '600' as const, color: c.text },
    themeValue: { fontSize: 13, color: c.textSecondary, marginTop: 2 },

    section: { flex: 1, padding: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: c.text },
    addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    addButtonText: { fontSize: 14, fontWeight: '600' as const, color: '#000000' },
    list: { gap: 12 },
    connectionCard: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border },
    connectionCardActive: { borderColor: c.accent, backgroundColor: c.navActive },
    connectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    connectionLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
    connectionIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    connectionIconActive: { backgroundColor: `${c.accent}20` },
    connectionIconEks: { backgroundColor: '#FF9F4320' },
    eksBadge: { backgroundColor: '#FF9F4330', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FF9F43' },
    eksBadgeText: { fontSize: 10, fontWeight: '700' as const, color: '#FF9F43' },
    detailValueEks: { color: '#FF9F43' },
    connectionInfo: { flex: 1 },
    connectionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    connectionName: { fontSize: 16, fontWeight: '600' as const, color: c.text },
    connectionServer: { fontSize: 13, color: c.textSecondary },
    deleteButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' },
    connectionDetails: { flexDirection: 'row', gap: 16 },
    connectionDetail: { flex: 1 },
    detailLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 4, fontWeight: '600' as const },
    detailValue: { fontSize: 13, color: c.text, fontWeight: '600' as const },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 20, fontWeight: '700' as const, color: c.text, marginTop: 16, marginBottom: 8 },
    emptyText: { fontSize: 14, color: c.textSecondary, textAlign: 'center', marginBottom: 24 },
    emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
    emptyButtonText: { fontSize: 15, fontWeight: '600' as const, color: '#000000' },
    accountSection: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
    accountEmail: { fontSize: 13, color: c.textSecondary, marginBottom: 10 },
    signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.bgCard, borderRadius: 10, paddingVertical: 12, borderWidth: 1, borderColor: c.accentRed },
    signOutButtonText: { fontSize: 14, fontWeight: '700' as const, color: c.accentRed },
    footer: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border },
    footerText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' as const },
    footerSubtext: { fontSize: 11, color: c.textMuted, marginTop: 4 },
  });
}
