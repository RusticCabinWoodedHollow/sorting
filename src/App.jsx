import { useState, useCallback, useEffect } from 'react';
import './App.css';

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const TUBE_CAPACITY = 4;
const NUM_COLORS = 4;
const NUM_TUBES = 6;
const EMPTY_TUBES = 2;

function App() {
  const [tubes, setTubes] = useState([]);
  const [selectedTube, setSelectedTube] = useState(null);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [particles, setParticles] = useState([]);

  const generateLevel = useCallback(() => {
    const filledTubesCount = NUM_TUBES - EMPTY_TUBES;
    const totalUnits = filledTubesCount * TUBE_CAPACITY;
    
    if (totalUnits % NUM_COLORS !== 0) {
      console.error('Invalid configuration');
      return [];
    }

    const unitsPerColor = totalUnits / NUM_COLORS;
    
    let level = Array(NUM_TUBES).fill(null).map(() => []);
    
    for (let colorIdx = 0; colorIdx < NUM_COLORS; colorIdx++) {
      for (let i = 0; i < unitsPerColor; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 50) {
          const tubeIdx = Math.floor(Math.random() * filledTubesCount);
          
          if (level[tubeIdx].length < TUBE_CAPACITY) {
            level[tubeIdx].push(colorIdx);
            placed = true;
          }
          attempts++;
        }
        
        if (!placed) {
          for (let t = 0; t < filledTubesCount; t++) {
            if (level[t].length < TUBE_CAPACITY) {
              level[t].push(colorIdx);
              break;
            }
          }
        }
      }
    }

    const numShuffles = 100 + Math.floor(Math.random() * 50);
    
    for (let i = 0; i < numShuffles; i++) {
      const fromTube = Math.floor(Math.random() * NUM_TUBES);
      const toTube = Math.floor(Math.random() * NUM_TUBES);
      
      if (fromTube !== toTube && 
          level[fromTube].length > 0 && 
          level[toTube].length < TUBE_CAPACITY) {
        const liquid = level[fromTube].pop();
        level[toTube].push(liquid);
      }
    }

    return level;
  }, []);

  const initGame = useCallback(() => {
    const newLevel = generateLevel();
    setTubes(newLevel);
    setSelectedTube(null);
    setMoves(0);
    setIsWon(false);
    setIsLost(false);
    setShowMessage(false);
    setParticles([]);
  }, [generateLevel]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkWin = useCallback((currentTubes) => {
    for (const tube of currentTubes) {
      if (tube.length === 0) continue;
      if (tube.length !== TUBE_CAPACITY) return false;
      
      const firstColor = tube[0];
      for (const color of tube) {
        if (color !== firstColor) return false;
      }
    }
    return true;
  }, []);

  const checkLoss = useCallback((currentTubes) => {
    for (let i = 0; i < currentTubes.length; i++) {
      const tube = currentTubes[i];
      if (tube.length === 0) continue;
      
      const topColor = tube[tube.length - 1];
      
      for (let j = 0; j < currentTubes.length; j++) {
        if (i === j) continue;
        const otherTube = currentTubes[j];
        
        if (otherTube.length < TUBE_CAPACITY) {
          if (otherTube.length === 0 || otherTube[otherTube.length - 1] === topColor) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const handleTubeClick = useCallback((tubeIndex) => {
    if (isWon || isLost) return;

    if (selectedTube === null) {
      if (tubes[tubeIndex].length > 0) {
        setSelectedTube(tubeIndex);
      }
    } else {
      if (selectedTube === tubeIndex) {
        setSelectedTube(null);
        return;
      }

      const fromTube = tubes[selectedTube];
      const toTube = tubes[tubeIndex];
      const liquidToMove = fromTube[fromTube.length - 1];

      if (toTube.length < TUBE_CAPACITY) {
        if (toTube.length === 0 || toTube[toTube.length - 1] === liquidToMove) {
          const newTubes = tubes.map((tube, idx) => {
            if (idx === selectedTube) {
              return tube.slice(0, -1);
            }
            if (idx === tubeIndex) {
              return [...tube, liquidToMove];
            }
            return tube;
          });

          setTubes(newTubes);
          setMoves(prev => prev + 1);
          setSelectedTube(null);

          if (checkWin(newTubes)) {
            setIsWon(true);
            createParticles();
          } else if (checkLoss(newTubes)) {
            setIsLost(true);
            setShowMessage(true);
            setTimeout(() => setShowMessage(false), 2000);
          }
          return;
        }
      }

      setSelectedTube(null);
    }
  }, [tubes, selectedTube, isWon, isLost, checkWin, checkLoss]);

  const createParticles = () => {
    const newParticles = [];
    const colors = ['#4facfe', '#00f2fe', '#51cf66', '#ffd43b', '#da77f2', '#ffa94d'];
    
    for (let i = 0; i < 100; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 2 + 2,
        delay: Math.random() * 0.5
      });
    }
    setParticles(newParticles);
  };

  const getLiquidColorClass = (colorIndex) => {
    const colorNames = ['liquid-red', 'liquid-blue', 'liquid-green', 'liquid-yellow', 'liquid-purple', 'liquid-orange'];
    return colorNames[colorIndex] || 'liquid-blue';
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">Water Sort</h1>
        <div className="game-stats">
          <div className="stat-item">
            <span>Ходы:</span>
            <span className="stat-value">{moves}</span>
          </div>
        </div>
      </div>

      <div className="tubes-container">
        {tubes.map((tube, tubeIndex) => (
          <div
            key={tubeIndex}
            className={`tube-wrapper ${selectedTube === tubeIndex ? 'selected' : ''} ${
              tube.length === TUBE_CAPACITY && tube.every(c => c === tube[0]) ? 'completed' : ''
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTubeClick(tubeIndex);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleTubeClick(tubeIndex);
            }}
          >
            <div className="tube">
              <div className="liquid-container">
                {tube.map((colorIndex, liquidIndex) => (
                  <div
                    key={liquidIndex}
                    className={`liquid ${getLiquidColorClass(colorIndex)}`}
                    style={{ height: `${100 / TUBE_CAPACITY}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="controls">
        <button className="btn btn-primary" onClick={initGame}>
          Новая игра
        </button>
      </div>

      {isWon && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Победа! 🎉</h2>
            <p className="modal-text">
              Поздравляем! Вы решили головоломку за {moves} ходов.
            </p>
            <button className="btn btn-primary" onClick={initGame}>
              Играть снова
            </button>
          </div>
        </div>
      )}

      {showMessage && (
        <div className="message">
          Нет доступных ходов! 😔
        </div>
      )}

      <div className="particles-container">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: particle.color,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
