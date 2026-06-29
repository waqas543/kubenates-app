import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
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
      { key: 'events', label: 'Events', icon: Activity },
    ],
  },
];

const SIDEBAR_WIDTH = 240;

export default function SidebarLayout() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Animation refs
  const sidebarSlide = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isSmallScreen) setSidebarOpen(true);
  }, [isSmallScreen]);

  useEffect(() => {
    const backAction = () => {
      if (sidebarOpen && isSmallScreen) {
        setSidebarOpen(false);
        return true;
      }
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ],
      );
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [sidebarOpen, isSmallScreen]);

  // Animate sidebar open/close on small screens
  useEffect(() => {
    if (!isSmallScreen) return;
    if (sidebarOpen) {
      Animated.parallel([
        Animated.spring(sidebarSlide, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sidebarSlide, {
          toValue: -SIDEBAR_WIDTH,
          duration: 220,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sidebarOpen, isSmallScreen]);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const navigateTo = useCallback((key: ScreenKey) => {
    // Fade out → swap screen → fade in
    Animated.timing(screenFade, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setActiveScreen(key);
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    if (isSmallScreen) setSidebarOpen(false);
  }, [isSmallScreen]);

  const Screen = SCREENS[activeScreen];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.root, isSmallScreen && styles.rootSmall]}>

        {/* ── Sidebar ── */}
        {(sidebarOpen || !isSmallScreen) && (
          <Animated.View
            style={[
              styles.sidebar,
              isSmallScreen && styles.sidebarOverlay,
              isSmallScreen && { transform: [{ translateX: sidebarSlide }] },
            ]}
          >
            <ScrollView contentContainerStyle={styles.sidebarContent} showsVerticalScrollIndicator={false}>
              {/* App title */}
              <Text style={styles.appTitle}>kube-manage</Text>

              {/* Dashboard (top-level) */}
              <TouchableOpacity
                style={[styles.navItem, activeScreen === 'dashboard' && styles.navItemActive]}
                onPress={() => navigateTo('dashboard')}
              >
                <Activity size={18} color={activeScreen === 'dashboard' ? colors.navAccent : colors.navTextMuted} />
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
                        ? <ChevronRight size={14} color={colors.navTextMuted} />
                        : <ChevronDown size={14} color={colors.navTextMuted} />}
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
                          <Icon size={16} color={active ? colors.navAccent : colors.navTextMuted} />
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
                <SettingsIcon size={18} color={activeScreen === 'settings' ? colors.navAccent : colors.navTextMuted} />
                <Text style={[styles.navLabel, activeScreen === 'settings' && styles.navLabelActive]}>
                  Settings
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        )}

        {/* Animated backdrop on small screens */}
        {isSmallScreen && sidebarOpen && (
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSidebarOpen(false)}
            />
          </Animated.View>
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
            <Animated.View style={[styles.screenContainer, { opacity: screenFade }]}>
              <Screen />
            </Animated.View>
          </MainLayoutNavProvider>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    root: { flex: 1, flexDirection: 'row', backgroundColor: c.bg },
    rootSmall: { flexDirection: 'column' },

    sidebar: {
      width: 240,
      backgroundColor: c.bgSidebar,
      borderRightWidth: 1,
      borderRightColor: c.navActive,
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
      color: c.navAccent,
      letterSpacing: 0.5,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    divider: {
      height: 1,
      backgroundColor: c.navActive,
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
      color: c.navTextMuted,
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
    navItemActive: { backgroundColor: c.navActive },
    navLabel: { fontSize: 13, color: c.navTextMuted, fontWeight: '500' as const, flex: 1 },
    navLabelActive: { color: c.navText, fontWeight: '600' as const },

    backdrop: {
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 10,
    },

    content: { flex: 1 },
    topBar: {
      height: 52,
      backgroundColor: c.bgTopBar,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    screenContainer: { flex: 1 },
  });
}
