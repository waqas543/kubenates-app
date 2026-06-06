export interface KubeConfig {
  apiVersion: string;
  kind: string;
  clusters: {
    name: string;
    cluster: kubeConfigCluster;
  }[]
  contexts: kubeConfigContexts[];
  'current-context': string;
  users: kubeConfigUsers[];
}

export type kubeConfigCluster = {
  name: string;
  server: string;
  'certificate-authority-data'?: string;
}

export type kubeConfigContexts = {
  name: string;
  context: {
    cluster: string;
    user: string;
    namespace?: string;
  };
};

export type kubeConfigExec = {
  apiVersion: string;
  command: string;
  args?: string[];
};

export type kubeConfigUsers = {
  name: string;
  user: {
    token?: string;
    'client-certificate-data'?: string;
    'client-key-data'?: string;
    exec?: kubeConfigExec;
  };
}

export interface EksConnectionConfig {
  clusterName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface ClusterConnection {
  name: string;
  server: string;
  namespace: string;
  token?: string;
  rawConfig?: string;
  caCertificate?: string;
  clientCertificate?: string;
  clientKey?: string;
  /** Discriminates between kubeconfig and EKS IAM connections */
  connectionType?: 'kubeconfig' | 'eks';
  /** Present only when connectionType === 'eks' */
  eks?: EksConnectionConfig;
}

export type PodStatus = 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown';

export interface Pod {
  name: string;
  namespace: string;
  status: PodStatus;
  ready: string;
  restarts: number;
  age: string;
  node?: string;
}

export interface Deployment {
  name: string;
  namespace: string;
  ready: string;
  upToDate: number;
  available: number;
  age: string;
}

export interface Service {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP?: string;
  ports: string;
  age: string;
}

export interface Node {
  name: string;
  status: 'Ready' | 'NotReady';
  roles: string;
  age: string;
  version: string;
}

export interface Namespace {
  name: string;
  status: 'Active' | 'Terminating';
  age: string;
}

export interface StatefulSet {
  name: string;
  namespace: string;
  ready: string;
  age: string;
}

export interface Ingress {
  name: string;
  namespace: string;
  className: string;
  hosts: string;
  address?: string;
  age: string;
}

export interface Secret {
  name: string;
  namespace: string;
  type: string;
  data: number;
  age: string;
}

export interface ConfigMap {
  name: string;
  namespace: string;
  data: number;
  age: string;
}

export interface NetworkPolicy {
  name: string;
  namespace: string;
  podSelector: string;
  age: string;
}

export interface PersistentVolume {
  name: string;
  capacity: string;
  accessModes: string;
  reclaimPolicy: string;
  status: string;
  age: string;
}

export interface PersistentVolumeClaim {
  name: string;
  namespace: string;
  status: string;
  volume: string;
  capacity: string;
  accessModes: string;
  age: string;
}

export interface Event {
  type: 'Normal' | 'Warning' | 'Error';
  reason: string;
  message: string;
  source: string;
  count: number;
  age: string;
  lastSeen: string;
}

export interface PodDetails extends Pod {
  ip?: string;
  qosClass: string;
  containers: {
    name: string;
    image: string;
    ready: boolean;
    restartCount: number;
    env?: { name: string; value: string }[];
  }[];
  conditions: {
    type: string;
    status: string;
    lastTransitionTime: string;
  }[];
  metrics?: {
    cpu: string;
    memory: string;
  };
  events: Event[];
}

export interface ResourceDetails {
  name: string;
  namespace: string;
  type: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  events: Event[];
}

export interface DeploymentDetails extends Deployment {
  replicas: number;
  selector: string;
  strategy: string;
  events: Event[];
}

export interface StatefulSetDetails extends StatefulSet {
  replicas: number;
  selector: string;
  serviceName: string;
  events: Event[];
}

export interface DaemonSet {
  name: string;
  namespace: string;
  desired: number;
  current: number;
  ready: number;
  upToDate: number;
  available: number;
  age: string;
}

export interface Job {
  name: string;
  namespace: string;
  completions: string;
  duration: string;
  age: string;
  status: 'Complete' | 'Failed' | 'Active';
}

export interface CronJob {
  name: string;
  namespace: string;
  schedule: string;
  lastSchedule: string;
  active: number;
  age: string;
  suspended: boolean;
}

export interface ReplicaSet {
  name: string;
  namespace: string;
  desired: number;
  current: number;
  ready: number;
  age: string;
}

export interface StorageClass {
  name: string;
  provisioner: string;
  reclaimPolicy: string;
  volumeBindingMode: string;
  allowVolumeExpansion: boolean;
  age: string;
}

export interface ServiceAccount {
  name: string;
  namespace: string;
  secrets: number;
  age: string;
}
