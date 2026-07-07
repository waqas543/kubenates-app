import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import type { OAuthProvider } from '@/lib/supabase';
import { Chrome, Linkedin } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function OAuthButtons() {
  const { signInWithProvider, isAuthenticating } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = async (provider: OAuthProvider, label: string) => {
    try {
      await signInWithProvider(provider);
    } catch (error: any) {
      Alert.alert(`${label} Sign-In Failed`, error?.message ?? 'Could not start the sign-in flow.');
    }
  };

  return (
    <>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.oauthBtn, isAuthenticating && styles.btnDisabled]}
        onPress={() => handlePress('google', 'Google')}
        disabled={isAuthenticating}
      >
        <Chrome size={18} color={colors.text} />
        <Text style={styles.oauthBtnText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.oauthBtn, isAuthenticating && styles.btnDisabled]}
        onPress={() => handlePress('linkedin_oidc', 'LinkedIn')}
        disabled={isAuthenticating}
      >
        <Linkedin size={18} color="#0A66C2" />
        <Text style={styles.oauthBtnText}>Continue with LinkedIn</Text>
      </TouchableOpacity>
    </>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
    dividerText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' as const },
    oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
    btnDisabled: { opacity: 0.4 },
    oauthBtnText: { fontSize: 15, fontWeight: '600' as const, color: c.text },
  });
}
