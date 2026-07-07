import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';

// The Android emulator can't reach the host machine via 127.0.0.1/localhost —
// it needs the special 10.0.2.2 alias. Only applies to local Supabase (`supabase start`);
// hosted project URLs are unaffected. Same pattern as lib/api.ts's LOCALHOST handling.
function resolveSupabaseUrl(url: string): string {
  if (Platform.OS === 'android') {
    return url.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2');
  }
  return url;
}

export const supabase = createClient(resolveSupabaseUrl(SUPABASE_URL), SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No web-style OAuth redirect URL to parse — a deep link handler exchanges the code instead.
    detectSessionInUrl: false,
    // PKCE (not the default implicit flow) is required to exchange the OAuth deep-link code manually.
    flowType: 'pkce',
  },
});

// Supabase's token auto-refresh timer keeps running in the background otherwise;
// pause it while the app is backgrounded and resume when it's foregrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
