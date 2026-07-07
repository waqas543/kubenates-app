import { HeaderRefreshButton } from '@/components/HeaderRefreshButton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import LogsScreen from '../screens/LogsScreen';
import PodDetailsScreen from '../screens/PodDetailsScreen';
import SetupScreen from '../screens/SetupScreen';
import SignupScreen from '../screens/SignupScreen';
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
  Login: undefined;
  Signup: undefined;
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

export default function AppNavigator() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  const headerStyle = {
    headerStyle: { backgroundColor: colors.bgTopBar },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700' as const },
  };

  const headerWithRefresh = {
    ...headerStyle,
    headerRight: () => <HeaderRefreshButton />,
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={headerStyle}>
        <Stack.Screen name="Main" component={SidebarLayout} options={{ headerShown: false }} />
        <Stack.Screen
          name="Setup"
          component={SetupScreen}
          options={{ ...headerWithRefresh, title: 'Add Connection' }}
        />
        <Stack.Screen
          name="Logs"
          component={LogsScreen}
          options={{ ...headerWithRefresh, title: 'Logs' }}
        />
        <Stack.Screen
          name="PodDetails"
          component={PodDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Pod Details' }}
        />
        <Stack.Screen
          name="DeploymentDetails"
          component={DeploymentDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Deployment' }}
        />
        <Stack.Screen
          name="StatefulSetDetails"
          component={StatefulSetDetailsScreen}
          options={{ ...headerWithRefresh, title: 'StatefulSet' }}
        />
        <Stack.Screen
          name="DaemonSetDetails"
          component={DaemonSetDetailsScreen}
          options={{ ...headerWithRefresh, title: 'DaemonSet' }}
        />
        <Stack.Screen
          name="JobDetails"
          component={JobDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Job' }}
        />
        <Stack.Screen
          name="CronJobDetails"
          component={CronJobDetailsScreen}
          options={{ ...headerWithRefresh, title: 'CronJob' }}
        />
        <Stack.Screen
          name="ReplicaSetDetails"
          component={ReplicaSetDetailsScreen}
          options={{ ...headerWithRefresh, title: 'ReplicaSet' }}
        />
        <Stack.Screen
          name="ServiceDetails"
          component={ServiceDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Service' }}
        />
        <Stack.Screen
          name="IngressDetails"
          component={IngressDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Ingress' }}
        />
        <Stack.Screen
          name="ConfigMapDetails"
          component={ConfigMapDetailsScreen}
          options={{ ...headerWithRefresh, title: 'ConfigMap' }}
        />
        <Stack.Screen
          name="SecretDetails"
          component={SecretDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Secret' }}
        />
        <Stack.Screen
          name="NodeDetails"
          component={NodeDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Node' }}
        />
        <Stack.Screen
          name="NamespaceDetails"
          component={NamespaceDetailsScreen}
          options={{ ...headerWithRefresh, title: 'Namespace' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
