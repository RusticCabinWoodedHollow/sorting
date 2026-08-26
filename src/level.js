export const TUBE_CAPACITY = 4;
export const NUM_TUBES = 7;
export const NUM_COLORS = 7;

export function isSolved(level) {
  for (const tube of level) {
    if (tube.length === 0) continue;
    if (tube.length !== TUBE_CAPACITY) return false;
    if (!tube.every(c => c === tube[0])) return false;
  }
  return true;
}

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

/* Чистый рандом: каждая колба получает 1..4 единицы (пустых колб нет),
   каждая единица — случайный цвет из NUM_COLORS.
   Гарантированности побед нет — в тупик уходит модалка «Тупик» с рестартом. */
export function generateLevel() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const level = Array.from({ length: NUM_TUBES }, () => {
      const len = 1 + Math.floor(Math.random() * TUBE_CAPACITY);
      return Array.from({ length: len }, () => Math.floor(Math.random() * NUM_COLORS));
    });
    if (!isSolved(level)) return level; // страховка от мгновенно решённой доски
  }
  // теоретически недостижимо, но на всякий случай
  return Array.from({ length: NUM_TUBES }, () => [0, 1, 0, 1]);
}
