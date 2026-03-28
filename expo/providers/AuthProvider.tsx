import React, { useCallback, useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export type AuthUser = {
  id: string;
  email: string;
};

export type Session = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer' | string;
  expires_in?: number;
  expires_at?: number;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

async function supabaseAuthFetch(path: string, init?: RequestInit) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase credentials');
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return res.json();
}

export type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  username: string;
  isReady: boolean;
  signup: (params: { email: string; password: string; username: string }) => Promise<{ status: 'email_confirmation_sent' | 'signed_in'; user?: AuthUser }>;
  login: (params: { email: string; password: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUsername: (name: string) => void;
  isConfigured: boolean;
};

const STORAGE_KEYS = {
  session: 'sb_session',
  username: 'username',
} as const;

export const [AuthProvider, useAuth] = createContextHook<AuthContextValue>(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsernameState] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);

  const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  useEffect(() => {
    const load = async () => {
      try {
        const [rawSession, storedUsername] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.session),
          AsyncStorage.getItem(STORAGE_KEYS.username),
        ]);
        if (storedUsername) setUsernameState(storedUsername);
        if (rawSession) {
          const s: Session & { user: AuthUser } = JSON.parse(rawSession);
          setSession(s);
          setUser(s.user ?? null);
        }
      } catch (e) {
        console.log('Auth load error', e);
      } finally {
        setIsReady(true);
      }
    };
    load();
  }, []);

  const persistSession = useCallback(async (s: Session, u: AuthUser) => {
    const toStore = JSON.stringify({ ...s, user: u });
    await AsyncStorage.setItem(STORAGE_KEYS.session, toStore);
  }, []);

  const signup = useCallback(async ({ email, password, username }: { email: string; password: string; username: string }) => {
    if (!isConfigured) throw new Error('Supabase not configured');
    const data = await supabaseAuthFetch('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUsernameState(username);
    await AsyncStorage.setItem(STORAGE_KEYS.username, username);

    const hasSession = Boolean(data?.access_token && data?.refresh_token && data?.user);
    const hasUser = Boolean(data?.user);

    if (hasSession && hasUser) {
      const newUser: AuthUser = { id: data.user.id, email: data.user.email };
      const newSession: Session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
      };
      setUser(newUser);
      setSession(newSession);
      await persistSession(newSession, newUser);
      return { status: 'signed_in', user: newUser } as const;
    }

    if (hasUser || data) {
      return { status: 'email_confirmation_sent', user: hasUser ? { id: data.user.id, email: data.user.email } : undefined } as const;
    }

    throw new Error('Signup failed');
  }, [isConfigured, persistSession]);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    if (!isConfigured) throw new Error('Supabase not configured');
    const data = await supabaseAuthFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!data?.user || !data?.access_token) {
      throw new Error('Login failed');
    }
    const newUser: AuthUser = { id: data.user.id, email: data.user.email };
    const newSession: Session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    };
    setUser(newUser);
    setSession(newSession);
    await persistSession(newSession, newUser);
  }, [isConfigured, persistSession]);

  const logout = useCallback(async () => {
    try {
      if (session) {
        await supabaseAuthFetch('/auth/v1/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch (e) {
      console.log('Logout error', e);
    } finally {
      setUser(null);
      setSession(null);
      await AsyncStorage.removeItem(STORAGE_KEYS.session);
    }
  }, [session]);

  const setUsername = useCallback((name: string) => {
    setUsernameState(name);
    AsyncStorage.setItem(STORAGE_KEYS.username, name).catch(() => {});
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!isConfigured) throw new Error('Supabase not configured');
    
    const redirectUrl = Linking.createURL('/auth');
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
    
    console.log('Opening Google OAuth:', authUrl);
    
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        const expiresIn = url.searchParams.get('expires_in');
        
        if (accessToken && refreshToken) {
          const userRes = await supabaseAuthFetch('/auth/v1/user', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          const newUser: AuthUser = { id: userRes.id, email: userRes.email };
          const newSession: Session = {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'bearer',
            expires_in: expiresIn ? parseInt(expiresIn) : undefined,
          };
          
          setUser(newUser);
          setSession(newSession);
          await persistSession(newSession, newUser);
          
          const displayName = userRes.user_metadata?.full_name || userRes.email?.split('@')[0] || 'User';
          setUsernameState(displayName);
          await AsyncStorage.setItem(STORAGE_KEYS.username, displayName);
        }
      }
    }
  }, [isConfigured, persistSession]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleRedirect = async () => {
        const url = window.location.href;
        if (url.includes('access_token')) {
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get('access_token') || urlObj.hash.match(/access_token=([^&]+)/)?.[1];
          const refreshToken = urlObj.searchParams.get('refresh_token') || urlObj.hash.match(/refresh_token=([^&]+)/)?.[1];
          const expiresIn = urlObj.searchParams.get('expires_in') || urlObj.hash.match(/expires_in=([^&]+)/)?.[1];
          
          if (accessToken && refreshToken) {
            try {
              const userRes = await supabaseAuthFetch('/auth/v1/user', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              
              const newUser: AuthUser = { id: userRes.id, email: userRes.email };
              const newSession: Session = {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'bearer',
                expires_in: expiresIn ? parseInt(expiresIn) : undefined,
              };
              
              setUser(newUser);
              setSession(newSession);
              await persistSession(newSession, newUser);
              
              const displayName = userRes.user_metadata?.full_name || userRes.email?.split('@')[0] || 'User';
              setUsernameState(displayName);
              await AsyncStorage.setItem(STORAGE_KEYS.username, displayName);
              
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
              console.error('Error handling OAuth redirect:', e);
            }
          }
        }
      };
      handleRedirect();
    }
  }, [persistSession]);

  return {
    user,
    session,
    username,
    isReady,
    signup,
    login,
    loginWithGoogle,
    logout,
    setUsername,
    isConfigured,
  };
});
