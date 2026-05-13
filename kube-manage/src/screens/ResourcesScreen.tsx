import {
  mockConfigMaps,
  mockIngresses,
  mockNetworkPolicies,
  mockPersistentVolumeClaims,
  mockPersistentVolumes,
  mockSecrets,
  mockStatefulSets
} from '@/mocks/kubernetes';
import type {
  ConfigMap,
  Deployment,
  Ingress,
  NetworkPolicy,
  Node,
  PersistentVolume,
  PersistentVolumeClaim,
  Secret,
  Service,
  StatefulSet
} from '@/types/kubernetes';
import { useKubernetes } from '@/context/KubernetesContext';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Database,
  FileKey,
  FileText,
  Globe,
  HardDrive,
  Layers,
  Network,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  X
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ResourceType = 'deployments' | 'statefulsets' | 'services' | 'ingress' | 'secrets' | 'configmaps' | 'networkpolicies' | 'pv' | 'pvc' | 'nodes';

export default function ResourcesScreen() {
  const [activeTab, setActiveTab] = useState<ResourceType>('deployments');
  const [selectedResource, setSelectedResource] = useState<{ type: 'deployment' | 'statefulset'; item: Deployment | StatefulSet } | null>(null);
  const [scaleModalVisible, setScaleModalVisible] = useState<boolean>(false);
  const [scaleValue, setScaleValue] = useState<string>('');
  const {
    deployments,
    isDeploymentsLoading,
    nodes,
    services,
    deleteDeployment,
    restartDeployment,
    scaleDeployment,
    isDeploymentDeleting,
    isDeploymentRestarting,
    isDeploymentScaling,
  } = useKubernetes();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const RESOURCE_TABS = [
    { key: 'deployments' as const, label: 'Deployments', icon: Layers, color: '#FFB800', count: deployments.length },
    { key: 'statefulsets' as const, label: 'StatefulSets', icon: Database, color: '#00FF88', count: mockStatefulSets.length },
    { key: 'services' as const, label: 'Services', icon: Network, color: '#AA66FF', count: services.length },
    { key: 'ingress' as const, label: 'Ingress', icon: Globe, color: '#FF6B9D', count: mockIngresses.length },
    { key: 'secrets' as const, label: 'Secrets', icon: FileKey, color: '#FF5757', count: mockSecrets.length },
    { key: 'configmaps' as const, label: 'ConfigMaps', icon: FileText, color: '#00D9FF', count: mockConfigMaps.length },
    { key: 'networkpolicies' as const, label: 'Network Policies', icon: Shield, color: '#9D6CFF', count: mockNetworkPolicies.length },
    { key: 'pv' as const, label: 'Persistent Volumes', icon: HardDrive, color: '#FFB86C', count: mockPersistentVolumes.length },
    { key: 'pvc' as const, label: 'PV Claims', icon: HardDrive, color: '#8BE9FD', count: mockPersistentVolumeClaims.length },
    { key: 'nodes' as const, label: 'Nodes', icon: Server, color: '#50FA7B', count: nodes.length },
  ];

  const handleDelete = () => {
    if (!selectedResource) return;

    Alert.alert(
      `Delete ${selectedResource.type === 'deployment' ? 'Deployment' : 'StatefulSet'}`,
      `Are you sure you want to delete ${selectedResource.item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteDeployment({ name: selectedResource.item.name, namespace: selectedResource.item.namespace });
            setSelectedResource(null);
          },
        },
      ]
    );
  };

  const handleRestart = () => {
    if (!selectedResource) return;

    Alert.alert(
      `Restart ${selectedResource.type === 'deployment' ? 'Deployment' : 'StatefulSet'}`,
      `Are you sure you want to restart ${selectedResource.item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: () => {
            restartDeployment({ name: selectedResource.item.name, namespace: selectedResource.item.namespace });
            setSelectedResource(null);
          },
        },
      ]
    );
  };

  const handleScale = (direction: 'up' | 'down' | 'custom') => {
    if (!selectedResource) return;

    if (direction === 'custom') {
      setScaleModalVisible(true);
      return;
    }

    const currentReplicas = parseInt((selectedResource.item as Deployment).ready.split('/')[1]) || 1;
    const newReplicas = direction === 'up' ? currentReplicas + 1 : Math.max(0, currentReplicas - 1);

    scaleDeployment({
      name: selectedResource.item.name,
      namespace: selectedResource.item.namespace,
      replicas: newReplicas
    });
    setSelectedResource(null);
  };

  const handleCustomScale = () => {
    if (!selectedResource) return;
    const replicas = parseInt(scaleValue);

    if (isNaN(replicas) || replicas < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of replicas');
      return;
    }

    scaleDeployment({
      name: selectedResource.item.name,
      namespace: selectedResource.item.namespace,
      replicas
    });
    setScaleModalVisible(false);
    setSelectedResource(null);
    setScaleValue('');
  };

  const renderDeployment = ({ item }: { item: Deployment }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => setSelectedResource({ type: 'deployment', item })}
    >
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#FFB80020' }]}>
            <Layers size={16} color="#FFB800" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.resourceDetails}>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Ready</Text>
          <Text style={styles.detailValue}>{item.ready}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Up-to-date</Text>
          <Text style={styles.detailValue}>{item.upToDate}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Available</Text>
          <Text style={styles.detailValue}>{item.available}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatefulSet = ({ item }: { item: StatefulSet }) => (
    <TouchableOpacity
      style={styles.resourceCard}
      onPress={() => setSelectedResource({ type: 'statefulset', item })}
    >
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#00FF8820' }]}>
            <Database size={16} color="#00FF88" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.resourceDetails}>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Ready</Text>
          <Text style={styles.detailValue}>{item.ready}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderIngress = ({ item }: { item: Ingress }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#FF6B9D20' }]}>
            <Globe size={16} color="#FF6B9D" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Class</Text>
          <Text style={styles.serviceValue}>{item.className}</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Hosts</Text>
          <Text style={styles.serviceValue}>{item.hosts}</Text>
        </View>
        {item.address && (
          <View style={styles.serviceRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.serviceValue}>{item.address}</Text>
          </View>
        )}
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.serviceValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSecret = ({ item }: { item: Secret }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#FF575720' }]}>
            <FileKey size={16} color="#FF5757" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.resourceDetails}>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.type}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Data</Text>
          <Text style={styles.detailValue}>{item.data}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderConfigMap = ({ item }: { item: ConfigMap }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#00D9FF20' }]}>
            <FileText size={16} color="#00D9FF" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.resourceDetails}>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Data</Text>
          <Text style={styles.detailValue}>{item.data}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNetworkPolicy = ({ item }: { item: NetworkPolicy }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#9D6CFF20' }]}>
            <Shield size={16} color="#9D6CFF" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.resourceDetails}>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Pod Selector</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.podSelector}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.detailValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPV = ({ item }: { item: PersistentVolume }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#FFB86C20' }]}>
            <HardDrive size={16} color="#FFB86C" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Capacity</Text>
          <Text style={styles.serviceValue}>{item.capacity}</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Access Modes</Text>
          <Text style={styles.serviceValue}>{item.accessModes}</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Reclaim Policy</Text>
          <Text style={styles.serviceValue}>{item.reclaimPolicy}</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.serviceValue}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPVC = ({ item }: { item: PersistentVolumeClaim }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#8BE9FD20' }]}>
            <HardDrive size={16} color="#8BE9FD" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.serviceValue}>{item.status}</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Volume</Text>
          <Text style={styles.serviceValue}>{item.volume || 'N/A'}</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Capacity</Text>
          <Text style={styles.serviceValue}>{item.capacity}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNode = ({ item }: { item: Node }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#50FA7B20' }]}>
            <Server size={16} color="#50FA7B" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.resourceDetails}>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{item.status}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Roles</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.roles}</Text>
        </View>
        <View style={styles.resourceDetail}>
          <Text style={styles.detailLabel}>Version</Text>
          <Text style={styles.detailValue}>{item.version}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderService = ({ item }: { item: Service }) => (
    <TouchableOpacity style={styles.resourceCard}>
      <View style={styles.resourceMain}>
        <View style={styles.resourceLeft}>
          <View style={[styles.resourceIcon, { backgroundColor: '#AA66FF20' }]}>
            <Network size={16} color="#AA66FF" />
          </View>
          <View style={styles.resourceInfo}>
            <Text style={styles.resourceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.resourceNamespace}>{item.namespace}</Text>
          </View>
        </View>
        <ChevronRight size={18} color="#8B92A8" />
      </View>

      <View style={styles.serviceDetails}>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Type</Text>
          <View style={styles.serviceTypeBadge}>
            <Text style={styles.serviceTypeText}>{item.type}</Text>
          </View>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Cluster IP</Text>
          <Text style={styles.serviceValue}>{item.clusterIP}</Text>
        </View>
        {item.externalIP && (
          <View style={styles.serviceRow}>
            <Text style={styles.detailLabel}>External IP</Text>
            <Text style={styles.serviceValue}>{item.externalIP}</Text>
          </View>
        )}
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Ports</Text>
          <Text style={styles.serviceValue}>{item.ports}</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.detailLabel}>Age</Text>
          <Text style={styles.serviceValue}>{item.age}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'deployments':
        return <FlatList data={deployments} keyExtractor={(item) => `${item.namespace}/${item.name}`} renderItem={renderDeployment} contentContainerStyle={styles.list} />;
      case 'statefulsets':
        return <FlatList data={mockStatefulSets} keyExtractor={(item) => item.name} renderItem={renderStatefulSet} contentContainerStyle={styles.list} />;
      case 'services':
        return <FlatList data={services} keyExtractor={(item) => `${item.namespace}/${item.name}`} renderItem={renderService} contentContainerStyle={styles.list} />;
      case 'ingress':
        return <FlatList data={mockIngresses} keyExtractor={(item) => item.name} renderItem={renderIngress} contentContainerStyle={styles.list} />;
      case 'secrets':
        return <FlatList data={mockSecrets} keyExtractor={(item) => item.name} renderItem={renderSecret} contentContainerStyle={styles.list} />;
      case 'configmaps':
        return <FlatList data={mockConfigMaps} keyExtractor={(item) => item.name} renderItem={renderConfigMap} contentContainerStyle={styles.list} />;
      case 'networkpolicies':
        return <FlatList data={mockNetworkPolicies} keyExtractor={(item) => item.name} renderItem={renderNetworkPolicy} contentContainerStyle={styles.list} />;
      case 'pv':
        return <FlatList data={mockPersistentVolumes} keyExtractor={(item) => item.name} renderItem={renderPV} contentContainerStyle={styles.list} />;
      case 'pvc':
        return <FlatList data={mockPersistentVolumeClaims} keyExtractor={(item) => item.name} renderItem={renderPVC} contentContainerStyle={styles.list} />;
      case 'nodes':
        return <FlatList data={nodes} keyExtractor={(item) => item.name} renderItem={renderNode} contentContainerStyle={styles.list} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {RESOURCE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={16} color={isActive ? tab.color : '#8B92A8'} />
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {renderContent()}

      <Modal
        visible={selectedResource !== null && !scaleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedResource(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedResource(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.actionSheet}
          >
            <View style={styles.actionSheetHeader}>
              <View>
                <Text style={styles.actionSheetTitle}>{selectedResource?.item.name}</Text>
                <Text style={styles.actionSheetSubtitle}>{selectedResource?.item.namespace}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedResource(null)}>
                <X size={24} color="#8B92A8" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.logsButtonModal]}
                onPress={() => {
                  if (!selectedResource) return;
                  navigation.navigate('Logs', {
                    type: selectedResource.type,
                    name: selectedResource.item.name,
                  });
                  setSelectedResource(null);
                }}
              >
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.modalActionText}>View Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.scaleUpButton]}
                onPress={() => handleScale('up')}
                disabled={isDeploymentScaling}
              >
                <ArrowUp size={20} color="#FFFFFF" />
                <Text style={styles.modalActionText}>Scale Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.scaleDownButton]}
                onPress={() => handleScale('down')}
                disabled={isDeploymentScaling}
              >
                <ArrowDown size={20} color="#FFFFFF" />
                <Text style={styles.modalActionText}>Scale Down</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.scaleCustomButton]}
                onPress={() => handleScale('custom')}
                disabled={isDeploymentScaling}
              >
                <Text style={styles.modalActionText}>Custom Scale</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.restartButtonModal]}
                onPress={handleRestart}
                disabled={isDeploymentRestarting}
              >
                <RefreshCw size={20} color="#FFFFFF" />
                <Text style={styles.modalActionText}>Restart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionButton, styles.deleteButtonModal]}
                onPress={handleDelete}
                disabled={isDeploymentDeleting}
              >
                <Trash2 size={20} color="#FFFFFF" />
                <Text style={styles.modalActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={scaleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setScaleModalVisible(false);
          setScaleValue('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setScaleModalVisible(false);
            setScaleValue('');
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.scaleModal}
          >
            <Text style={styles.scaleModalTitle}>Scale Replicas</Text>
            <Text style={styles.scaleModalSubtitle}>Enter the number of replicas</Text>
            <TextInput
              style={styles.scaleInput}
              value={scaleValue}
              onChangeText={setScaleValue}
              keyboardType="number-pad"
              placeholder="Number of replicas"
              placeholderTextColor="#8B92A8"
            />
            <View style={styles.scaleModalButtons}>
              <TouchableOpacity
                style={[styles.scaleModalButton, styles.scaleModalCancel]}
                onPress={() => {
                  setScaleModalVisible(false);
                  setScaleValue('');
                }}
              >
                <Text style={styles.scaleModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scaleModalButton, styles.scaleModalConfirm]}
                onPress={handleCustomScale}
              >
                <Text style={styles.scaleModalButtonText}>Scale</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8B92A8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#0D1219',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  resourceCard: {
    backgroundColor: '#162033',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E2B42',
  },
  resourceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resourceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  resourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  resourceNamespace: {
    fontSize: 12,
    color: '#8B92A8',
  },
  resourceDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  resourceDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#8B92A8',
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  detailValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  serviceDetails: {
    gap: 8,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  serviceTypeBadge: {
    backgroundColor: '#0D1219',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceTypeText: {
    fontSize: 11,
    color: '#AA66FF',
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#162033',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 13,
    color: '#8B92A8',
  },
  actionButtons: {
    gap: 12,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  scaleUpButton: {
    backgroundColor: '#00FF88',
  },
  scaleDownButton: {
    backgroundColor: '#FFB800',
  },
  scaleCustomButton: {
    backgroundColor: '#AA66FF',
  },
  restartButtonModal: {
    backgroundColor: '#00D9FF',
  },
  logsButtonModal: {
    backgroundColor: '#1E2B42',
  },
  deleteButtonModal: {
    backgroundColor: '#FF5757',
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  scaleModal: {
    backgroundColor: '#162033',
    margin: 20,
    borderRadius: 16,
    padding: 24,
  },
  scaleModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scaleModalSubtitle: {
    fontSize: 14,
    color: '#8B92A8',
    marginBottom: 20,
  },
  scaleInput: {
    backgroundColor: '#0D1219',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E2B42',
  },
  scaleModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  scaleModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  scaleModalCancel: {
    backgroundColor: '#1E2B42',
  },
  scaleModalConfirm: {
    backgroundColor: '#00D9FF',
  },
  scaleModalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
