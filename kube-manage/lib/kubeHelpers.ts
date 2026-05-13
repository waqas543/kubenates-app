import type { ClusterConnection } from '@/types/kubernetes';
import type { ParsedKubeConfig } from '@/lib/kubernetesClient';

export function toParsedConfig(conn: ClusterConnection): ParsedKubeConfig {
  return {
    server: conn.server,
    certificateAuthorityData: conn.caCertificate ?? '',
    clientCertificateData: conn.clientCertificate ?? '',
    clientKeyData: conn.clientKey ?? '',
    token: conn.token,
  };
}

export function toAge(createdAt?: string | null): string {
  if (!createdAt) return '-';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const d = Math.floor(diffMs / 86400000);
  if (d > 0) return `${d}d`;
  const h = Math.floor(diffMs / 3600000);
  if (h > 0) return `${h}h`;
  const m = Math.floor(diffMs / 60000);
  if (m > 0) return `${m}m`;
  return `${Math.floor(diffMs / 1000)}s`;
}

/** CPU quantity → millicores (e.g. "1", "250m", "100n"). */
export function parseCpuToMillicores(quantity?: string): number {
  if (!quantity) return 0;
  const q = String(quantity).trim();
  if (q.endsWith('n')) return Math.floor(parseInt(q.slice(0, -1), 10) / 1_000_000);
  if (q.endsWith('u')) return Math.floor(parseInt(q.slice(0, -1), 10) / 1000);
  if (q.endsWith('m')) return parseInt(q.slice(0, -1), 10) || 0;
  const cores = parseFloat(q);
  return Number.isFinite(cores) ? Math.round(cores * 1000) : 0;
}

/** Memory / storage quantity → bytes (Ki, Mi, Gi, Ti binary; K, M, G decimal). */
export function parseQuantityToBytes(quantity?: string): number {
  if (!quantity) return 0;
  const q = String(quantity).trim();
  const binary: [string, number][] = [
    ['Ki', 1024],
    ['Mi', 1024 ** 2],
    ['Gi', 1024 ** 3],
    ['Ti', 1024 ** 4],
    ['Pi', 1024 ** 5],
  ];
  for (const [suffix, mult] of binary) {
    if (q.endsWith(suffix)) {
      const n = parseFloat(q.slice(0, -suffix.length));
      return Number.isFinite(n) ? n * mult : 0;
    }
  }
  const decimal: [string, number][] = [
    ['k', 1000],
    ['M', 1000 ** 2],
    ['G', 1000 ** 3],
    ['T', 1000 ** 4],
  ];
  for (const [suffix, mult] of decimal) {
    if (q.endsWith(suffix)) {
      const n = parseFloat(q.slice(0, -suffix.length));
      return Number.isFinite(n) ? n * mult : 0;
    }
  }
  const n = parseFloat(q);
  return Number.isFinite(n) ? n : 0;
}

export function formatMillicores(m: number): string {
  if (m >= 1000) {
    const c = m / 1000;
    return `${c % 1 === 0 ? c.toFixed(0) : c.toFixed(2)} cores`;
  }
  return `${m}m`;
}

export function formatBytesBin(b: number): string {
  if (b <= 0 || !Number.isFinite(b)) return '0 B';
  const u = ['KiB', 'MiB', 'GiB', 'TiB'];
  let v = b;
  let i = -1;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  if (i < 0) return `${Math.round(b)} B`;
  return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)} ${u[i]}`;
}

/** Pretty-print raw Kubernetes quantity for display. */
export function formatK8sQuantity(kind: 'cpu' | 'memory', raw?: string): string {
  if (!raw) return '-';
  if (kind === 'cpu') return formatMillicores(parseCpuToMillicores(raw));
  const bytes = parseQuantityToBytes(raw);
  return bytes > 0 ? formatBytesBin(bytes) : raw;
}
