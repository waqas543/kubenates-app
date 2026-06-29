import { useKubernetes } from '@/context/KubernetesContext';
import { toParsedConfig } from '@/lib/kubeHelpers';
import type { ParsedKubeConfig } from '@/lib/kubernetesClient';
import {
  getDaemonSet,
  getDeployment,
  getPod,
  getPodLogs,
  getPodsWithSelector,
  getReplicaSet,
  getStatefulSet,
} from '@/lib/kubernetesClient';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteType = RouteProp<RootStackParamList, 'Logs'>;

async function resolveInfo(cfg: ParsedKubeConfig, type: string, namespace: string, name: string): Promise<{ pods: string[]; containers: string[] }> {
  if (type === 'pod') {
    const res = await getPod(cfg, namespace, name);
    const containers: string[] = (res.data?.spec?.containers ?? []).map((c: any) => c.name as string);
    return { pods: [name], containers };
  }
  const getterMap: Record<string, (c: ParsedKubeConfig, ns: string, n: string) => Promise<any>> = {
    deployment: getDeployment, statefulset: getStatefulSet, daemonset: getDaemonSet, replicaset: getReplicaSet,
  };
  const getter = getterMap[type.toLowerCase()];
  if (!getter) return { pods: [], containers: [] };
  const res = await getter(cfg, namespace, name);
  const resource = res.data;
  const matchLabels: Record<string, string> = resource?.spec?.selector?.matchLabels ?? {};
  const labelSelector = Object.entries(matchLabels).map(([k, v]) => `${k}=${v}`).join(',');
  const containers: string[] = (resource?.spec?.template?.spec?.containers ?? []).map((c: any) => c.name as string);
  const podsRes = await getPodsWithSelector(cfg, namespace, labelSelector);
  const pods: string[] = (podsRes.data?.items ?? []).map((p: any) => p.metadata?.name as string).filter(Boolean);
  return { pods, containers };
}

export default function LogsScreen() {
  const route = useRoute<RouteType>();
  const { type = 'pod', name = '', namespace = 'default' } = route.params ?? {};
  const { activeConnection } = useKubernetes();
  const cfg = activeConnection ? toParsedConfig(activeConnection) : null;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedPod, setSelectedPod] = useState('');
  const [selectedContainer, setSelectedContainer] = useState('');
  const isDeployment = type === 'deployment';

  const { data: info, isLoading: infoLoading, error: infoError } = useQuery({
    queryKey: ['logs-info', type, namespace, name],
    enabled: !!cfg,
    retry: 1,
    queryFn: () => resolveInfo(cfg!, type!, namespace, name),
  });

  useEffect(() => {
    if (!info) return;
    if (info.pods.length > 0 && !selectedPod) setSelectedPod(info.pods[0]);
    if (info.containers.length > 0 && !selectedContainer) setSelectedContainer(info.containers[0]);
  }, [info]);

  const activePod = type === 'pod' ? name : selectedPod;
  const activeContainer = selectedContainer || undefined;
  const pods = info?.pods ?? [];
  const podsKey = isDeployment ? pods.slice().sort().join(',') : activePod;

  const { data: logText, isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ['logs-content', namespace, podsKey, activeContainer],
    enabled: !!cfg && (isDeployment ? pods.length > 0 : !!activePod),
    retry: 1,
    refetchInterval: 2000,
    queryFn: async () => {
      if (isDeployment) {
        const results = await Promise.all(
          pods.map(async pod => {
            try {
              const res = await getPodLogs(cfg!, namespace, pod, { container: activeContainer, tailLines: 50 });
              const text = typeof res.data === 'string' ? res.data : String(res.data ?? '');
              return text.split('\n').filter(l => l.trim()).map(l => `[${pod}] ${l}`);
            } catch {
              return [`[${pod}] <failed to fetch logs>`];
            }
          }),
        );
        return results.flat().join('\n');
      }
      const res = await getPodLogs(cfg!, namespace, activePod, { container: activeContainer, tailLines: 200 });
      return typeof res.data === 'string' ? res.data : String(res.data ?? '');
    },
  });

  const logLines = logText ? logText.split('\n').filter(l => l.trim()) : [];
  const containers = info?.containers ?? [];
  const showPodPicker = !isDeployment && type !== 'pod' && pods.length > 1;
  const showContainerPicker = containers.length > 1;
  const kindLabel = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Resource';
  const isRefreshing = infoLoading || logsLoading;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{kindLabel} Logs</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{name}</Text>
            {!infoLoading && activePod && type !== 'pod' && !isDeployment && (
              <Text style={styles.activePod} numberOfLines={1}>pod: {activePod}</Text>
            )}
            {!infoLoading && isDeployment && pods.length > 0 && (
              <Text style={styles.activePod}>{pods.length} pod{pods.length > 1 ? 's' : ''}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, isRefreshing && styles.refreshBtnDisabled]}
            onPress={() => refetchLogs()}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} color={colors.accent} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {showPodPicker && (
          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>SELECT POD</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {pods.map(pod => (
                <TouchableOpacity
                  key={pod}
                  style={[styles.pill, selectedPod === pod && styles.pillActive]}
                  onPress={() => setSelectedPod(pod)}
                >
                  <Text style={[styles.pillText, selectedPod === pod && styles.pillTextActive]} numberOfLines={1}>{pod}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showContainerPicker && (
          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>SELECT CONTAINER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {containers.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pill, selectedContainer === c && styles.pillActive]}
                  onPress={() => setSelectedContainer(c)}
                >
                  <Text style={[styles.pillText, selectedContainer === c && styles.pillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Log area */}
      <View style={styles.logArea}>
        {infoLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.statusText}>Resolving {kindLabel.toLowerCase()}...</Text>
          </View>
        ) : infoError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{(infoError as any)?.message ?? 'Failed to resolve resource'}</Text>
          </View>
        ) : type !== 'pod' && pods.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>No running pods found for this {kindLabel.toLowerCase()}</Text>
          </View>
        ) : logsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.statusText}>Fetching logs...</Text>
          </View>
        ) : logsError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{(logsError as any)?.message ?? 'Failed to fetch logs'}</Text>
          </View>
        ) : logLines.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.statusText}>No log output available</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.logContent}>
            {logLines.map((line, idx) => (
              <Text key={idx} style={styles.logLine}>{line}</Text>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { backgroundColor: c.bgCard, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 12 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
    headerInfo: { flex: 1, marginRight: 12 },
    title: { fontSize: 18, fontWeight: '700' as const, color: c.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: c.textSecondary },
    activePod: { fontSize: 11, color: c.accent, marginTop: 4 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${c.accent}15`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: `${c.accent}30` },
    refreshBtnDisabled: { opacity: 0.4 },
    refreshText: { fontSize: 12, color: c.accent, fontWeight: '600' as const },
    pickerSection: { paddingHorizontal: 16, marginTop: 6 },
    pickerLabel: { fontSize: 10, color: c.textSecondary, fontWeight: '700' as const, letterSpacing: 1, marginBottom: 6 },
    pickerRow: { gap: 8, paddingBottom: 2 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.bgSecondary, borderWidth: 1, borderColor: c.border, maxWidth: 220 },
    pillActive: { backgroundColor: `${c.accent}20`, borderColor: c.accent },
    pillText: { fontSize: 12, color: c.textSecondary },
    pillTextActive: { color: c.accent, fontWeight: '600' as const },
    logArea: { flex: 1, padding: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    statusText: { color: c.textSecondary, fontSize: 14 },
    errorText: { color: c.accentRed, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
    logContent: { padding: 14, borderRadius: 10, backgroundColor: '#050814' },
    logLine: { fontSize: 12, color: '#E5E5E5', fontFamily: 'monospace', marginBottom: 3, lineHeight: 18 },
  });
}
