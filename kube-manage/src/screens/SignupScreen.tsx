import { OAuthButtons } from '@/components/OAuthButtons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, Mail, UserPlus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { signUp, isAuthenticating } = useAuth();
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Email and password are required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
    try {
      const { session } = await signUp(email.trim(), password);
      if (!session) {
        Alert.alert('Check Your Email', 'We sent a confirmation link to your email address. Confirm it, then log in.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      }
      // If a session comes back immediately (email confirmation disabled), AuthContext
      // picks it up via onAuthStateChange and AppNavigator swaps to the authenticated stack.
    } catch (error: any) {
      Alert.alert('Signup Failed', error?.message ?? 'Could not create your account. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <UserPlus size={28} color={colors.accent} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to start managing your clusters</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputField}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWithIcon}>
              <Lock size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputField}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWithIcon}>
              <Lock size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputField}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, isAuthenticating && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={isAuthenticating}
          >
            <Text style={styles.primaryBtnText}>{isAuthenticating ? 'Creating Account...' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <OAuthButtons />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    sectionHeader: { alignItems: 'center', marginBottom: 32 },
    iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${c.accent}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: `${c.accent}30` },
    title: { fontSize: 26, fontWeight: '800' as const, color: c.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600' as const, color: c.text, marginBottom: 6 },
    inputWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.bgCard, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border },
    inputField: { flex: 1, paddingVertical: 12, color: c.text, fontSize: 14 },
    primaryBtn: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    btnDisabled: { opacity: 0.4 },
    primaryBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#000000' },
    footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { fontSize: 13, color: c.textSecondary },
    footerLink: { fontSize: 13, color: c.accent, fontWeight: '700' as const },
  });
}
