import { useKubernetes } from '@/context/KubernetesContext';
import { RefreshCw } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

/** Stack navigator header action: refetch all active React Query data (same as AppHeader reload). */
export function HeaderRefreshButton() {
  const { activeConnection, refetchAll } = useKubernetes();
  const [busy, setBusy] = useState(false);

  if (!activeConnection) {
    return <View style={{ width: 36 }} />;
  }

  return (
    <TouchableOpacity
      onPress={async () => {
        if (busy) return;
        setBusy(true);
        try {
          await refetchAll();
        } finally {
          setBusy(false);
        }
      }}
      style={{ marginRight: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Reload data"
    >
      {busy ? (
        <ActivityIndicator size="small" color="#00D9FF" />
      ) : (
        <RefreshCw size={20} color="#00D9FF" />
      )}
    </TouchableOpacity>
  );
}
