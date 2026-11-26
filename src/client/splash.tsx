import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { requestExpandedMode } from '@devvit/web/client';
import type { InitResponse } from '../shared/api';
import { loadDaily, todayPuzzle } from './daily';
import './index.css';

const blocks = [0, 2, 3, 9, 11, 13, 16, 20, 23, 24, 27, 29, 32, 33];
const path = [30, 31, 25, 19, 18, 12, 6, 7, 8, 14, 15, 21, 22, 28, 34];
const pins = new Map([
  [30, '⌂'],
  [18, '1'],
  [14, '2'],
  [22, '3'],
  [34, '🏁'],
]);

export function Splash() {
  const [daily] = useState(todayPuzzle);
  const [stats, setStats] = useState<InitResponse>();
  useEffect(() => {
    void loadDaily(daily.dateKey)
      .then(setStats)
      .catch(() => {});
  }, [daily.dateKey]);
  const personal = [
    stats && stats.streak > 0 ? `🔥 ${stats.streak}-day streak` : '',
    stats?.bestSteps != null ? `Best: ${stats.bestSteps}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="splash paper">
      <div className="splash-content">
        <p className="edition">
          Detour #{daily.number} · {daily.label}
        </p>
        <h1>
          Daily
          <br />
          Detour
        </h1>
        <p className="splash-par">
          Today's par <strong>{daily.map.par} steps</strong>
        </p>
        {personal && <p className="personal">{personal}</p>}
        <button
          className="primary play"
          onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
        >
          ▶ Play today's route
        </button>
        <p className="splash-how">
          Visit 1, 2, 3 in order, then reach the flag.
        </p>
      </div>
      <div className="map-stamp" aria-hidden="true">
        {Array.from({ length: 36 }, (_, index) => (
          <div
            key={index}
            className={`tile ${blocks.includes(index) ? 'building' : 'street'}`}
            data-trail={path.includes(index)}
          >
            {pins.has(index) && (
              <span className="marker">{pins.get(index)}</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Splash />);
