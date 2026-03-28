import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Eraser, RotateCcw, Edit3, Trophy } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  generatePuzzle,
  isBoardComplete,
  hasConflict,
  type Board,
  type Difficulty,
} from '@/utils/sudoku';
import { useSubmitTime } from '@/services/leaderboard';
import { useAuth } from '@/providers/AuthProvider';

const { width } = Dimensions.get('window');
const GRID_SIZE = Math.min(width - 40, 380);
const CELL_SIZE = Math.floor(GRID_SIZE / 9);

export default function GameScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const difficulty = (params.difficulty as Difficulty) || 'easy';

  const [board, setBoard] = useState<Board>(() => generatePuzzle(difficulty));
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const { user } = useAuth();
  const submit = useSubmitTime();

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isComplete) {
        setTimer((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isComplete]);

  useEffect(() => {
    if (isBoardComplete(board)) {
      setIsComplete(true);
    }
  }, [board]);

  useEffect(() => {
    if (isComplete) {
      if (!user) {
        Alert.alert('Puzzle complete!', 'Sign in to save your time to the leaderboard.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/auth') },
        ]);
        return;
      }
      submit.mutate({ difficulty, timeSeconds: timer }, {
        onSuccess: () => {
          Alert.alert('Time saved', 'Your best time has been updated.');
        },
        onError: (e: any) => {
          Alert.alert('Could not save time', e?.message ?? 'Unknown error');
        },
      });
    }
  }, [isComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCellPress = (row: number, col: number) => {
    if (board[row][col].isGiven) return;
    setSelectedCell({ row, col });
  };

  const handleNumberPress = (num: number) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    if (board[row][col].isGiven) return;

    const newBoard = board.map((r, i) =>
      r.map((cell, j) => {
        if (i === row && j === col) {
          if (notesMode) {
            const notes = cell.notes.includes(num)
              ? cell.notes.filter((n) => n !== num)
              : [...cell.notes, num].sort();
            return { ...cell, notes };
          } else {
            return { ...cell, value: num, notes: [] };
          }
        }
        return cell;
      })
    );

    setBoard(newBoard);
  };

  const handleErase = () => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    if (board[row][col].isGiven) return;

    const newBoard = board.map((r, i) =>
      r.map((cell, j) => {
        if (i === row && j === col) {
          return { ...cell, value: 0, notes: [] };
        }
        return cell;
      })
    );

    setBoard(newBoard);
  };

  const handleNewGame = () => {
    setBoard(generatePuzzle(difficulty));
    setSelectedCell(null);
    setNotesMode(false);
    setTimer(0);
    setIsComplete(false);
  };

  const isHighlighted = (row: number, col: number) => {
    if (!selectedCell) return false;
    const { row: selRow, col: selCol } = selectedCell;

    if (row === selRow && col === selCol) return false;

    if (row === selRow || col === selCol) return true;

    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    const selBoxRow = Math.floor(selRow / 3);
    const selBoxCol = Math.floor(selCol / 3);

    return boxRow === selBoxRow && boxCol === selBoxCol;
  };

  const isSameNumber = (row: number, col: number) => {
    if (!selectedCell) return false;
    const selectedValue = board[selectedCell.row][selectedCell.col].value;
    return selectedValue !== 0 && board[row][col].value === selectedValue;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Sudoku - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
          headerBackTitle: 'Menu',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/leaderboard')} style={{ marginRight: 8 }}>
              <Trophy size={20} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleNewGame}>
          <RotateCcw size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {isComplete && (
        <View style={styles.completeContainer}>
          <Text style={styles.completeText}>🎉 Puzzle Complete!</Text>
          <Text style={styles.completeTime}>Time: {formatTime(timer)}</Text>
        </View>
      )}

      <View style={styles.gridContainer}>
        <View style={styles.grid}>
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isSelected =
                selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const highlighted = isHighlighted(rowIndex, colIndex);
              const sameNumber = isSameNumber(rowIndex, colIndex);
              const conflict = hasConflict(board, rowIndex, colIndex);

              return (
                <TouchableOpacity
                  key={`${rowIndex}-${colIndex}`}
                  style={[
                    styles.cell,
                    rowIndex % 3 === 2 && rowIndex !== 8 && styles.cellBottomBorder,
                    colIndex % 3 === 2 && colIndex !== 8 && styles.cellRightBorder,
                    isSelected && styles.cellSelected,
                    highlighted && styles.cellHighlighted,
                    sameNumber && styles.cellSameNumber,
                    conflict && styles.cellConflict,
                  ]}
                  onPress={() => handleCellPress(rowIndex, colIndex)}
                  activeOpacity={0.7}
                >
                  {cell.value !== 0 ? (
                    <Text
                      style={[
                        styles.cellText,
                        cell.isGiven ? styles.cellTextGiven : styles.cellTextUser,
                        conflict && styles.cellTextError,
                      ]}
                    >
                      {cell.value}
                    </Text>
                  ) : (
                    <View style={styles.notesContainer}>
                      {cell.notes.map((note) => (
                        <Text key={note} style={styles.noteText}>
                          {note}
                        </Text>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 20) }]}>
        <View style={styles.toolButtons}>
          <TouchableOpacity
            style={[styles.toolButton, notesMode && styles.toolButtonActive]}
            onPress={() => setNotesMode(!notesMode)}
          >
            <Edit3 size={18} color={notesMode ? '#fff' : '#2563eb'} />
            <Text style={[styles.toolButtonText, notesMode && styles.toolButtonTextActive]}>
              Notes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleErase}>
            <Eraser size={18} color="#2563eb" />
            <Text style={styles.toolButtonText}>Erase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.numberPad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.numberButton}
              onPress={() => handleNumberPress(num)}
              activeOpacity={0.7}
            >
              <Text style={styles.numberButtonText}>{num}</Text>
            </TouchableOpacity>
          ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  timerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  completeContainer: {
    backgroundColor: '#10b981',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  completeTime: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  gridContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  grid: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#64748b',
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  cellBottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: '#64748b',
  },
  cellRightBorder: {
    borderRightWidth: 2,
    borderRightColor: '#64748b',
  },
  cellSelected: {
    backgroundColor: '#2563eb',
  },
  cellHighlighted: {
    backgroundColor: '#dbeafe',
  },
  cellSameNumber: {
    backgroundColor: '#bfdbfe',
  },
  cellConflict: {
    backgroundColor: '#fee2e2',
  },
  cellText: {
    fontSize: CELL_SIZE * 0.5,
    fontWeight: '600' as const,
  },
  cellTextGiven: {
    color: '#1e293b',
    fontWeight: '700' as const,
  },
  cellTextUser: {
    color: '#2563eb',
  },
  cellTextError: {
    color: '#ef4444',
  },
  notesContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  noteText: {
    fontSize: Math.max(10, CELL_SIZE * 0.2),
    color: '#64748b',
    width: '33.33%',
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  toolButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  toolButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  toolButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  toolButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2563eb',
  },
  toolButtonTextActive: {
    color: '#fff',
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  numberButton: {
    width: (width - 56) / 5,
    height: (width - 56) / 5,
    maxWidth: 64,
    maxHeight: 64,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  numberButtonText: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
});
