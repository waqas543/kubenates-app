import { useKubernetes } from '@/context/KubernetesContext';
import { ParsedKubeConfig, getNamespaces } from '@/lib/kubernetesClient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DocumentPicker from '@react-native-documents/picker';
import { FileText, Plus, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SetupScreen() {
  const [configText, setConfigText] = useState('');
  const { parseKubeconfig, saveConnection, isSaving } = useKubernetes();
  const navigation = useNavigation<NavProp>();

  const handleImportConfig = async () => {
    const connection = parseKubeconfig(configText);

    if (!connection) {
      Alert.alert('Error', 'Failed to parse kubeconfig. Please check the format.');
      return;
    }

    const parsedKubeConfig: ParsedKubeConfig = {
      server: connection.server,
      certificateAuthorityData: connection.caCertificate ?? '',
      clientCertificateData: connection.clientCertificate ?? '',
      clientKeyData: connection.clientKey ?? '',
      token: connection.token,
    };

    try {
      const res = await getNamespaces(parsedKubeConfig);

      if (!res.ok) {
        throw new Error(`Cluster access denied: ${res.status}`);
      }

      saveConnection(connection);
      setConfigText('');
      Alert.alert('Success', 'Cluster connection saved successfully', [
        { text: 'OK', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (error: any) {
      console.error('Failed to validate cluster access:', error);
      Alert.alert(
        'Connection failed',
        error?.message ||
          'We could parse the kubeconfig, but could not reach the cluster or your credentials were rejected.',
      );
    }
  };

  const handlePickFile = async () => {
    try {
      const [file] = await DocumentPicker.pick({
        type: [DocumentPicker.types.plainText, 'application/x-yaml', 'text/yaml'],
        allowMultiSelection: false,
      });
      const response = await fetch(file.uri);
      const text = await response.text();
      setConfigText(text);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      console.error('Error picking file:', err);
      Alert.alert('Error', 'Failed to read the file. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Upload size={32} color="#00D9FF" />
            </View>
            <Text style={styles.title}>Add Cluster Connection</Text>
            <Text style={styles.subtitle}>
              Paste your kubeconfig file content below to connect to your Kubernetes cluster
            </Text>
          </View>

          <View style={styles.methodsContainer}>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickFile}>
              <FileText size={20} color="#00D9FF" />
              <Text style={styles.uploadButtonText}>Upload YAML File</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Paste Kubeconfig YAML</Text>
            <TextInput
              style={styles.input}
              value={configText}
              onChangeText={setConfigText}
              placeholder={'apiVersion: v1\nkind: Config\nclusters:\n  - name: my-cluster\n    cluster:\n      server: https://...'}
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!configText || isSaving) && styles.buttonDisabled]}
            onPress={handleImportConfig}
            disabled={!configText || isSaving}
          >
            <Plus size={20} color="#000" />
            <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Add Connection'}</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Supported Authentication Methods:</Text>
            <Text style={styles.infoText}>• Token-based authentication</Text>
            <Text style={styles.infoText}>• Certificate-based authentication</Text>
            <Text style={styles.infoText}>• Cloud provider auth (AWS, GCP, Azure)</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#162033', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8B92A8', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 8 },
  input: { backgroundColor: '#162033', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minHeight: 280, borderWidth: 1, borderColor: '#1E2B42' },
  button: { backgroundColor: '#00D9FF', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  buttonDisabled: { backgroundColor: '#1E2B42', opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' as const, color: '#000000' },
  infoBox: { backgroundColor: '#162033', borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: '#00D9FF' },
  infoTitle: { fontSize: 14, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#8B92A8', marginBottom: 4 },
  methodsContainer: { marginBottom: 24 },
  uploadButton: { backgroundColor: '#162033', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: '#00D9FF', borderStyle: 'dashed' as const },
  uploadButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#00D9FF' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E2B42' },
  dividerText: { fontSize: 12, color: '#8B92A8', fontWeight: '600' as const },
});
