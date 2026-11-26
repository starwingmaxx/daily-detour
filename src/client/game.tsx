import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { showToast } from '@devvit/web/client';
import {
  cellIndex,
  directions,
  distance,
  generateMap,
  GRID_SIZE,
  hashSeed,
  isStreet,
  pointAt,
} from '../shared/detour';
import type { DetourMap, Point } from '../shared/detour';
import {
  finishDaily,
  loadDaily,
  localStats,
  saveLocal,
  todayPuzzle,
} from './daily';
import './index.css';

type Visit = { point: Point; reached: number };
type Stats = {
  username: string;
  streak: number;
  bestSteps: number | null;
  playersToday: number | null;
};
const keys = ['arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
const letters = ['w', 'a', 's', 'd'];
const arrows = ['▲', '◀', '▼', '▶'];
const directionLabels = ['up', 'left', 'down', 'right'];
const hintKey = 'daily-detour-hint-seen';

function firstVisit() {
  try {
    return !localStorage.getItem(hintKey);
  } catch {
    return true;
  }
}

function elapsedTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function countdown(midnight: number, now: number) {
  const seconds = Math.max(0, Math.ceil((midnight - now) / 1000));
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export function Game() {
  const [daily, setDaily] = useState(todayPuzzle);
  const [practice, setPractice] = useState<DetourMap | null>(null);
  const map = practice ?? daily.map;
  const [path, setPath] = useState<Visit[]>([
    { point: daily.map.home, reached: 0 },
  ]);
  const [started, setStarted] = useState<number | null>(null);
  const [finished, setFinished] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const [direction, setDirection] = useState(0);
  const [hint, setHint] = useState(firstVisit);
  const [notice, setNotice] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [stats, setStats] = useState<Stats>(() => localStats(daily.dateKey));
  const [saving, setSaving] = useState(false);
  const remote = useRef<ReturnType<typeof loadDaily> | null>(null);
  const statsVersion = useRef(0);
  const shareField = useRef<HTMLTextAreaElement>(null);
  const practiceSeed = useRef(0);
  const current = path[path.length - 1] ?? { point: map.home, reached: 0 };
  const steps = path.length - 1;
  const seconds =
    started === null
      ? 0
      : Math.max(
          finished === null ? 0 : 1,
          Math.floor(((finished ?? now) - started) / 1000)
        );
  const stars = steps === map.par ? 3 : steps <= map.par + 4 ? 2 : 1;
  const streak = practice ? 0 : stats.streak;
  const share = `🗺️ Daily Detour #${daily.number} — ${'⭐'.repeat(stars)} ${steps} steps (par ${map.par})${streak ? ` · 🔥${streak}` : ''}`;

  useEffect(() => {
    const request = loadDaily(daily.dateKey);
    remote.current = request;
    const version = statsVersion.current;
    void request
      .then((data) => {
        if (remote.current === request && statsVersion.current === version)
          setStats(data);
      })
      .catch(() => {});
    return () => {
      remote.current = null;
    };
  }, [daily.dateKey]);

  const ticking =
    (started !== null && finished === null) ||
    (finished !== null && practice === null);
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [ticking]);

  function reset(next: DetourMap) {
    setPath([{ point: next.home, reached: 0 }]);
    setStarted(null);
    setFinished(null);
    setNotice('');
    setCopyStatus('');
    setDirection(0);
  }

  function randomMap() {
    practiceSeed.current = Math.max(Date.now(), practiceSeed.current + 1);
    const next = generateMap(hashSeed(String(practiceSeed.current)));
    setPractice(next);
    reset(next);
  }

  function backToDaily() {
    const next = todayPuzzle();
    if (next.dateKey !== daily.dateKey) {
      statsVersion.current++;
      setStats(localStats(next.dateKey));
      setDaily(next);
    }
    setPractice(null);
    reset(next.map);
  }

  function move(point: Point) {
    if (
      finished !== null ||
      distance(current.point, point) !== 1 ||
      !isStreet(map, point)
    )
      return;
    const time = Date.now();
    const start = started ?? time;
    const checkpoint = map.checkpoints.findIndex(
      (stop) => distance(stop, point) === 0
    );
    const reached = current.reached + Number(checkpoint === current.reached);
    const goal = distance(map.goal, point) === 0;
    setNotice(
      checkpoint > current.reached || (goal && reached < 3)
        ? `Find checkpoint ${current.reached + 1} first!`
        : ''
    );
    setDirection(
      directions.findIndex(
        (delta) =>
          current.point.x + delta.x === point.x &&
          current.point.y + delta.y === point.y
      )
    );
    setPath([...path, { point, reached }]);
    setStarted(start);
    setNow(time);
    if (hint && steps >= 2) {
      setHint(false);
      try {
        localStorage.setItem(hintKey, '1');
      } catch {
        /* Storage is optional. */
      }
    }

    if (!goal || reached !== 3) return;
    setFinished(time);
    if (practice) return;

    const result = {
      steps: steps + 1,
      seconds: Math.max(1, Math.floor((time - start) / 1000)),
    };
    const request = remote.current;
    const version = ++statsVersion.current;
    const fallback = saveLocal(daily.dateKey, result.steps);
    if (!request) {
      setStats(fallback);
      return;
    }
    setSaving(true);
    void request
      .then(() => finishDaily(daily.dateKey, result))
      .then((saved) => {
        if (statsVersion.current !== version) return;
        saveLocal(daily.dateKey, result.steps, saved);
        setStats((previous) => ({ ...previous, ...saved }));
      })
      .catch(() => {
        if (statsVersion.current === version) setStats(fallback);
      })
      .finally(() => setSaving(false));
  }

  function moveBy(delta: Point) {
    move({ x: current.point.x + delta.x, y: current.point.y + delta.y });
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (finished !== null || event.altKey || event.ctrlKey || event.metaKey)
        return;
      const key = event.key.toLowerCase();
      const index = keys.includes(key)
        ? keys.indexOf(key)
        : letters.indexOf(key);
      const delta = directions[index];
      if (!delta) return;
      event.preventDefault();
      moveBy(delta);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(share);
      setCopyStatus('Copied');
      if (stats.username !== 'you') showToast('Route copied!');
    } catch {
      shareField.current?.focus();
      shareField.current?.select();
      setCopyStatus('Selected. Copy manually.');
    }
  }

  const visited = new Set(path.map(({ point }) => cellIndex(point)));
  const markers = [map.home, ...map.checkpoints, map.goal];
  const shift = ['0 -2px', '-2px 0', '0 2px', '2px 0'][direction];
  const walkerRotation = [0, -90, 180, 90][direction];
  const gameOver = finished !== null;

  return (
    <main className={`game paper ${gameOver ? 'finished' : ''}`}>
      <header className="game-header">
        <div>
          <h1>Daily Detour</h1>
          <p>
            Detour #{daily.number} · {daily.label}
          </p>
        </div>
        <span className="mode">{practice ? 'Practice' : 'Daily'}</span>
      </header>
      <section className="stats" aria-label="Route stats">
        <div>
          <span>Steps</span>
          <strong>{steps}</strong>
        </div>
        <div>
          <span>Par</span>
          <strong>{map.par}</strong>
        </div>
        <div>
          <span>Time</span>
          <strong>{elapsedTime(seconds)}</strong>
        </div>
        {streak > 0 && (
          <div>
            <span>Streak</span>
            <strong>🔥 {streak}</strong>
          </div>
        )}
      </section>
      <ol className="checkpoints" aria-label="Checkpoint progress">
        {['1', '2', '3', '⚑ Goal'].map((label, index) => (
          <li
            key={label}
            data-done={index < current.reached || (index === 3 && gameOver)}
            aria-current={
              !gameOver && index === current.reached ? 'step' : undefined
            }
          >
            {label}
          </li>
        ))}
      </ol>
      <div className="board" aria-label="City map">
        {map.cells.map((cell, index) => {
          const point = pointAt(index);
          const marker = markers.findIndex(
            (stop) => distance(stop, point) === 0
          );
          const label =
            ['Home', 'Checkpoint 1', 'Checkpoint 2', 'Checkpoint 3', 'Goal'][
              marker
            ] ?? cell;
          return (
            <button
              key={index}
              type="button"
              className={`tile ${cell}`}
              data-trail={visited.has(index)}
              aria-label={`${label}, row ${point.y + 1}, column ${point.x + 1}`}
              tabIndex={
                distance(current.point, point) === 1 &&
                cell === 'street' &&
                !gameOver
                  ? 0
                  : -1
              }
              disabled={cell === 'building' || gameOver}
              onClick={() => move(point)}
            >
              {marker >= 0 && (
                <span
                  className={`marker marker-${marker} ${!gameOver && marker === current.reached + 1 ? 'target' : ''}`}
                  aria-hidden="true"
                >
                  {marker === 0 ? '⌂' : marker === 4 ? '🏁' : marker}
                </span>
              )}
            </button>
          );
        })}
        <div
          className="walker-position"
          style={{
            left: `${((current.point.x + 0.5) * 100) / GRID_SIZE}%`,
            top: `${((current.point.y + 0.5) * 100) / GRID_SIZE}%`,
          }}
          aria-hidden="true"
        >
          <div
            className="walker"
            style={{ translate: shift, rotate: `${walkerRotation}deg` }}
          />
        </div>
      </div>
      {!gameOver && (notice || hint) && (
        <p className="hint" role="status">
          {notice ||
            'Tap a street next to you — or use the arrows — to walk. Visit 1, 2, 3 in order, then reach the flag.'}
        </p>
      )}
      {!gameOver ? (
        <div className="controls">
          <button
            onClick={() => {
              setPath(path.slice(0, -1));
              setNotice('');
            }}
            disabled={!steps}
          >
            Undo
          </button>
          <button
            onClick={() => reset(map)}
            disabled={!steps && started === null}
          >
            Reset
          </button>
          <div className="dpad" aria-label="Move">
            {directions.map((delta, index) => (
              <button
                key={index}
                aria-label={`Move ${directionLabels[index]}`}
                onClick={() => moveBy(delta)}
              >
                {arrows[index]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <section className="result" aria-label="Route result">
          <div className="result-top">
            <strong className="stars" aria-label={`${stars} stars`}>
              {'★'.repeat(stars)}
              {'☆'.repeat(3 - stars)}
            </strong>
            <p>
              You: {steps} steps · Par: {map.par} · ⏱ {elapsedTime(seconds)}
            </p>
          </div>
          {!practice && (
            <p className="result-meta" aria-live="polite">
              {saving
                ? 'Saving your route…'
                : [
                    streak > 0 ? `🔥 ${streak}-day streak` : '',
                    stats.playersToday !== null
                      ? `${stats.playersToday} detourers finished today`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
            </p>
          )}
          <div className="share">
            <textarea
              ref={shareField}
              aria-label="Share text"
              readOnly
              value={share}
              rows={2}
            />
            <button onClick={() => void copy()} disabled={saving}>
              Copy
            </button>
          </div>
          {copyStatus && (
            <p className="copy-status" role="status">
              {copyStatus}
            </p>
          )}
          <div className="result-actions">
            {practice && (
              <button onClick={backToDaily}>Back to today's map</button>
            )}
            <button className="primary" onClick={randomMap} disabled={saving}>
              {practice ? 'Another random map' : 'Practice a random map'}
            </button>
          </div>
          {!practice &&
            (now >= daily.midnight ? (
              <button onClick={backToDaily}>Play today's new map</button>
            ) : (
              <p className="countdown">
                See you tomorrow — next map in {countdown(daily.midnight, now)}
              </p>
            ))}
        </section>
      )}
      {!gameOver && (
        <footer className="game-footer">
          <span>
            {stats.username === 'you' ? 'Playing as you' : stats.username}
          </span>
          {!practice && stats.bestSteps !== null && (
            <span>Best today · {stats.bestSteps}</span>
          )}
          <button
            className="text-button"
            onClick={practice ? backToDaily : randomMap}
          >
            {practice ? 'Back to daily' : 'Practice'}
          </button>
        </footer>
      )}
    </main>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Game />);
