/** Keys for main shell tabs (SidebarLayout). */
export type ScreenKey =
  | 'dashboard'
  | 'pods' | 'deployments' | 'statefulsets' | 'daemonsets' | 'jobs' | 'cronjobs' | 'replicasets'
  | 'services' | 'ingresses' | 'networkpolicies'
  | 'persistentvolumes' | 'persistentvolumeclaims' | 'storageclasses'
  | 'configmaps' | 'secrets' | 'serviceaccounts'
  | 'nodes' | 'events'
  | 'settings';
