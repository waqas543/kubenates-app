import { useKubernetes } from '@/context/KubernetesContext';
import { generateEksToken } from '@/lib/eksAuth';
import type { ParsedKubeConfig } from '@/lib/kubernetesClient';
import { getNamespaces } from '@/lib/kubernetesClient';
import type { ClusterConnection } from '@/types/kubernetes';
import { useTheme } from '@/context/ThemeContext';
import type { AppColors } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { pick as pickDocument, types as pickerTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { Cloud, FileText, Plus, Upload } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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
type Tab = 'kubeconfig' | 'eks';

export default function SetupScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('kubeconfig');
  const [configText, setConfigText] = useState('');
  const [eksName, setEksName] = useState('');
  const [eksClusterName, setEksClusterName] = useState('');
  const [eksEndpoint, setEksEndpoint] = useState('');
  const [eksCaCert, setEksCaCert] = useState('');
  const [eksRegion, setEksRegion] = useState('');
  const [eksAccessKeyId, setEksAccessKeyId] = useState('');
  const [eksSecretKey, setEksSecretKey] = useState('');
  const [eksSessionToken, setEksSessionToken] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const { parseKubeconfig, saveConnection, isSaving } = useKubernetes();
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePickFile = async () => {
    try {
      const [file] = await pickDocument({
        type: [pickerTypes.plainText, 'application/x-yaml', 'text/yaml'],
        allowMultiSelection: false,
      });
      const response = await fetch(file.uri);
      const text = await response.text();
      setConfigText(text);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Failed to read the file. Please try again.');
    }
  };

  const handleImportKubeconfig = async () => {
    const connection = parseKubeconfig(configText);
    if (!connection) {
      Alert.alert('Error', 'Failed to parse kubeconfig. Please check the format.');
      return;
    }
    if (connection.connectionType === 'eks' && connection.eks) {
      setEksName(connection.name);
      setEksClusterName(connection.eks.clusterName);
      setEksRegion(connection.eks.region);
      setEksEndpoint(connection.server);
      setEksCaCert(connection.caCertificate ?? '');
      setConfigText('');
      setActiveTab('eks');
      Alert.alert('EKS Cluster Detected', 'Cluster details have been filled in from your kubeconfig.\n\nPlease enter your AWS Access Key ID and Secret Access Key to complete the connection.');
      return;
    }
    const parsedConfig: ParsedKubeConfig = {
      server: connection.server,
      certificateAuthorityData: connection.caCertificate ?? '',
      clientCertificateData: connection.clientCertificate ?? '',
      clientKeyData: connection.clientKey ?? '',
      token: connection.token,
    };
    setIsBusy(true);
    try {
      const res = await getNamespaces(parsedConfig);
      if (!res.ok) throw new Error(`Cluster access denied: ${res.status}`);
      saveConnection(connection);
      setConfigText('');
      Alert.alert('Success', 'Cluster connection saved successfully', [{ text: 'OK', onPress: () => navigation.navigate('Main') }]);
    } catch (error: any) {
      Alert.alert('Connection Failed', error?.message ?? 'Could not reach the cluster or credentials were rejected.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConnectEks = async () => {
    if (!eksName.trim()) { Alert.alert('Validation', 'Connection name is required.'); return; }
    if (!eksClusterName.trim()) { Alert.alert('Validation', 'EKS Cluster Name is required.'); return; }
    if (!eksEndpoint.trim()) { Alert.alert('Validation', 'Cluster Endpoint is required.'); return; }
    if (!eksCaCert.trim()) { Alert.alert('Validation', 'CA Certificate is required.'); return; }
    if (!eksRegion.trim()) { Alert.alert('Validation', 'AWS Region is required.'); return; }
    if (!eksAccessKeyId.trim()) { Alert.alert('Validation', 'Access Key ID is required.'); return; }
    if (!eksSecretKey.trim()) { Alert.alert('Validation', 'Secret Access Key is required.'); return; }

    setIsBusy(true);
    try {
      const eksCreds = {
        clusterName: eksClusterName.trim(),
        region: eksRegion.trim(),
        accessKeyId: eksAccessKeyId.trim(),
        secretAccessKey: eksSecretKey.trim(),
        sessionToken: eksSessionToken.trim() || undefined,
      };
      const testToken = await generateEksToken(eksCreds);
      const parsedConfig: ParsedKubeConfig = {
        server: eksEndpoint.trim(),
        certificateAuthorityData: eksCaCert.trim(),
        clientCertificateData: '',
        clientKeyData: '',
        token: testToken,
      };
      const res = await getNamespaces(parsedConfig);
      if (!res.ok) throw new Error(`Cluster access denied: ${res.status}`);
      const connection: ClusterConnection = {
        name: eksName.trim(),
        server: eksEndpoint.trim(),
        namespace: 'default',
        caCertificate: eksCaCert.trim(),
        connectionType: 'eks',
        eks: eksCreds,
      };
      saveConnection(connection);
      Alert.alert('Success', 'EKS cluster connected successfully', [{ text: 'OK', onPress: () => navigation.navigate('Main') }]);
    } catch (error: any) {
      const msg: string = error?.message ?? '';
      let detail = msg;
      if (msg.includes('401')) {
        detail = 'Authentication failed (401). Common causes:\n\n• EKS Cluster Name does not exactly match your cluster\n• Access Key ID or Secret Key is wrong\n• IAM identity is not in the aws-auth ConfigMap or EKS Access Entries\n\nCheck Metro console for the generated presigned URL.';
      } else if (msg.includes('403')) {
        detail = 'Access denied (403). The IAM identity is authenticated but not authorized. Add it to the aws-auth ConfigMap.';
      }
      Alert.alert('Connection Failed', detail || 'Could not connect to the EKS cluster. Check your credentials and endpoint.');
    } finally {
      setIsBusy(false);
    }
  };

  const loading = isBusy || isSaving;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, activeTab === 'kubeconfig' && styles.tabActive]} onPress={() => setActiveTab('kubeconfig')}>
            <Upload size={16} color={activeTab === 'kubeconfig' ? colors.accent : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'kubeconfig' && styles.tabTextActive]}>Kubeconfig</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'eks' && styles.tabActiveEks]} onPress={() => setActiveTab('eks')}>
            <Cloud size={16} color={activeTab === 'eks' ? '#FF9F43' : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'eks' && styles.tabTextActiveEks]}>Amazon EKS</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {activeTab === 'kubeconfig' ? (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.iconContainer}>
                  <Upload size={28} color={colors.accent} />
                </View>
                <Text style={styles.title}>Add Cluster via Kubeconfig</Text>
                <Text style={styles.subtitle}>Paste your kubeconfig YAML or upload the file to connect to a self-managed cluster.</Text>
              </View>

              <TouchableOpacity style={styles.uploadButton} onPress={handlePickFile}>
                <FileText size={20} color={colors.accent} />
                <Text style={styles.uploadButtonText}>Upload YAML File</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Paste Kubeconfig YAML</Text>
                <TextInput
                  style={styles.textArea}
                  value={configText}
                  onChangeText={setConfigText}
                  placeholder={'apiVersion: v1\nkind: Config\nclusters:\n  - name: my-cluster\n    cluster:\n      server: https://...'}
                  placeholderTextColor={colors.placeholder}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryBtnBlue, (!configText || loading) && styles.btnDisabled]}
                onPress={handleImportKubeconfig}
                disabled={!configText || loading}
              >
                <Plus size={18} color="#000" />
                <Text style={styles.primaryBtnText}>{loading ? 'Connecting...' : 'Add Connection'}</Text>
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Supported Auth Methods</Text>
                <Text style={styles.infoText}>• Token-based authentication</Text>
                <Text style={styles.infoText}>• Certificate-based authentication</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, styles.iconContainerEks]}>
                  <Cloud size={28} color="#FF9F43" />
                </View>
                <Text style={styles.title}>Connect Amazon EKS</Text>
                <Text style={styles.subtitle}>Enter your AWS credentials and cluster details. Tokens are generated automatically using AWS SigV4.</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Connection Name</Text>
                <TextInput style={styles.input} value={eksName} onChangeText={setEksName} placeholder="e.g. production-eks" placeholderTextColor={colors.placeholder} autoCapitalize="none" />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>AWS Region</Text>
                  <TextInput style={styles.input} value={eksRegion} onChangeText={setEksRegion} placeholder="us-east-1" placeholderTextColor={colors.placeholder} autoCapitalize="none" />
                </View>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>EKS Cluster Name</Text>
                  <TextInput style={styles.input} value={eksClusterName} onChangeText={setEksClusterName} placeholder="my-cluster" placeholderTextColor={colors.placeholder} autoCapitalize="none" />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cluster Endpoint</Text>
                <TextInput style={styles.input} value={eksEndpoint} onChangeText={setEksEndpoint} placeholder="https://XXXXX.gr7.us-east-1.eks.amazonaws.com" placeholderTextColor={colors.placeholder} autoCapitalize="none" keyboardType="url" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CA Certificate (Base64)</Text>
                <TextInput style={styles.textAreaSmall} value={eksCaCert} onChangeText={setEksCaCert} placeholder="LS0tLS1CRUdJTi..." placeholderTextColor={colors.placeholder} multiline textAlignVertical="top" autoCapitalize="none" />
                <Text style={styles.hint}>Found under clusters[].cluster.certificate-authority-data in your kubeconfig</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Access Key ID</Text>
                <TextInput style={styles.input} value={eksAccessKeyId} onChangeText={setEksAccessKeyId} placeholder="AKIAIOSFODNN7EXAMPLE" placeholderTextColor={colors.placeholder} autoCapitalize="none" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Secret Access Key</Text>
                <TextInput style={styles.input} value={eksSecretKey} onChangeText={setEksSecretKey} placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" placeholderTextColor={colors.placeholder} autoCapitalize="none" secureTextEntry />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Session Token{' '}
                  <Text style={styles.optional}>(optional — for temporary credentials)</Text>
                </Text>
                <TextInput style={styles.input} value={eksSessionToken} onChangeText={setEksSessionToken} placeholder="AQoXnyc4lcB..." placeholderTextColor={colors.placeholder} autoCapitalize="none" secureTextEntry />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryBtnEks, loading && styles.btnDisabled]}
                onPress={handleConnectEks}
                disabled={loading}
              >
                <Cloud size={18} color="#000" />
                <Text style={styles.primaryBtnText}>{loading ? 'Connecting...' : 'Connect EKS Cluster'}</Text>
              </TouchableOpacity>

              <View style={[styles.infoBox, styles.infoBoxEks]}>
                <Text style={styles.infoTitle}>How EKS auth works</Text>
                <Text style={styles.infoText}>• A SigV4 presigned STS token is generated per request</Text>
                <Text style={styles.infoText}>• Tokens expire after 60 s; the app renews them automatically</Text>
                <Text style={styles.infoText}>• Credentials are stored locally on the device</Text>
                <Text style={styles.infoText}>• IAM role must be mapped in aws-auth ConfigMap</Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    keyboardView: { flex: 1 },
    tabBar: { flexDirection: 'row', backgroundColor: c.bgSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: c.accent },
    tabActiveEks: { borderBottomWidth: 2, borderBottomColor: '#FF9F43' },
    tabText: { fontSize: 14, fontWeight: '600' as const, color: c.textSecondary },
    tabTextActive: { color: c.accent },
    tabTextActiveEks: { color: '#FF9F43' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionHeader: { alignItems: 'center', marginBottom: 24 },
    iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: `${c.accent}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1, borderColor: `${c.accent}30` },
    iconContainerEks: { backgroundColor: '#FF9F4315', borderColor: '#FF9F4330' },
    title: { fontSize: 22, fontWeight: '700' as const, color: c.text, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
    inputGroup: { marginBottom: 16 },
    row: { flexDirection: 'row', gap: 12 },
    flex1: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600' as const, color: c.text, marginBottom: 6 },
    optional: { fontSize: 12, color: c.textSecondary, fontWeight: '400' as const },
    hint: { fontSize: 11, color: c.textSecondary, marginTop: 5 },
    input: { backgroundColor: c.bgCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 14, borderWidth: 1, borderColor: c.border },
    textArea: { backgroundColor: c.bgCard, borderRadius: 10, padding: 14, color: c.text, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minHeight: 220, borderWidth: 1, borderColor: c.border },
    textAreaSmall: { backgroundColor: c.bgCard, borderRadius: 10, padding: 14, color: c.text, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minHeight: 80, borderWidth: 1, borderColor: c.border },
    uploadButton: { backgroundColor: c.bgCard, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: c.accent, borderStyle: 'dashed' as const, marginBottom: 8 },
    uploadButtonText: { fontSize: 15, fontWeight: '600' as const, color: c.accent },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
    dividerText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' as const },
    primaryBtn: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, marginTop: 4 },
    primaryBtnBlue: { backgroundColor: c.accent },
    primaryBtnEks: { backgroundColor: '#FF9F43' },
    btnDisabled: { opacity: 0.4 },
    primaryBtnText: { fontSize: 16, fontWeight: '700' as const, color: '#000000' },
    infoBox: { backgroundColor: c.bgCard, borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: c.accent },
    infoBoxEks: { borderLeftColor: '#FF9F43' },
    infoTitle: { fontSize: 13, fontWeight: '700' as const, color: c.text, marginBottom: 8 },
    infoText: { fontSize: 12, color: c.textSecondary, marginBottom: 4, lineHeight: 18 },
  });
}
