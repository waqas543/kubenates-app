import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteType = RouteProp<RootStackParamList, 'Logs'>;
type LogResourceType = 'pod' | 'deployment' | 'statefulset';

export default function LogsScreen() {
  const route = useRoute<RouteType>();
  const params = route.params ?? {};
  const resourceType = (params.type as LogResourceType) || 'pod';
  const name = params.name || 'unknown';

  const lines = useMemo(() => {
    const now = new Date();
    const base = `[${now.toISOString()}]`;
    const kind = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
    return [
      `${base} ${kind} "${name}": starting log stream`,
      `${base} container init: pulling image...`,
      `${base} container init: image pulled successfully`,
      `${base} app: listening on 0.0.0.0:8080`,
      `${base} app: health check passed`,
      `${base} app: processing request GET /`,
      `${base} app: processing request GET /healthz`,
      `${base} app: processing request GET /metrics`,
      `${base} ${kind} "${name}": log stream ended (mock data)`,
    ];
  }, [name, resourceType]);

  const title =
    resourceType === 'deployment'
      ? 'Deployment Logs'
      : resourceType === 'statefulset'
      ? 'StatefulSet Logs'
      : 'Pod Logs';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{name}</Text>
      </View>
      <View style={styles.logContainer}>
        <ScrollView contentContainerStyle={styles.logContent}>
          {lines.map((line, idx) => (
            <Text key={idx} style={styles.logLine}>{line}</Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1E2B42' },
  title: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#8B92A8' },
  logContainer: { flex: 1, padding: 16 },
  logContent: { padding: 12, borderRadius: 10, backgroundColor: '#050814' },
  logLine: { fontSize: 12, color: '#E5E5E5', fontFamily: 'System', marginBottom: 2 },
});
