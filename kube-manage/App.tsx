import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/context/AuthContext';
import { KubernetesContext } from '@/context/KubernetesContext';
import { ThemeContext } from '@/context/ThemeContext';
import AppNavigator from '@/src/navigation/AppNavigator';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext>
        <ThemeContext>
          <KubernetesContext>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <AppNavigator />
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </KubernetesContext>
        </ThemeContext>
      </AuthContext>
    </QueryClientProvider>
  );
}
