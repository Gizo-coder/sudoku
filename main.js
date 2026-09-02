import './style.css';

const gridContainer = document.getElementById('sudoku-grid');
const timerDisplay = document.getElementById('timer');
const winMessage = document.getElementById('win-message');
const difficultyButtons = document.querySelectorAll('#difficulty-menu button');
const gridWrapper = document.getElementById('grid-wrapper');
const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-button');
const hintButton = document.getElementById('hint-button');
const bestTimeInfo = document.getElementById('best-time-info');
const MAX_HINTS = 3;

let timerInterval = null;
let secondsElapsed = 0;
let isGameWon = false;
let gameStarted = false;
let selectedDifficulty = 'easy';
let solvedBoard = null;
let hintsRemaining = MAX_HINTS;

// ============ SUDOKU ÜRETİM ALGORİTMASI ============

function createEmptyBoard() {
  return Array(9).fill(null).map(() => Array(9).fill(0));
}

function isValid(board, row, col, num) {
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
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }

  return true;
}

function hasConflict(board, row, col, num) {
  for (let x = 0; x < 9; x++) {
    if (x !== col && board[row][x] === num) return true;
  }

  for (let x = 0; x < 9; x++) {
    if (x !== row && board[x][col] === num) return true;
  }

  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if ((r !== row || c !== col) && board[r][c] === num) return true;
    }
  }

  return false;
}

function shuffleNumbers() {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers;
}

function fillBoard(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const numbers = shuffleNumbers();

        for (const num of numbers) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;

            if (fillBoard(board)) {
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

function generateSolvedBoard() {
  const board = createEmptyBoard();
  fillBoard(board);
  return board;
}

// ============ ZORLUK SEVİYESİNE GÖRE BULMACA OLUŞTURMA ============

const DIFFICULTY_SETTINGS = {
  easy: 40,
  medium: 50,
  hard: 58
};

function createPuzzle(solvedBoard, difficulty) {
  const puzzle = solvedBoard.map(row => [...row]);
  const cellsToRemove = DIFFICULTY_SETTINGS[difficulty];

  const positions = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      positions.push({ row, col });
    }
  }

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  for (let i = 0; i < cellsToRemove; i++) {
    const { row, col } = positions[i];
    puzzle[row][col] = 0;
  }

  return puzzle;
}

// ============ GÖRSEL IZGARA ============

let currentPuzzle = null;
let originalPuzzle = null;
let selectedCell = null;

function createGrid(puzzle) {
  gridContainer.innerHTML = '';

  currentPuzzle = puzzle.map(row => [...row]);
  originalPuzzle = puzzle.map(row => [...row]);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (row === 2 || row === 5) {
        cell.classList.add('row-thick-bottom');
      }

      if (puzzle[row][col] !== 0) {
        cell.textContent = puzzle[row][col];
        cell.classList.add('given');
      }

      cell.addEventListener('click', () => selectCell(row, col));

      gridContainer.appendChild(cell);
    }
  }
}

function selectCell(row, col) {
  if (originalPuzzle[row][col] !== 0) return;

  selectedCell = { row, col };
  updateGridDisplay();
}

function updateGridDisplay() {
  const cells = gridContainer.querySelectorAll('.cell');

  cells.forEach(cell => {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    cell.classList.remove('selected');

    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      cell.classList.add('selected');
    }
  });
}

function handleKeyPress(e) {
  if (!selectedCell || isGameWon) return;

  const { row, col } = selectedCell;

  if (e.key >= '1' && e.key <= '9') {
    currentPuzzle[row][col] = parseInt(e.key);
    renderCellValue(row, col);
  }

  if (e.key === 'Backspace' || e.key === 'Delete') {
    currentPuzzle[row][col] = 0;
    renderCellValue(row, col);
  }
}

function renderCellValue(row, col) {
  const cell = gridContainer.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  const value = currentPuzzle[row][col];

  cell.textContent = value === 0 ? '' : value;
  cell.classList.toggle('user-input', value !== 0);

  if (value !== 0 && hasConflict(currentPuzzle, row, col, value)) {
    cell.classList.add('error');
  } else {
    cell.classList.remove('error');
  }

  refreshRelatedCells(row, col);

  if (checkWin()) {
    handleWin();
  }
}

function refreshRelatedCells(changedRow, changedCol) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = currentPuzzle[row][col];
      if (value === 0) continue;

      if (originalPuzzle[row][col] !== 0) continue;

      const cell = gridContainer.querySelector(`[data-row="${row}"][data-col="${col}"]`);

      if (hasConflict(currentPuzzle, row, col, value)) {
        cell.classList.add('error');
      } else {
        cell.classList.remove('error');
      }
    }
  }
}

// ============ KAZANMA KONTROLÜ ============

function checkWin() {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (currentPuzzle[row][col] === 0) return false;
    }
  }

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = currentPuzzle[row][col];
      if (hasConflict(currentPuzzle, row, col, value)) return false;
    }
  }

  return true;
}

function handleWin() {
  isGameWon = true;
  stopTimer();
  const bestTimeKey = 'sudoku_best_' + selectedDifficulty;
  const previousBest = localStorage.getItem(bestTimeKey);

  let isNewRecord = false;

  if (!previousBest || secondsElapsed < parseInt(previousBest)) {
    localStorage.setItem(bestTimeKey, secondsElapsed);
    isNewRecord = true;
  }

  let message = `🎉 Tebrikler! ${formatTime(secondsElapsed)} sürede tamamladın!`;
  if (isNewRecord) {
    message += ' Yeni Rekor! 🏆';
  }

  winMessage.textContent = message;
  updateBestTimeDisplay();
}

function getBestTime(difficulty) {
  const bestTimeKey = 'sudoku_best_' + difficulty;
  const stored = localStorage.getItem(bestTimeKey);
  return stored ? parseInt(stored) : null;
}

function updateBestTimeDisplay() {
  const best = getBestTime(selectedDifficulty);
  bestTimeInfo.textContent = best !== null ? 'En İyi: ' + formatTime(best) : '';
}

// ============ ZAMANLAYICI ============

function startTimer() {
  stopTimer();
  secondsElapsed = 0;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    secondsElapsed++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  timerDisplay.textContent = 'Süre: ' + formatTime(secondsElapsed);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

document.addEventListener('keydown', handleKeyPress);

// ============ İPUCU ============

function giveHint() {
  if (isGameWon || !gameStarted || hintsRemaining <= 0) return;

  if (!selectedCell) {
    alert('Önce ipucu almak istediğin bir hücreyi seç.');
    return;
  }

  const { row, col } = selectedCell;

  if (currentPuzzle[row][col] === solvedBoard[row][col]) {
    alert('Bu hücre zaten doğru!');
    return;
  }

  currentPuzzle[row][col] = solvedBoard[row][col];
  renderCellValue(row, col);

  const cell = gridContainer.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  cell.classList.add('hint');

  hintsRemaining--;
  updateHintButtonDisplay();
}

function updateHintButtonDisplay() {
  hintButton.textContent = `💡 İpucu (${hintsRemaining})`;
  hintButton.disabled = hintsRemaining <= 0;
}

// ============ OYUNU BAŞLAT ============

const difficultyLabels = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor'
};

function renderPreviewGrid() {
  gridContainer.innerHTML = '';
  gridContainer.classList.add('preview');

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');

      if (row === 2 || row === 5) {
        cell.classList.add('row-thick-bottom');
      }

      gridContainer.appendChild(cell);
    }
  }
}

function showStartScreen() {
  gameStarted = false;
  renderPreviewGrid();
  startOverlay.style.display = 'flex';
  timerDisplay.textContent = 'Süre: 00:00';
  bestTimeInfo.textContent = '';
  winMessage.textContent = '';
}

function startNewGame(difficulty) {
  gameStarted = true;
  startOverlay.style.display = 'none';
  gridContainer.classList.remove('preview');
  isGameWon = false;
  winMessage.textContent = '';
  selectedCell = null;
  hintsRemaining = MAX_HINTS;
  updateHintButtonDisplay();

  solvedBoard = generateSolvedBoard();
  const puzzle = createPuzzle(solvedBoard, difficulty);

  createGrid(puzzle);
  startTimer();

  updateBestTimeDisplay();

  difficultyButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
  });
}

difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedDifficulty = btn.dataset.difficulty;
    if (!gameStarted) {
      difficultyButtons.forEach(b => b.classList.toggle('active', b === btn));
    } else {
      startNewGame(selectedDifficulty);
    }
  });
});

startOverlay.addEventListener('click', () => {
  startNewGame(selectedDifficulty);
});

hintButton.addEventListener('click', giveHint);

showStartScreen();