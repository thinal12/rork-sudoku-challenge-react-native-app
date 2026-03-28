import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Grid3x3, Zap, Flame, Trophy, LogOut } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Difficulty } from '@/utils/sudoku';
import { useAuth } from '@/providers/AuthProvider';

const { width } = Dimensions.get('window');

type DifficultyOption = {
  level: Difficulty;
  title: string;
  description: string;
  icon: typeof Grid3x3;
  color: string;
  bgColor: string;
};

const difficulties: DifficultyOption[] = [
  {
    level: 'easy',
    title: 'Easy',
    description: '40 cells to fill',
    icon: Grid3x3,
    color: '#10b981',
    bgColor: '#d1fae5',
  },
  {
    level: 'medium',
    title: 'Medium',
    description: '50 cells to fill',
    icon: Zap,
    color: '#f59e0b',
    bgColor: '#fef3c7',
  },
  {
    level: 'hard',
    title: 'Hard',
    description: '60 cells to fill',
    icon: Flame,
    color: '#ef4444',
    bgColor: '#fee2e2',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isReady, logout, username } = useAuth();

  useEffect(() => {
    if (isReady && !user) {
      router.replace('/auth');
    }
  }, [isReady, user, router]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
    }
  }, []);

  if (!isReady || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const playSound = async () => {
    if (Platform.OS === 'web') {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.log('Error playing sound on web:', error);
      }
    } else {
     try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3' },
          { shouldPlay: false, volume: 0.6 }
        );

       await sound.playAsync();
      
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
          }
        });
      } catch (err) {
        console.log('Error playing sound:', err);
      }
    }
  };

  const handleDifficultySelect = async (difficulty: Difficulty) => {
    console.log('Difficulty selected:', difficulty);
    try {
      await playSound();
      console.log('Sound played successfully');
    } catch (error) {
      console.log('Sound error:', error);
    }
    console.log('Navigating to game...');
    router.push(`/game?difficulty=${difficulty}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.welcomeText}>Welcome, {username || 'Player'}!</Text>
          <View style={styles.topBarButtons}>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={() => router.push('/leaderboard')}
            >
              <Trophy size={20} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={logout}
            >
              <LogOut size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Sudoku</Text>
          <Text style={styles.subtitle}>Choose your difficulty level</Text>
        </View>

        <View style={styles.difficultyContainer}>
          {difficulties.map((diff) => {
            const Icon = diff.icon;
            return (
              <TouchableOpacity
                key={diff.level}
                style={[styles.difficultyCard, { borderColor: diff.color }]}
                onPress={() => handleDifficultySelect(diff.level)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: diff.bgColor }]}>
                  <Icon size={32} color={diff.color} />
                </View>
                <View style={styles.difficultyInfo}>
                  <Text style={[styles.difficultyTitle, { color: diff.color }]}>
                    {diff.title}
                  </Text>
                  <Text style={styles.difficultyDescription}>{diff.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Fill the 9×9 grid so that each row, column, and 3×3 box contains the digits 1-9
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  topBarButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  difficultyContainer: {
    gap: 16,
  },
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  difficultyInfo: {
    flex: 1,
  },
  difficultyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  difficultyDescription: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500' as const,
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: width - 80,
  },
});
