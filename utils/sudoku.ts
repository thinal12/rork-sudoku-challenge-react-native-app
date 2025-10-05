type Cell = {
  value: number;
  isGiven: boolean;
  notes: number[];
};

type Board = Cell[][];

type Difficulty = 'easy' | 'medium' | 'hard';

export type { Cell, Board, Difficulty };

function isValid(board: number[][], row: number, col: number, num: number): boolean {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
  }

  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num) return false;
  }

  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }

  return true;
}

function solveSudoku(board: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) {
              return true;
            }
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSolvedBoard(): number[][] {
  const board: number[][] = Array(9).fill(null).map(() => Array(9).fill(0));
  
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 0; i < 9; i++) {
    for (let j = i + 1; j < 9; j++) {
      const rand = Math.floor(Math.random() * (j - i + 1)) + i;
      [numbers[i], numbers[rand]] = [numbers[rand], numbers[i]];
    }
  }
  
  for (let i = 0; i < 9; i++) {
    board[0][i] = numbers[i];
  }
  
  solveSudoku(board);
  return board;
}

function removeNumbers(board: number[][], difficulty: Difficulty): number[][] {
  const result = board.map(row => [...row]);
  
  const cellsToRemove = difficulty === 'easy' ? 40 : difficulty === 'medium' ? 50 : 60;
  
  let removed = 0;
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    
    if (result[row][col] !== 0) {
      result[row][col] = 0;
      removed++;
    }
  }
  
  return result;
}

export function generatePuzzle(difficulty: Difficulty): Board {
  const solvedBoard = generateSolvedBoard();
  const puzzleBoard = removeNumbers(solvedBoard, difficulty);
  
  return puzzleBoard.map((row, i) =>
    row.map((cell, j) => ({
      value: cell,
      isGiven: cell !== 0,
      notes: [],
    }))
  );
}

export function checkBoard(board: Board): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = board[row][col].value;
      if (value === 0) continue;
      
      for (let x = 0; x < 9; x++) {
        if (x !== col && board[row][x].value === value) return false;
      }
      
      for (let x = 0; x < 9; x++) {
        if (x !== row && board[x][col].value === value) return false;
      }
      
      const startRow = row - (row % 3);
      const startCol = col - (col % 3);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = i + startRow;
          const c = j + startCol;
          if ((r !== row || c !== col) && board[r][c].value === value) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

export function isBoardComplete(board: Board): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col].value === 0) return false;
    }
  }
  return checkBoard(board);
}

export function hasConflict(board: Board, row: number, col: number): boolean {
  const value = board[row][col].value;
  if (value === 0) return false;
  
  for (let x = 0; x < 9; x++) {
    if (x !== col && board[row][x].value === value) return true;
  }
  
  for (let x = 0; x < 9; x++) {
    if (x !== row && board[x][col].value === value) return true;
  }
  
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = i + startRow;
      const c = j + startCol;
      if ((r !== row || c !== col) && board[r][c].value === value) {
        return true;
      }
    }
  }
  
  return false;
}
