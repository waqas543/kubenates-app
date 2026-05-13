import { AppHeader } from '@/components/AppHeader';
import {
  Activity,
  AlignJustify,
  Box,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileKey,
  FileText,
  Globe,
  HardDrive,
  Layers,
  Network,
  RefreshCw,
  Server,
  Settings as SettingsIcon,
  Shield,
  Users,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Screens (lazy imports to avoid circular deps) ──────────────────────────
import DashboardScreen from '../screens/DashboardScreen';
import PodsScreen from '../screens/PodsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Workloads
import DeploymentsScreen from '../screens/DeploymentsScreen';
import StatefulSetsScreen from '../screens/StatefulSetsScreen';
import DaemonSetsScreen from '../screens/DaemonSetsScreen';
import JobsScreen from '../screens/JobsScreen';
import CronJobsScreen from '../screens/CronJobsScreen';
import ReplicaSetsScreen from '../screens/ReplicaSetsScreen';

// Networking
import ServicesScreen from '../screens/ServicesScreen';
import IngressesScreen from '../screens/IngressesScreen';
import NetworkPoliciesScreen from '../screens/NetworkPoliciesScreen';

// Storage
import PersistentVolumesScreen from '../screens/PersistentVolumesScreen';
import PersistentVolumeClaimsScreen from '../screens/PersistentVolumeClaimsScreen';
import StorageClassesScreen from '../screens/StorageClassesScreen';

// Configuration
import ConfigMapsScreen from '../screens/ConfigMapsScreen';
import SecretsScreen from '../screens/SecretsScreen';
import ServiceAccountsScreen from '../screens/ServiceAccountsScreen';

// Cluster
import NodesScreen from '../screens/NodesScreen';
import NamespacesScreen from '../screens/NamespacesScreen';
import EventsScreen from '../screens/EventsScreen';

import { MainLayoutNavProvider } from './MainLayoutNavContext';
import type { ScreenKey } from './screenKeys';

export type { ScreenKey } from './screenKeys';

const SCREENS: Record<ScreenKey, React.ComponentType> = {
  dashboard: DashboardScreen,
  pods: PodsScreen,
  deployments: DeploymentsScreen,
  statefulsets: StatefulSetsScreen,
  daemonsets: DaemonSetsScreen,
  jobs: JobsScreen,
  cronjobs: CronJobsScreen,
  replicasets: ReplicaSetsScreen,
  services: ServicesScreen,
  ingresses: IngressesScreen,
  networkpolicies: NetworkPoliciesScreen,
  persistentvolumes: PersistentVolumesScreen,
  persistentvolumeclaims: PersistentVolumeClaimsScreen,
  storageclasses: StorageClassesScreen,
  configmaps: ConfigMapsScreen,
  secrets: SecretsScreen,
  serviceaccounts: ServiceAccountsScreen,
  nodes: NodesScreen,
  namespaces: NamespacesScreen,
  events: EventsScreen,
  settings: SettingsScreen,
};

type NavItem = { key: ScreenKey; label: string; icon: React.ComponentType<{ size: number; color: string }> };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'WORKLOADS',
    items: [
      { key: 'pods', label: 'Pods', icon: Box },
      { key: 'deployments', label: 'Deployments', icon: Layers },
      { key: 'statefulsets', label: 'StatefulSets', icon: Database },
      { key: 'daemonsets', label: 'DaemonSets', icon: Server },
      { key: 'jobs', label: 'Jobs', icon: Zap },
      { key: 'cronjobs', label: 'CronJobs', icon: Clock },
      { key: 'replicasets', label: 'ReplicaSets', icon: RefreshCw },
    ],
  },
  {
    title: 'NETWORKING',
    items: [
      { key: 'services', label: 'Services', icon: Network },
      { key: 'ingresses', label: 'Ingresses', icon: Globe },
      { key: 'networkpolicies', label: 'Network Policies', icon: Shield },
    ],
  },
  {
    title: 'STORAGE',
    items: [
      { key: 'persistentvolumes', label: 'Persistent Volumes', icon: HardDrive },
      { key: 'persistentvolumeclaims', label: 'PV Claims', icon: HardDrive },
      { key: 'storageclasses', label: 'Storage Classes', icon: AlignJustify },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { key: 'configmaps', label: 'ConfigMaps', icon: FileText },
      { key: 'secrets', label: 'Secrets', icon: FileKey },
      { key: 'serviceaccounts', label: 'Service Accounts', icon: Users },
    ],
  },
  {
    title: 'CLUSTER',
    items: [
      { key: 'nodes', label: 'Nodes', icon: Server },
      { key: 'namespaces', label: 'Namespaces', icon: Database },
      { key: 'events', label: 'Events', icon: Activity },
    ],
  },
];

export default function SidebarLayout() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  React.useEffect(() => {
    if (!isSmallScreen) setSidebarOpen(true);
  }, [isSmallScreen]);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const navigateTo = useCallback((key: ScreenKey) => {
    setActiveScreen(key);
    if (isSmallScreen) setSidebarOpen(false);
  }, [isSmallScreen]);

  const Screen = SCREENS[activeScreen];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={[styles.root, isSmallScreen && styles.rootSmall]}>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <View style={[styles.sidebar, isSmallScreen && styles.sidebarOverlay]}>
            <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
              {/* App title */}
              <Text style={styles.appTitle}>kube-manage</Text>

              {/* Dashboard (top-level) */}
              <TouchableOpacity
                style={[styles.navItem, activeScreen === 'dashboard' && styles.navItemActive]}
                onPress={() => navigateTo('dashboard')}
              >
                <Activity size={18} color={activeScreen === 'dashboard' ? '#00D9FF' : '#8B92A8'} />
                <Text style={[styles.navLabel, activeScreen === 'dashboard' && styles.navLabelActive]}>
                  Dashboard
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Grouped sections */}
              {NAV_SECTIONS.map((section) => {
                const collapsed = collapsedSections.has(section.title);
                return (
                  <View key={section.title} style={styles.section}>
                    <TouchableOpacity
                      style={styles.sectionHeader}
                      onPress={() => toggleSection(section.title)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      {collapsed
                        ? <ChevronRight size={14} color="#4A5568" />
                        : <ChevronDown size={14} color="#4A5568" />}
                    </TouchableOpacity>

                    {!collapsed && section.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeScreen === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[styles.navItem, active && styles.navItemActive]}
                          onPress={() => navigateTo(item.key)}
                        >
                          <Icon size={16} color={active ? '#00D9FF' : '#8B92A8'} />
                          <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}

              <View style={styles.divider} />

              {/* Settings */}
              <TouchableOpacity
                style={[styles.navItem, activeScreen === 'settings' && styles.navItemActive]}
                onPress={() => navigateTo('settings')}
              >
                <SettingsIcon size={18} color={activeScreen === 'settings' ? '#00D9FF' : '#8B92A8'} />
                <Text style={[styles.navLabel, activeScreen === 'settings' && styles.navLabelActive]}>
                  Settings
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Backdrop on small screens */}
        {sidebarOpen && isSmallScreen && (
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main content ── */}
        <View style={styles.content}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <AppHeader
              showMenu={isSmallScreen}
              onMenuPress={() => setSidebarOpen((o) => !o)}
            />
          </View>

          {/* Screen */}
          <MainLayoutNavProvider value={navigateTo}>
            <View style={styles.screenContainer}>
              <Screen />
            </View>
          </MainLayoutNavProvider>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#0A0E1A' },
  rootSmall: { flexDirection: 'column' },

  sidebar: {
    width: 240,
    backgroundColor: '#050814',
    borderRightWidth: 1,
    borderRightColor: '#1E2B42',
    paddingBottom: 16,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  sidebarContent: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 20,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#00D9FF',
    letterSpacing: 0.5,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E2B42',
    marginVertical: 10,
  },
  section: { marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#4A5568',
    letterSpacing: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 10,
    marginBottom: 1,
  },
  navItemActive: { backgroundColor: '#162033' },
  navLabel: { fontSize: 13, color: '#8B92A8', fontWeight: '500' as const, flex: 1 },
  navLabelActive: { color: '#FFFFFF', fontWeight: '600' as const },

  backdrop: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },

  content: { flex: 1 },
  topBar: {
    height: 52,
    backgroundColor: '#0D1219',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2B42',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  screenContainer: { flex: 1 },
});
