import { Linking } from 'react-native';
import { supabase } from './client';

// Registered as a URL scheme in both AndroidManifest.xml (intent-filter) and
// ios/*/Info.plist (CFBundleURLTypes) — Supabase redirects the system browser here
// once an OAuth provider finishes, and the OS hands it back to this app.
export const OAUTH_REDIRECT_URL = 'rork-app://auth-callback';

export type OAuthProvider = 'google' | 'linkedin_oidc';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// Opens the provider's consent screen in the system browser. There's no return value to await —
// the resulting session arrives later via the deep link handled by exchangeCodeFromUrl.
export async function signInWithOAuth(provider: OAuthProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: OAUTH_REDIRECT_URL, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error(`Supabase did not return an OAuth URL for provider "${provider}".`);
  await Linking.openURL(data.url);
}

// Call with the deep-link URL the OS delivers back to the app after the OAuth redirect.
// Returns null for URLs that aren't an OAuth callback (e.g. an unrelated deep link).
export async function exchangeCodeFromUrl(url: string) {
  if (!url.startsWith(OAUTH_REDIRECT_URL)) return null;

  const { searchParams } = new URL(url);
  const errorDescription = searchParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  const code = searchParams.get('code');
  if (!code) return null;

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data.session;
}
