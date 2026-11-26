import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  InitResponse,
  FinishResponse,
  FinishRequest,
} from '../../shared/api';
import { dayNumber, previousDateKey } from '../../shared/detour';

export const api = new Hono();

function requestDate(localDate: string | undefined) {
  const utcDate = new Date().toISOString().slice(0, 10);
  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    const timestamp = Date.parse(localDate);
    if (
      Math.abs(timestamp - Date.parse(utcDate)) <= 86400000 &&
      new Date(timestamp).toISOString().startsWith(localDate)
    )
      return localDate;
  }
  return utcDate;
}

async function currentPlayer() {
  const username = await reddit.getCurrentUsername();
  return {
    username: username ?? 'anonymous',
    key: `user:${username ?? (context.userId ? `anonymous:${context.userId}` : 'anonymous')}`,
  };
}

api.get('/init', async (c) => {
  const dateKey = requestDate(c.req.header('X-Detour-Date'));
  const { username, key } = await currentPlayer();
  const [record, players] = await Promise.all([
    redis.hGetAll(key),
    redis.get(`players:${dateKey}`),
  ]);
  const best = record[`best:${dateKey}`];

  return c.json<InitResponse>({
    type: 'init',
    username,
    dateKey,
    dayNumber: dayNumber(dateKey),
    streak: Number(record.streak ?? 0),
    bestSteps: best === undefined ? null : Number(best),
    completedToday: record.lastPlayed === dateKey && best !== undefined,
    playersToday: Number(players ?? 0),
  });
});

function validFinish(value: unknown): value is FinishRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'steps' in value &&
    typeof value.steps === 'number' &&
    Number.isInteger(value.steps) &&
    value.steps >= 10 &&
    value.steps <= 400 &&
    'seconds' in value &&
    typeof value.seconds === 'number' &&
    Number.isInteger(value.seconds) &&
    value.seconds >= 1 &&
    value.seconds <= 7200
  );
}

api.post('/finish', async (c) => {
  const dateKey = requestDate(c.req.header('X-Detour-Date'));
  const input: unknown = await c.req.json().catch(() => null);
  if (!validFinish(input))
    return c.json({ message: 'Invalid steps or seconds' }, 400);

  const { key } = await currentPlayer();
  const flag = `${key}:finished:${dateKey}`;
  const playersKey = `players:${dateKey}`;
  const bestField = `best:${dateKey}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const transaction = await redis.watch(key, flag);
    let queued = false;
    let executed = false;
    try {
      const [record, recorded] = await Promise.all([
        redis.hGetAll(key),
        redis.get(flag),
      ]);
      const previousBest = Number(record[bestField] ?? Infinity);
      const bestSteps = Math.min(input.steps, previousBest);
      const isNewBest = input.steps < previousBest;
      const firstFinish = recorded === null;
      const lastPlayed = record.lastPlayed ?? '';
      let streak = Number(record.streak ?? 0);
      const fields: Record<string, string> = {};
      if (isNewBest) fields[bestField] = String(bestSteps);
      if (firstFinish && lastPlayed < dateKey) {
        streak = lastPlayed === previousDateKey(dateKey) ? streak + 1 : 1;
        fields.lastPlayed = dateKey;
        fields.streak = String(streak);
      }

      await transaction.multi();
      queued = true;
      if (Object.keys(fields).length) await transaction.hSet(key, fields);
      if (firstFinish) {
        await transaction.set(flag, '1');
        await transaction.incrBy(playersKey, 1);
      }
      await transaction.get(playersKey);
      const replies: unknown[] = await transaction.exec();
      executed = true;
      if (!replies.length) continue;

      return c.json<FinishResponse>({
        type: 'finish',
        streak,
        bestSteps,
        playersToday: Number(replies.at(-1) ?? 0),
        isNewBest,
      });
    } finally {
      if (!executed) {
        if (queued) await transaction.discard().catch(() => {});
        else await transaction.unwatch().catch(() => {});
      }
    }
  }
  return c.json({ message: 'Could not save route. Try again.' }, 503);
});
