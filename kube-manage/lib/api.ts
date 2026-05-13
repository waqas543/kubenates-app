import { Platform } from 'react-native';

// Basic backend URL detection; adjust host/port to match your Node service
const LOCALHOST =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

export const API_BASE_URL = LOCALHOST;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  console.log('request url', url);
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // ignore parse errors, will fall back to generic message
  }

  if (!res.ok) {
    const message = body?.error || body?.message || `Request failed with ${res.status}`;
    throw new Error(message);
  }

  return body as T;
}

export interface BackendConnection {
  id: string;
  name: string;
  server?: string;
  namespaces?: string[];
}

export async function createConnection(kubeconfig: string): Promise<BackendConnection> {
  return request<BackendConnection>('/connections', {
    method: 'POST',
    body: JSON.stringify({ kubeconfig }),
  });
}

export async function fetchNamespaces(id: string): Promise<{ namespaces: { name: string; status?: string; creationTimestamp?: string }[] }> {
  return request(`/connections/${id}/namespaces`);
}

export async function fetchPods(
  id: string,
  namespace?: string,
): Promise<{ pods: any[] }> {
  const query = namespace && namespace !== 'all' ? `?namespace=${encodeURIComponent(namespace)}` : '';
  return request(`/connections/${id}/pods${query}`);
}
