import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  TUBE_CAPACITY,
  NUM_TUBES,
  NUM_COLORS,
  isSolved,
  checkLoss,
  pourAmount,
  generateLevel,
} from './level.js';
import './App.css';

const COLOR_CLASS = [
  'liquid-red', 'liquid-blue', 'liquid-green', 'liquid-yellow',
  'liquid-purple', 'liquid-orange', 'liquid-cyan',
];
const CONFETTI_COLORS = ['#4facfe', '#00f2fe', '#51cf66', '#ffd43b', '#da77f2', '#ffa94d', '#ff6b6b'];

function App() {
  const [tubes, setTubes] = useState([]);
  const [selectedTube, setSelectedTube] = useState(null);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [particles, setParticles] = useState([]);
  const [splash, setSplash] = useState(null); // {tube, key}
  const [shake, setShake] = useState(null);   // {tube, key}
  const [burst, setBurst] = useState(null);   // {tube, key}
  const effectKey = useRef(0);

  const startGame = useCallback(() => {
    setTubes(generateLevel());
    setSelectedTube(null);
    setIsWon(false);
    setIsLost(false);
    setParticles([]);
    setSplash(null);
    setShake(null);
    setBurst(null);
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

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
      </div>

      <div className="tubes-container">
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
        <button className="btn btn-primary" onClick={startGame}>
          Новая игра
        </button>
        <button className="icon-btn restart" onClick={startGame} aria-label="Начать заново" title="Начать заново">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
        </button>
      </div>

      {isWon && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Победа! 🎉</h2>
            <p className="modal-text">Все цвета отсортированы. Поздравляем!</p>
            <button className="btn btn-primary" onClick={startGame}>
              Играть снова
            </button>
          </div>
        </div>
      )}

      {isLost && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Тупик! 😔</h2>
            <p className="modal-text">Доступных ходов не осталось. Начните заново.</p>
            <button className="btn btn-primary" onClick={startGame}>
              Начать заново
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
