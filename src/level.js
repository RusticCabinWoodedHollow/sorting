export const TUBE_CAPACITY = 4;
export const NUM_TUBES = 7;
export const NUM_COLORS = 5;
export const FULL_TUBES = NUM_TUBES - 2; // 5 полных, 2 пустых

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

/* ---- генерация гарантированно решаемых уровней ----
   Ключевой момент: обычный «обратный прогон легальных ходов» НЕ создаёт
   смешанных колб (нельзя налить цвет X поверх Y), поэтому уровень
   получается тривиальным. Правильный ход — «размешивающие» шаги:
   снимаем единицу с колбы Y и кладём НАВЕРХ любой колбы X (цвет X не важен).
   Такой шаг — точное обратное к легальному ходу X->Y, если после снятия с Y
   та либо пустая, либо её верхний цвет не поменялся (берём только с конца
   слоя толщиной >= 2, либо единственную единицу). Тогда прямая цепочка
   (история в обратном порядке) — законное решение уровня. */

function desolveCandidates(level) {
  const cands = [];
  for (let y = 0; y < level.length; y++) {
    const t = level[y];
    if (t.length === 0) continue;
    const c = t[t.length - 1];
    let run = 0;
    for (let i = t.length - 1; i >= 0 && t[i] === c; i--) run++;
    if (run < 2 && t.length > 1) continue; // иначе обратный ход станет незаконным
    for (let x = 0; x < level.length; x++) {
      if (x !== y && level[x].length < TUBE_CAPACITY) cands.push([x, y]);
    }
  }
  return cands;
}

function configOk(level) {
  let full = 0, empty = 0, mixed = 0, completedVisible = false;
  for (const t of level) {
    if (t.length === TUBE_CAPACITY) {
      full++;
      if (t.every(c => c === t[0])) completedVisible = true;
    }
    if (t.length === 0) empty++;
    if (new Set(t).size >= 2) mixed++;
  }
  return (
    full === FULL_TUBES &&
    empty === NUM_TUBES - FULL_TUBES &&
    !completedVisible &&
    mixed >= 4
  );
}

/* Возвращает { level, solution }, где solution — последовательность
   легальных ходов «перелить 1 единицу из x в y», решающая level. */
export function generateLevel() {
  const solved = () =>
    Array.from({ length: NUM_TUBES }, (_, i) =>
      i < NUM_COLORS ? Array(TUBE_CAPACITY).fill(i) : []
    );

  let last = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const level = solved();
    const history = [];
    const baseSteps = 300 + ((Math.random() * 300) | 0);
    let dead = false;

    for (let s = 0; s < baseSteps; s++) {
      const cands = desolveCandidates(level);
      if (!cands.length) { dead = true; break; }
      const mv = cands[(Math.random() * cands.length) | 0];
      level[mv[0]].push(level[mv[1]].pop());
      history.push(mv);
      if (isSolved(level)) break;
    }
    if (isSolved(level) || dead) continue;

    // добиваем до конфигурации «5 полных + 2 пустых» и хорошей перемешанности
    for (let s = 0; s < 4000; s++) {
      if (configOk(level)) {
        return {
          level: level.map(t => t.slice()),
          solution: history.slice().reverse(),
        };
      }
      const cands = desolveCandidates(level);
      if (!cands.length) break;
      const mv = cands[(Math.random() * cands.length) | 0];
      level[mv[0]].push(level[mv[1]].pop());
      history.push(mv);
      if (isSolved(level)) break;
    }

    last = last || {
      level: level.map(t => t.slice()),
      solution: history.slice().reverse(),
    };
  }
  return last;
}

/* Проверка (для тестов): проигрываем solution от level, каждый ход
   должен быть легальным, в конце — решено. */
export function verifySolution(level, solution) {
  const lv = level.map(t => t.slice());
  for (const [x, y] of solution) {
    if (lv[x].length === 0) return false;
    const c = lv[x][lv[x].length - 1];
    if (lv[y].length >= TUBE_CAPACITY) return false;
    if (lv[y].length > 0 && lv[y][lv[y].length - 1] !== c) return false;
    lv[y].push(lv[x].pop());
  }
  return isSolved(lv);
}
