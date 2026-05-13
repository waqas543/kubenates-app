import { HeaderRefreshButton } from '@/components/HeaderRefreshButton';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import LogsScreen from '../screens/LogsScreen';
import PodDetailsScreen from '../screens/PodDetailsScreen';
import SetupScreen from '../screens/SetupScreen';
import SidebarLayout from './SidebarLayout';

// Detail screens
import DeploymentDetailsScreen from '../screens/DeploymentDetailsScreen';
import StatefulSetDetailsScreen from '../screens/StatefulSetDetailsScreen';
import DaemonSetDetailsScreen from '../screens/DaemonSetDetailsScreen';
import JobDetailsScreen from '../screens/JobDetailsScreen';
import CronJobDetailsScreen from '../screens/CronJobDetailsScreen';
import ReplicaSetDetailsScreen from '../screens/ReplicaSetDetailsScreen';
import ServiceDetailsScreen from '../screens/ServiceDetailsScreen';
import IngressDetailsScreen from '../screens/IngressDetailsScreen';
import ConfigMapDetailsScreen from '../screens/ConfigMapDetailsScreen';
import SecretDetailsScreen from '../screens/SecretDetailsScreen';
import NodeDetailsScreen from '../screens/NodeDetailsScreen';
import NamespaceDetailsScreen from '../screens/NamespaceDetailsScreen';

export type RootStackParamList = {
  Main: undefined;
  Setup: undefined;
  Logs: { type?: string; name?: string; namespace?: string };
  PodDetails: { name: string; namespace: string };
  DeploymentDetails: { name: string; namespace: string };
  StatefulSetDetails: { name: string; namespace: string };
  DaemonSetDetails: { name: string; namespace: string };
  JobDetails: { name: string; namespace: string };
  CronJobDetails: { name: string; namespace: string };
  ReplicaSetDetails: { name: string; namespace: string };
  ServiceDetails: { name: string; namespace: string };
  IngressDetails: { name: string; namespace: string };
  ConfigMapDetails: { name: string; namespace: string };
  SecretDetails: { name: string; namespace: string };
  NodeDetails: { name: string };
  NamespaceDetails: { name: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const HEADER_STYLE = {
  headerStyle: { backgroundColor: '#0D1219' },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '700' as const },
};

const HEADER_WITH_REFRESH = {
  ...HEADER_STYLE,
  headerRight: () => <HeaderRefreshButton />,
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={HEADER_STYLE}>
        <Stack.Screen name="Main" component={SidebarLayout} options={{ headerShown: false }} />
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Add Connection' }}
        />
        <Stack.Screen
          name="Logs"
          component={LogsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Logs' }}
        />
        <Stack.Screen
          name="PodDetails"
          component={PodDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Pod Details' }}
        />
        <Stack.Screen
          name="DeploymentDetails"
          component={DeploymentDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Deployment' }}
        />
        <Stack.Screen
          name="StatefulSetDetails"
          component={StatefulSetDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'StatefulSet' }}
        />
        <Stack.Screen
          name="DaemonSetDetails"
          component={DaemonSetDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'DaemonSet' }}
        />
        <Stack.Screen
          name="JobDetails"
          component={JobDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Job' }}
        />
        <Stack.Screen
          name="CronJobDetails"
          component={CronJobDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'CronJob' }}
        />
        <Stack.Screen
          name="ReplicaSetDetails"
          component={ReplicaSetDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'ReplicaSet' }}
        />
        <Stack.Screen
          name="ServiceDetails"
          component={ServiceDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Service' }}
        />
        <Stack.Screen
          name="IngressDetails"
          component={IngressDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Ingress' }}
        />
        <Stack.Screen
          name="ConfigMapDetails"
          component={ConfigMapDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'ConfigMap' }}
        />
        <Stack.Screen
          name="SecretDetails"
          component={SecretDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Secret' }}
        />
        <Stack.Screen
          name="NodeDetails"
          component={NodeDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Node' }}
        />
        <Stack.Screen
          name="NamespaceDetails"
          component={NamespaceDetailsScreen}
          options={{ ...HEADER_WITH_REFRESH, title: 'Namespace' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
