import { useKubernetes } from '@/context/KubernetesContext';
import type { ClusterConnection } from '@/types/kubernetes';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2, Plus, Server, Settings as SettingsIcon, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const { connections, activeConnection, setActiveConnection, deleteConnection } = useKubernetes();
  const navigation = useNavigation<NavProp>();

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
            <View style={[styles.connectionIcon, isActive && styles.connectionIconActive]}>
              <Server size={18} color={isActive ? '#00D9FF' : '#8B92A8'} />
            </View>
            <View style={styles.connectionInfo}>
              <View style={styles.connectionNameRow}>
                <Text style={styles.connectionName}>{item.name}</Text>
                {isActive && <CheckCircle2 size={16} color="#00FF88" />}
              </View>
              <Text style={styles.connectionServer} numberOfLines={1}>{item.server}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteConnection(item)}>
            <Trash2 size={18} color="#FF4455" />
          </TouchableOpacity>
        </View>
        <View style={styles.connectionDetails}>
          <View style={styles.connectionDetail}>
            <Text style={styles.detailLabel}>Namespace</Text>
            <Text style={styles.detailValue}>{item.namespace}</Text>
          </View>
          <View style={styles.connectionDetail}>
            <Text style={styles.detailLabel}>Auth</Text>
            <Text style={styles.detailValue}>{item.token ? 'Token' : 'Certificate'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SettingsIcon size={24} color="#00D9FF" />
          <Text style={styles.title}>Settings</Text>
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
            <Server size={40} color="#8B92A8" />
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

      <View style={styles.footer}>
        <Text style={styles.footerText}>Kubernetes Manager v1.0.0</Text>
        <Text style={styles.footerSubtext}>Built with React Native</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: { padding: 16, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: '#1E2B42' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700' as const, color: '#FFFFFF' },
  section: { flex: 1, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00D9FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { fontSize: 14, fontWeight: '600' as const, color: '#000000' },
  list: { gap: 12 },
  connectionCard: { backgroundColor: '#162033', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1E2B42' },
  connectionCardActive: { borderColor: '#00D9FF', backgroundColor: '#162840' },
  connectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  connectionLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  connectionIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#0D1219', alignItems: 'center', justifyContent: 'center' },
  connectionIconActive: { backgroundColor: '#00D9FF20' },
  connectionInfo: { flex: 1 },
  connectionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  connectionName: { fontSize: 16, fontWeight: '600' as const, color: '#FFFFFF' },
  connectionServer: { fontSize: 13, color: '#8B92A8' },
  deleteButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#0D1219', alignItems: 'center', justifyContent: 'center' },
  connectionDetails: { flexDirection: 'row', gap: 16 },
  connectionDetail: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#8B92A8', marginBottom: 4, fontWeight: '600' as const },
  detailValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' as const },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700' as const, color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#8B92A8', textAlign: 'center', marginBottom: 24 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00D9FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyButtonText: { fontSize: 15, fontWeight: '600' as const, color: '#000000' },
  footer: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1E2B42' },
  footerText: { fontSize: 13, color: '#8B92A8', fontWeight: '600' as const },
  footerSubtext: { fontSize: 11, color: '#666', marginTop: 4 },
});
