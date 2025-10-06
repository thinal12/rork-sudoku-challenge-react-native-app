import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AuthScreen() {
  const { signup, login, setUsername, isConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setLocalUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
      <View style={[styles.container, { paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom }] } testID="auth-screen">
        <Text style={styles.title}>{mode === 'signup' ? 'Create an account' : 'Welcome back'}</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="email-input"
        />
        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            autoCapitalize="none"
            value={username}
            onChangeText={setLocalUsername}
            testID="username-input"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="password-input"
        />

        <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={loading} testID="submit-auth">
          <Text style={styles.primaryButtonText}>{loading ? 'Please wait…' : mode === 'signup' ? 'Sign up' : 'Sign in'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')} style={styles.switch} testID="switch-auth-mode">
          <Text style={styles.switchText}>
            {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </Text>
        </TouchableOpacity>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: '800' as const, color: '#111827', marginBottom: 16 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  primaryButton: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' as const },
  switch: { alignItems: 'center', marginTop: 16 },
  switchText: { color: '#2563eb', fontWeight: '600' as const },
  error: { color: '#ef4444', marginBottom: 8 },
});
