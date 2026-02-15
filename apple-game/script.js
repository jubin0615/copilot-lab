// ========== 상수 ==========
const COLS = 17;
const ROWS = 10;
const TOTAL_APPLES = COLS * ROWS;
const TARGET_SUM = 10;
const GAME_DURATION = 120; // 초

// ========== DOM 요소 ==========
const gameBoard = document.getElementById('game-board');
const selectionBox = document.getElementById('selection-box');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const dragSumEl = document.getElementById('drag-sum');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const finalApplesEl = document.getElementById('final-apples');
const gameContainer = document.getElementById('game-container');

// ========== 게임 상태 ==========
let apples = [];         // { value, element, removed }
let score = 0;
let removedCount = 0;
let timeLeft = GAME_DURATION;
let timerInterval = null;
let gameActive = false;

// 드래그 상태
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let selectedApples = [];

// ========== 초기화 ==========
function initGame() {
  // 상태 초기화
  apples = [];
  score = 0;
  removedCount = 0;
  timeLeft = GAME_DURATION;
  gameActive = true;
  selectedApples = [];

  // UI 초기화
  scoreEl.textContent = '0';
  timerEl.textContent = GAME_DURATION;
  timerEl.classList.remove('warning');
  dragSumEl.textContent = '0';
  dragSumEl.classList.remove('match', 'over');
  gameOverModal.classList.add('hidden');
  gameBoard.innerHTML = '';
  startBtn.textContent = '재시작';

  // 사과 생성
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const value = Math.ceil(Math.random() * 9);
      const el = document.createElement('div');
      el.className = 'apple';
      el.setAttribute('data-value', value);
      el.setAttribute('data-row', row);
      el.setAttribute('data-col', col);
      el.innerHTML = `<span>${value}</span>`;
      gameBoard.appendChild(el);

      apples.push({
        value,
        element: el,
        removed: false,
        row,
        col,
      });
    }
  }

  // 타이머 시작
  startTimer();
}

// ========== 타이머 ==========
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft <= 10) {
      timerEl.classList.add('warning');
    }

    if (timeLeft <= 0) {
      endGame('시간 종료!');
    }
  }, 1000);
}

// ========== 게임 종료 ==========
function endGame(reason = '게임 종료!') {
  gameActive = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // 모달 제목 업데이트
  const modalTitle = document.querySelector('#game-over-modal h2');
  modalTitle.textContent = `🍎 ${reason}`;

  finalScoreEl.textContent = score;
  finalApplesEl.textContent = removedCount;
  gameOverModal.classList.remove('hidden');
}

// ========== 가능한 조합 확인 ==========
function hasValidCombinations() {
  const activeApples = apples.filter(a => !a.removed);
  
  // 남은 사과가 없으면 false
  if (activeApples.length === 0) return false;
  
  // 모든 가능한 조합을 확인 (백트래킹)
  function findCombination(index, currentSum, usedApples) {
    // 목표 합에 도달하면 true
    if (currentSum === TARGET_SUM && usedApples.length > 0) {
      return true;
    }
    
    // 합이 목표를 초과하거나 모든 사과를 확인했으면 중단
    if (currentSum > TARGET_SUM || index >= activeApples.length) {
      return false;
    }
    
    // 현재 사과를 선택하는 경우
    if (findCombination(index + 1, currentSum + activeApples[index].value, [...usedApples, index])) {
      return true;
    }
    
    // 현재 사과를 선택하지 않는 경우
    if (findCombination(index + 1, currentSum, usedApples)) {
      return true;
    }
    
    return false;
  }
  
  return findCombination(0, 0, []);
}

// ========== 드래그 선택 시스템 ==========

function getContainerOffset() {
  return gameContainer.getBoundingClientRect();
}

// mousedown — 드래그 시작
function onMouseDown(e) {
  if (!gameActive) return;
  if (e.button !== 0) return; // 좌클릭만

  isDragging = true;

  const containerRect = getContainerOffset();
  dragStartX = e.clientX - containerRect.left + gameContainer.scrollLeft;
  dragStartY = e.clientY - containerRect.top + gameContainer.scrollTop;

  selectionBox.style.left = dragStartX + 'px';
  selectionBox.style.top = dragStartY + 'px';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  selectionBox.style.display = 'block';
  selectionBox.classList.remove('match', 'over');

  // 이전 선택 해제
  clearSelection();
}

// mousemove — 드래그 중
function onMouseMove(e) {
  if (!isDragging || !gameActive) return;

  const containerRect = getContainerOffset();
  const currentX = e.clientX - containerRect.left + gameContainer.scrollLeft;
  const currentY = e.clientY - containerRect.top + gameContainer.scrollTop;

  // 선택 박스 위치/크기 계산
  const left = Math.min(dragStartX, currentX);
  const top = Math.min(dragStartY, currentY);
  const width = Math.abs(currentX - dragStartX);
  const height = Math.abs(currentY - dragStartY);

  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';

  // 겹치는 사과 찾기
  updateSelectedApples();
}

// mouseup — 드래그 종료
function onMouseUp(e) {
  if (!isDragging || !gameActive) return;

  isDragging = false;
  selectionBox.style.display = 'none';
  selectionBox.classList.remove('match', 'over');

  // 선택된 사과의 합 확인
  if (selectedApples.length > 0) {
    const sum = selectedApples.reduce((acc, a) => acc + a.value, 0);

    if (sum === TARGET_SUM) {
      removeApples(selectedApples);
    } else {
      // 합이 10이 아니면 선택 해제
      clearSelection();
    }
  }

  dragSumEl.textContent = '0';
  dragSumEl.classList.remove('match', 'over');
}

// 겹치는 사과 계산
function updateSelectedApples() {
  const boxRect = selectionBox.getBoundingClientRect();

  // 이전 선택 해제
  selectedApples.forEach(a => {
    a.element.classList.remove('selected', 'match');
  });
  selectedApples = [];

  // 겹침 검사
  apples.forEach(apple => {
    if (apple.removed) return;

    const appleRect = apple.element.getBoundingClientRect();

    // 두 사각형이 겹치는지 확인
    const overlap = !(
      boxRect.right < appleRect.left + appleRect.width * 0.3 ||
      boxRect.left > appleRect.right - appleRect.width * 0.3 ||
      boxRect.bottom < appleRect.top + appleRect.height * 0.3 ||
      boxRect.top > appleRect.bottom - appleRect.height * 0.3
    );

    if (overlap) {
      selectedApples.push(apple);
    }
  });

  // 선택된 사과 하이라이트
  const sum = selectedApples.reduce((acc, a) => acc + a.value, 0);

  selectedApples.forEach(a => {
    a.element.classList.add('selected');
    if (sum === TARGET_SUM) {
      a.element.classList.add('match');
    }
  });

  // 합계 표시 업데이트
  dragSumEl.textContent = sum;
  dragSumEl.classList.remove('match', 'over');
  selectionBox.classList.remove('match', 'over');

  if (selectedApples.length > 0) {
    if (sum === TARGET_SUM) {
      dragSumEl.classList.add('match');
      selectionBox.classList.add('match');
    } else if (sum > TARGET_SUM) {
      dragSumEl.classList.add('over');
      selectionBox.classList.add('over');
    }
  }
}

// 선택 해제
function clearSelection() {
  selectedApples.forEach(a => {
    a.element.classList.remove('selected', 'match');
  });
  selectedApples = [];
}

// ========== 사과 제거 ==========
function removeApples(applesToRemove) {
  const count = applesToRemove.length;

  applesToRemove.forEach(apple => {
    apple.removed = true;
    apple.element.classList.remove('selected', 'match');
    apple.element.classList.add('removing');

    // 애니메이션 후 숨김
    apple.element.addEventListener('animationend', () => {
      apple.element.classList.remove('removing');
      apple.element.classList.add('removed');
    }, { once: true });
  });

  // 점수 갱신
  removedCount += count;
  score += count;  // 사과 1개당 1점
  scoreEl.textContent = score;

  selectedApples = [];

  // 사과 제거 후 가능한 조합이 있는지 확인
  setTimeout(() => {
    if (gameActive && !hasValidCombinations()) {
      endGame('더 이상 깰 수 있는 사과가 없습니다!');
    }
  }, 500); // 애니메이션 후 확인
}

// ========== 이벤트 리스너 ==========

// 드래그 이벤트 (game-container 기준)
gameContainer.addEventListener('mousedown', onMouseDown);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', onMouseUp);

// 터치 지원
gameContainer.addEventListener('touchstart', (e) => {
  if (!gameActive) return;
  const touch = e.touches[0];
  onMouseDown({
    clientX: touch.clientX,
    clientY: touch.clientY,
    button: 0,
    preventDefault: () => {},
  });
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  const touch = e.touches[0];
  onMouseMove({
    clientX: touch.clientX,
    clientY: touch.clientY,
  });
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (!isDragging) return;
  onMouseUp({});
});

// 컨텍스트 메뉴 방지
gameContainer.addEventListener('contextmenu', (e) => e.preventDefault());

// 버튼 이벤트
startBtn.addEventListener('click', () => {
  initGame();
});

restartBtn.addEventListener('click', () => {
  initGame();
});

// 페이지 로드 시 빈 보드 표시 (게임 시작 전 안내)
function showEmptyBoard() {
  gameBoard.innerHTML = '';
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const el = document.createElement('div');
      el.className = 'apple';
      el.setAttribute('data-value', ((row + col) % 9 + 1));
      el.style.opacity = '0.3';
      el.innerHTML = `<span>${(row + col) % 9 + 1}</span>`;
      gameBoard.appendChild(el);
    }
  }
}

showEmptyBoard();
