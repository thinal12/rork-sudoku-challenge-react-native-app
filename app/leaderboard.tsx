import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import type { Difficulty } from '@/utils/sudoku';
import { useTop10, useUserBest, useUserRank } from '@/services/leaderboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Difficulty>('easy');
  const top10 = useTop10(tab);
  const best = useUserBest(tab);
  const rank = useUserRank(tab);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <ErrorBoundary>
      <Stack.Screen options={{ title: 'Leaderboard' }} />
      <View style={[styles.container, { paddingBottom: Platform.OS === 'web' ? 12 : Math.max(12, insets.bottom) }]} testID="leaderboard-screen">
        <View style={styles.tabs}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity key={d} onPress={() => setTab(d)} style={[styles.tab, tab === d && styles.tabActive]} testID={`tab-${d}`}>
              <Text style={[styles.tabText, tab === d && styles.tabTextActive]}>{d.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top 10</Text>
            {top10.isLoading && <Text style={styles.muted}>Loading…</Text>}
            {top10.error && <Text style={styles.error}>Failed to load</Text>}
            {!top10.isLoading && !top10.error && (
              <View>
                {top10.data?.map((row, i) => (
                  <View key={row.id} style={styles.row} testID={`row-${i}`}>
                    <Text style={styles.rank}>{i + 1}</Text>
                    <Text style={styles.username}>{row.username}</Text>
                    <Text style={styles.time}>{formatTime(row.fastest_time)}</Text>
                  </View>
                ))}
                {(!top10.data || top10.data.length === 0) && (
                  <Text style={styles.muted}>No entries yet</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your stats</Text>
            {!user ? (
              <Text style={styles.muted}>Sign in to track your best times.</Text>
            ) : (
              <View>
                {best.isLoading || rank.isLoading ? (
                  <Text style={styles.muted}>Loading…</Text>
                ) : (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.item}>Best time: {best.data ? formatTime(best.data.fastest_time) : '-'}</Text>
                    <Text style={styles.item}>Rank: {rank.data ? `#${rank.data.rank}` : '-'}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  tab: { flex: 1, backgroundColor: '#fff', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  tabActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabText: { color: '#2563eb', fontWeight: '700' as const },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 18, fontWeight: '800' as const, color: '#111827', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rank: { width: 28, textAlign: 'center', fontWeight: '800' as const, color: '#111827' },
  username: { flex: 1, color: '#111827' },
  time: { fontWeight: '700' as const, color: '#111827' },
  muted: { color: '#6b7280' },
  item: { color: '#111827', fontWeight: '600' as const },
  error: { color: '#ef4444' },
});
