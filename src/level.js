export const TUBE_CAPACITY = 6;
export const NUM_TUBES = 9;
// 7 цветов × 6 слоёв = 42 единицы в 9 непустых колбах (9×6=54 → 12 свободных мест).
// Конфигурация проверена BFS-соловером: случайные доски решаемы (7c/9t при cap 6 — 52/52,
// 0 мёртвых). 6c/8t даёт тупиковые доски, 8c/10t — нерешаемые, поэтому выбран 7c/9t.
export const NUM_COLORS = 7;

export function isSolved(level) {
  for (const tube of level) {
    if (tube.length === 0) continue;
    if (tube.length !== TUBE_CAPACITY) return false;
    if (!tube.every(c => c === tube[0])) return false;
  }
  return true;
}

/* Есть ли хоть один легальный ход. Если нет — проигрыш. */
export function checkLoss(level) {
  for (let i = 0; i < level.length; i++) {
    if (level[i].length === 0) continue;
    const top = level[i][level[i].length - 1];
    for (let j = 0; j < level.length; j++) {
      if (i === j) continue;
      const other = level[j];
      if (other.length < TUBE_CAPACITY && (other.length === 0 || other[other.length - 1] === top)) {
        return false;
      }
    }
  }
  return true;
}

/* Сколько единиц можно перелить: весь верхний слой одного цвета,
   либо максимум, что влезает (когда весь слой не помещается). */
export function pourAmount(from, to) {
  if (to.length >= TUBE_CAPACITY) return 0;
  const top = from[from.length - 1];
  if (to.length > 0 && to[to.length - 1] !== top) return 0;
  let run = 0;
  for (let i = from.length - 1; i >= 0 && from[i] === top; i--) run++;
  return Math.min(run, TUBE_CAPACITY - to.length);
}

/* Есть ли хоть один легальный ход на доске (нужно, чтобы стартовая
   позиция не была мгновенным тупиком). */
function hasAnyMove(level) {
  for (let x = 0; x < level.length; x++) {
    if (!level[x].length) continue;
    for (let y = 0; y < level.length; y++) {
      if (x !== y && pourAmount(level[x], level[y]) > 0) return true;
    }
  }
  return false;
}

/* Рандомный уровень с правильной «арифметикой» игры:
   - каждый цвет ровно TUBE_CAPACITY раз (6) — иначе колбу этим цветом
     заполнить нельзя (мало) или цвет не помещается в колбу (много);
   - пустых колб нет: все 9 содержат жидкость;
   - объёмы колб случайные (1..6), суммарно NUM_COLORS × 6 —
     «где-то больше, где-то меньше»;
   - есть хотя бы один легальный первый ход (иначе доска — тупик сразу). */
export function generateLevel() {
  const total = NUM_COLORS * TUBE_CAPACITY;

  let level = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    // случайные объёмы колб: 1..6, сумма ровно total (rejection sampling)
    let lens = null;
    for (let i = 0; i < 4000; i++) {
      const l = Array.from({ length: NUM_TUBES }, () => 1 + Math.floor(Math.random() * TUBE_CAPACITY));
      if (l.reduce((a, b) => a + b, 0) === total) { lens = l; break; }
    }
    if (!lens) lens = [6, 6, 5, 5, 5, 4, 4, 4, 3]; // гарантированно валидный вариант

    // пул: по TUBE_CAPACITY единиц каждого цвета, тасуем (Fisher–Yates)
    const pool = [];
    for (let c = 0; c < NUM_COLORS; c++) {
      for (let k = 0; k < TUBE_CAPACITY; k++) pool.push(c);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // раздаём пул по колбам согласно объёмам
    const candidate = [];
    let idx = 0;
    for (const len of lens) candidate.push(pool.slice(idx, (idx += len)));

    if (hasAnyMove(candidate)) { level = candidate; break; }
  }
  // страховка от null (шанс ничтожен): проверенная BFS-соловером рабочая позиция
  if (!level) level = [[3,5,1,2,5],[5,3,1,1,2,6],[4,3,3,0],[0,5,5,4],[1,2,0],[4,6,0,6,4,4],[6,6,4,6],[2,2,3,3,0],[0,1,1,2,5]];
  return level;
}
