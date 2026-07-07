import createContextHook from '@nkzw/create-context-hook';
import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { OAuthProvider } from '@/lib/supabase';
import {
  exchangeCodeFromUrl,
  signInWithEmail,
  signInWithOAuth,
  signOut as signOutRequest,
  signUpWithEmail,
} from '@/lib/supabase';

export const [AuthContext, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      exchangeCodeFromUrl(url).catch((error) => console.error('[Auth] OAuth callback failed:', error));
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    // Covers the case where the OAuth redirect cold-starts the app (it was killed while
    // the user was in the browser) rather than resuming an already-running instance.
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      await signInWithEmail(email, password);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
      return await signUpWithEmail(email, password);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
  }, []);

  const signInWithProvider = useCallback(async (provider: OAuthProvider) => {
    setIsAuthenticating(true);
    try {
      await signInWithOAuth(provider);
    } finally {
      // The browser is now in control; isAuthenticating drops once the deep link resolves
      // the session (or the user cancels and returns without one).
      setIsAuthenticating(false);
    }
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    isLoading,
    isAuthenticating,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
  };
});
