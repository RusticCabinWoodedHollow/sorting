import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './App.css';

const TUBE_CAPACITY = 4;

const LEVELS = [
  { id: 'easy',   label: 'Легко',   colors: 4, tubes: 6 },
  { id: 'normal', label: 'Средне',  colors: 5, tubes: 7 },
  { id: 'hard',   label: 'Сложно',  colors: 6, tubes: 8 },
  { id: 'insane', label: 'Безумие', colors: 7, tubes: 9 },
];

const COLOR_CLASS = [
  'liquid-red', 'liquid-blue', 'liquid-green', 'liquid-yellow',
  'liquid-purple', 'liquid-orange', 'liquid-cyan',
];
const CONFETTI_COLORS = ['#4facfe', '#00f2fe', '#51cf66', '#ffd43b', '#da77f2', '#ffa94d', '#ff6b6b'];

function isSolved(level) {
  for (const tube of level) {
    if (tube.length === 0) continue;
    if (tube.length !== TUBE_CAPACITY) return false;
    if (!tube.every(c => c === tube[0])) return false;
  }
  return true;
}

function checkLoss(level) {
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
function pourAmount(from, to) {
  if (to.length >= TUBE_CAPACITY) return 0;
  const top = from[from.length - 1];
  if (to.length > 0 && to[to.length - 1] !== top) return 0;
  let run = 0;
  for (let i = from.length - 1; i >= 0 && from[i] === top; i--) run++;
  return Math.min(run, TUBE_CAPACITY - to.length);
}

/* Генерация гарантированно решаемого уровня:
   стартуем из решённого состояния и делаем случайные ЗАКОННЫЕ ходы.
   Любой такой ход обратим, значит последность обратно решает финал. */
function generateLevel(colors, tubesCount) {
  const solved = () =>
    Array.from({ length: tubesCount }, (_, i) => (i < colors ? Array(TUBE_CAPACITY).fill(i) : []));

  let level = solved();
  let mixed = 0;
  const targetMoves = 70 + colors * 18;
  let guard = 0;
  while (mixed < targetMoves && guard < 20000) {
    guard++;
    const a = Math.floor(Math.random() * tubesCount);
    const b = Math.floor(Math.random() * tubesCount);
    if (a === b || level[a].length === 0 || level[b].length >= TUBE_CAPACITY) continue;
    const topA = level[a][level[a].length - 1];
    if (level[b].length > 0 && level[b][level[b].length - 1] !== topA) continue;
    level[b].push(level[a].pop());
    mixed++;
    if (isSolved(level)) { level = solved(); mixed = 0; }
  }
  if (isSolved(level)) return generateLevel(colors, tubesCount);
  return level;
}

function App() {
  const [levelId, setLevelId] = useState(() => {
    const saved = localStorage.getItem('wsp_level');
    return LEVELS.some(l => l.id === saved) ? saved : 'normal';
  });
  const [tubes, setTubes] = useState([]);
  const [selectedTube, setSelectedTube] = useState(null);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [particles, setParticles] = useState([]);
  const [splash, setSplash] = useState(null); // {tube, key}
  const [shake, setShake] = useState(null);   // {tube, key}
  const [burst, setBurst] = useState(null);   // {tube, key}
  const effectKey = useRef(0);

  const level = LEVELS.find(l => l.id === levelId) || LEVELS[1];

  const startGame = useCallback((lv) => {
    setTubes(generateLevel(lv.colors, lv.tubes));
    setSelectedTube(null);
    setIsWon(false);
    setIsLost(false);
    setParticles([]);
    setSplash(null);
    setShake(null);
    setBurst(null);
  }, []);

  useEffect(() => {
    startGame(LEVELS.find(l => l.id === levelId) || LEVELS[1]);
  }, [levelId, startGame]);

  const changeLevel = (id) => {
    if (id === levelId) return;
    localStorage.setItem('wsp_level', id);
    setLevelId(id);
  };

  const createParticles = () => {
    setParticles(Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 9 + 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      duration: Math.random() * 2 + 2,
      delay: Math.random() * 0.8,
      round: Math.random() > 0.5,
    })));
  };

  const handleTubeClick = (tubeIndex) => {
    if (isWon || isLost) return;

    if (selectedTube === null) {
      if (tubes[tubeIndex].length > 0) setSelectedTube(tubeIndex);
      return;
    }
    if (selectedTube === tubeIndex) {
      setSelectedTube(null);
      return;
    }

    const from = tubes[selectedTube];
    const to = tubes[tubeIndex];
    const amt = pourAmount(from, to);

    if (amt > 0) {
      const moved = from.slice(from.length - amt);
      const newTubes = tubes.map((tube, idx) => {
        if (idx === selectedTube) return tube.slice(0, tube.length - amt);
        if (idx === tubeIndex) return [...tube, ...moved];
        return tube;
      });
      setTubes(newTubes);
      setSelectedTube(null); // фокус снимается сразу после перелива
      setSplash({ tube: tubeIndex, key: ++effectKey.current });

      const dest = newTubes[tubeIndex];
      if (dest.length === TUBE_CAPACITY && dest.every(c => c === dest[0])) {
        setBurst({ tube: tubeIndex, key: ++effectKey.current });
      }

      if (isSolved(newTubes)) {
        setIsWon(true);
        createParticles();
      } else if (checkLoss(newTubes)) {
        setIsLost(true);
      }
    } else {
      // незаконный ход: тряска, и (если колба не пустая) выбор переходит на неё
      setShake({ tube: tubeIndex, key: ++effectKey.current });
      if (tubes[tubeIndex].length > 0) setSelectedTube(tubeIndex);
    }
  };

  const bubbles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 8 + Math.random() * 34,
      duration: 14 + Math.random() * 22,
      delay: -Math.random() * 30,
      opacity: 0.25 + Math.random() * 0.5,
    })), []);

  return (
    <div className="game-container">
      <div className="bg-bubbles" aria-hidden="true">
        {bubbles.map(b => (
          <div
            key={b.id}
            className="bg-bubble"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              opacity: b.opacity,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="game-header">
        <h1 className="game-title">Water Sort</h1>
        <div className="difficulty">
          {LEVELS.map(l => (
            <button
              key={l.id}
              className={`pill ${l.id === levelId ? 'active' : ''}`}
              onClick={() => changeLevel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`tubes-container ${tubes.length >= 8 ? 'dense' : ''}`}>
        {tubes.map((tube, tubeIndex) => {
          const completed = tube.length === TUBE_CAPACITY && tube.every(c => c === tube[0]);
          return (
            <div
              key={tubeIndex}
              className={[
                'tube-wrapper',
                selectedTube === tubeIndex ? 'selected' : '',
                completed ? 'completed' : '',
                shake && shake.tube === tubeIndex ? 'shake' : '',
              ].join(' ')}
              onClick={() => handleTubeClick(tubeIndex)}
            >
              <div className="tube">
                <div className="liquid-container">
                  {tube.map((colorIndex, liquidIndex) => (
                    <div
                      key={liquidIndex}
                      className={`liquid ${COLOR_CLASS[colorIndex] || 'liquid-blue'}`}
                      style={{ height: `${100 / TUBE_CAPACITY}%` }}
                    />
                  ))}
                </div>
                {splash && splash.tube === tubeIndex && <div key={splash.key} className="splash" />}
                {burst && burst.tube === tubeIndex && <div key={burst.key} className="burst" />}
                {shake && shake.tube === tubeIndex && <div key={shake.key} className="shake-flash" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="controls">
        <button className="btn btn-primary" onClick={() => startGame(level)}>
          Новая игра
        </button>
      </div>

      {isWon && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Победа! 🎉</h2>
            <p className="modal-text">Головоломка «{level.label}» решена. Поздравляем!</p>
            <button className="btn btn-primary" onClick={() => startGame(level)}>
              Играть снова
            </button>
          </div>
        </div>
      )}

      {isLost && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Тупик! 😔</h2>
            <p className="modal-text">Доступных ходов не осталось. Попробуйте ещё раз.</p>
            <button className="btn btn-primary" onClick={() => startGame(level)}>
              Ещё раз
            </button>
          </div>
        </div>
      )}

      <div className="particles-container">
        {particles.map(p => (
          <div
            key={p.id}
            className={`particle ${p.round ? 'round' : ''}`}
            style={{
              left: `${p.x}%`,
              width: p.size,
              height: p.size * (p.round ? 1 : 0.6),
              background: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
