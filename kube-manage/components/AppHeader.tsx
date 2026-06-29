import { useKubernetes } from '@/context/KubernetesContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { ChevronDown, Menu, RefreshCw } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface AppHeaderProps {
  onMenuPress: () => void;
  showMenu: boolean;
}

export function AppHeader({ onMenuPress, showMenu }: AppHeaderProps) {
  const {
    activeConnection,
    activeNamespace,
    setActiveNamespace,
    namespaces,
    refetchAll,
  } = useKubernetes();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reloadBusy, setReloadBusy] = useState(false);

  const namespaceOptions = useMemo(() => {
    const base = namespaces.length > 0 ? namespaces.map((ns) => ns.name) : [];
    return ['all', ...base];
  }, [namespaces]);

  const handleSelect = (ns: string) => {
    setActiveNamespace(ns);
    setDropdownOpen(false);
  };

  const onReload = async () => {
    if (!activeConnection || reloadBusy) return;
    setReloadBusy(true);
    try {
      await refetchAll();
    } finally {
      setReloadBusy(false);
    }
  };

  const label = activeNamespace === 'all' ? 'All namespaces' : activeNamespace;

  return (
    <View style={styles.container}>
      {showMenu && (
        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress}>
          <Menu size={20} color={colors.text} />
        </TouchableOpacity>
      )}

      <Text style={styles.contextName} numberOfLines={1}>
        {activeConnection?.name ?? 'No cluster'}
      </Text>

      <TouchableOpacity
        style={[styles.iconBtn, !activeConnection && styles.iconBtnDisabled]}
        onPress={onReload}
        disabled={!activeConnection || reloadBusy}
        accessibilityRole="button"
        accessibilityLabel="Reload cluster data"
      >
        {reloadBusy ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <RefreshCw size={18} color={activeConnection ? colors.accent : colors.textMuted} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.nsSelector, !activeConnection && styles.nsSelectorDisabled]}
        onPress={() => activeConnection && setDropdownOpen(true)}
        activeOpacity={0.8}
        disabled={!activeConnection}
      >
        <Text style={styles.nsValue} numberOfLines={1}>{label}</Text>
        <ChevronDown size={13} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDropdownOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close namespace picker"
          />
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>Namespace</Text>
            <ScrollView
              nestedScrollEnabled
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {namespaceOptions.map((ns) => {
                const active = activeNamespace === ns;
                return (
                  <TouchableOpacity
                    key={ns}
                    style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                    onPress={() => handleSelect(ns)}
                  >
                    <Text style={[styles.dropdownText, active && styles.dropdownTextActive]}>
                      {ns === 'all' ? 'All namespaces' : ns}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    menuBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contextName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700' as const,
      color: c.text,
      minWidth: 0,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    iconBtnDisabled: {
      opacity: 0.45,
    },
    nsSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: c.bgCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      maxWidth: 148,
    },
    nsSelectorDisabled: {
      opacity: 0.45,
    },
    nsValue: {
      fontSize: 12,
      color: c.text,
      flexShrink: 1,
    },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-start',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalPanel: {
      marginTop: 4,
      marginHorizontal: 12,
      maxHeight: 340,
      backgroundColor: c.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 12,
    },
    modalTitle: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.bgSecondary,
    },
    modalScroll: {
      maxHeight: 300,
    },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
    dropdownItemActive: { backgroundColor: `${c.accent}20` },
    dropdownText: { fontSize: 14, color: c.textSecondary },
    dropdownTextActive: { color: c.text, fontWeight: '600' as const },
  });
}
