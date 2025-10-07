import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Lock, UserPlus, Mail, KeyRound, User2 } from 'lucide-react-native';

export default function AuthScreen() {
  const { signup, login, setUsername, isConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setLocalUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const TitleIcon = useMemo(() => (mode === 'signup' ? UserPlus : Lock), [mode]);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isConfigured) {
        setError('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
        return;
      }
      if (mode === 'signup') {
        await signup({ email, password, username });
        setUsername(username);
      } else {
        await login({ email, password });
      }
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <Stack.Screen options={{ title: mode === 'signup' ? 'Create account' : 'Sign in' }} />
      <View style={[styles.container, { paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom }]} testID="auth-screen">
        <View style={styles.artworkBg} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              {(() => { const I = TitleIcon; return <I size={28} color="#2563eb" />; })()}
            </View>
            <Text style={styles.title}>{mode === 'signup' ? 'Create an account' : 'Welcome back'}</Text>
          </View>
          <Text style={styles.subtitle}>{mode === 'signup' ? 'Join the Sudoku squad and track your best times' : 'Sign in to continue your Sudoku streak'}</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.inputRow}>
            <Mail size={18} color="#94a3b8" />
            <TextInput
              style={styles.input}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              testID="email-input"
            />
          </View>
          {mode === 'signup' && (
            <View style={styles.inputRow}>
              <User2 size={18} color="#94a3b8" />
              <TextInput
                style={styles.input}
                placeholder="Username"
                autoCapitalize="none"
                value={username}
                onChangeText={setLocalUsername}
                testID="username-input"
              />
            </View>
          )}
          <View style={styles.inputRow}>
            <KeyRound size={18} color="#94a3b8" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              testID="password-input"
            />
          </View>

          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segmentButton, mode === 'login' ? styles.segmentActive : undefined]}
              onPress={() => setMode('login')}
              testID="mode-login"
            >
              <Text style={[styles.segmentText, mode === 'login' ? styles.segmentTextActive : undefined]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, mode === 'signup' ? styles.segmentActive : undefined]}
              onPress={() => setMode('signup')}
              testID="mode-signup"
            >
              <Text style={[styles.segmentText, mode === 'signup' ? styles.segmentTextActive : undefined]}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading} testID="submit-auth">
            <Text style={styles.primaryButtonText}>{loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')} style={styles.switch} testID="switch-auth-mode">
            <Text style={styles.switchText}>
              {mode === 'signup' ? 'Already have an account? Sign in' : "Don’t have an account? Create one"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#eef2ff' },
  artworkBg: { position: 'absolute', top: -80, right: -60, width: 220, height: 220, backgroundColor: '#dbeafe', borderRadius: 200 },
  card: { marginTop: 40, backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 26, fontWeight: '800' as const, color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 16, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, height: 48 },
  input: { flex: 1, paddingLeft: 8, paddingVertical: 10 },
  segmented: { flexDirection: 'row', backgroundColor: '#eef2ff', padding: 4, borderRadius: 12, marginTop: 6, marginBottom: 12 },
  segmentButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: '#2563eb' },
  segmentText: { fontSize: 14, fontWeight: '700' as const, color: '#334155' },
  segmentTextActive: { color: '#ffffff' },
  primaryButton: { backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' as const },
  switch: { alignItems: 'center', marginTop: 12 },
  switchText: { color: '#2563eb', fontWeight: '700' as const },
  error: { color: '#ef4444', marginBottom: 8 },
});
