import type {
  FinishRequest,
  FinishResponse,
  InitResponse,
} from '../shared/api';
import {
  dateKeyFor,
  dailySeed,
  dayNumber,
  generateMap,
  previousDateKey,
} from '../shared/detour';

const statsKey = 'daily-detour-stats';

export function todayPuzzle() {
  const date = new Date();
  const dateKey = dateKeyFor(date);
  return {
    dateKey,
    label: new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
      .format(date)
      .replace(',', ''),
    number: dayNumber(dateKey),
    map: generateMap(dailySeed(dateKey)),
    midnight: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1
    ).getTime(),
  };
}

type LocalStats = { lastPlayed: string; streak: number; bestSteps: number };

function readLocal(): LocalStats {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(statsKey) ?? 'null');
    if (
      value &&
      typeof value === 'object' &&
      'lastPlayed' in value &&
      typeof value.lastPlayed === 'string' &&
      'streak' in value &&
      typeof value.streak === 'number' &&
      'bestSteps' in value &&
      typeof value.bestSteps === 'number'
    ) {
      return {
        lastPlayed: value.lastPlayed,
        streak: value.streak,
        bestSteps: value.bestSteps,
      };
    }
  } catch {
    // The game can run when browser storage is unavailable.
  }
  return { lastPlayed: '', streak: 0, bestSteps: 0 };
}

export function localStats(dateKey: string) {
  const stats = readLocal();
  return {
    username: 'you',
    streak: stats.streak,
    bestSteps: stats.lastPlayed === dateKey ? stats.bestSteps : null,
    playersToday: null,
  };
}

export function saveLocal(
  dateKey: string,
  steps: number,
  synced?: FinishResponse
) {
  const previous = readLocal();
  const streak =
    synced?.streak ??
    (previous.lastPlayed === dateKey
      ? previous.streak
      : previous.lastPlayed === previousDateKey(dateKey)
        ? previous.streak + 1
        : 1);
  const bestSteps = Math.min(
    steps,
    synced?.bestSteps ?? Infinity,
    previous.lastPlayed === dateKey ? previous.bestSteps : Infinity
  );
  try {
    localStorage.setItem(
      statsKey,
      JSON.stringify({ lastPlayed: dateKey, streak, bestSteps })
    );
  } catch {
    // Keep the result visible even if it cannot be persisted.
  }
  return { username: 'you', streak, bestSteps, playersToday: null };
}

export async function loadDaily(dateKey: string) {
  const response = await fetch('/api/init', {
    headers: { 'X-Detour-Date': dateKey },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Daily stats unavailable');
  const stats: InitResponse = await response.json();
  if (stats.type !== 'init' || stats.dateKey !== dateKey)
    throw new Error('Daily stats unavailable');
  return stats;
}

export async function finishDaily(dateKey: string, result: FinishRequest) {
  const response = await fetch('/api/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Detour-Date': dateKey },
    body: JSON.stringify(result),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Daily finish unavailable');
  const stats: FinishResponse = await response.json();
  if (stats.type !== 'finish') throw new Error('Daily finish unavailable');
  return stats;
}
