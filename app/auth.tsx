import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Lock, UserPlus, Mail, KeyRound, User2, Grid3X3, TimerReset } from 'lucide-react-native';

export default function AuthScreen() {
  const { signup, login, loginWithGoogle, setUsername, isConfigured } = useAuth();
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
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
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
        <View style={styles.brandWrap}>
          <View style={styles.brandIcon}>
            <Grid3X3 size={22} color="#1d4ed8" />
          </View>
          <Text style={styles.brandTitle}>Sudoku Arena</Text>
        </View>
        <View style={styles.gridDecor} pointerEvents="none" testID="sudoku-grid-decor">
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={`cell-${i}`} style={styles.gridCell} />
          ))}
          <View style={styles.gridBold} />
          <View style={[styles.gridBold, { transform: [{ rotate: '90deg' }] }]} />
          <View style={styles.numChipsRow}>
            {['1','2','3','4','5','6','7','8','9'].map((n) => (
              <View key={`chip-${n}`} style={styles.numChip}>
                <Text style={styles.numChipText}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={async () => {
              setLoading(true);
              setError(null);
              try {
                await loginWithGoogle();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              } catch (e: any) {
                setError(e?.message ?? 'Google sign-in failed');
              } finally {
                setLoading(false);
              }
            }} 
            disabled={loading}
            testID="google-signin"
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.footerMeta}>
            <View style={styles.footerMetaItem}>
              <TimerReset size={16} color="#64748b" />
              <Text style={styles.footerMetaText}>Track PBs by difficulty</Text>
            </View>
          </View>

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
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 as unknown as number, marginTop: 8 },
  brandIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  brandTitle: { marginLeft: 10, fontSize: 20, fontWeight: '800' as const, color: '#1e293b' },
  gridDecor: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  gridCell: { position: 'absolute', width: '30%', height: '30%', borderColor: '#c7d2fe', borderWidth: 1 },
  gridBold: { position: 'absolute', left: '33.33%', right: '33.33%', top: 20, bottom: 20, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#93c5fd' },
  numChipsRow: { position: 'absolute', bottom: 10, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  numChip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  numChipText: { color: '#1f2937', fontWeight: '700' as const },
  card: { marginTop: 120, backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
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
  footerMeta: { marginTop: 12, flexDirection: 'row', justifyContent: 'center' },
  footerMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 as unknown as number },
  footerMetaText: { marginLeft: 6, color: '#64748b', fontSize: 12, fontWeight: '700' as const },
  switch: { alignItems: 'center', marginTop: 12 },
  switchText: { color: '#2563eb', fontWeight: '700' as const },
  error: { color: '#ef4444', marginBottom: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: '#94a3b8', fontSize: 12, fontWeight: '600' as const },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', paddingVertical: 12, borderRadius: 12, gap: 10 as unknown as number },
  googleIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#4285f4', alignItems: 'center', justifyContent: 'center' },
  googleIconText: { color: '#ffffff', fontWeight: '800' as const, fontSize: 12 },
  googleButtonText: { color: '#1f2937', fontWeight: '700' as const, fontSize: 15 },
});
