import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import {
  dailySeed,
  dayNumber,
  generateMap,
  isStreet,
  solvePar,
} from './detour.ts';
import type { DetourMap } from './detour.ts';

function checkMap(map: DetourMap) {
  assert.equal(map.cells.length, 81);
  assert.ok(
    [map.home, ...map.checkpoints, map.goal].every((point) =>
      isStreet(map, point)
    )
  );
  assert.equal(solvePar(map), map.par);
  assert.ok(map.par >= 24 && map.par <= 46);
}

void test('60 consecutive daily puzzles are reproducible and calibrated', () => {
  const maps = new Set<string>();
  for (let day = 0; day < 60; day++) {
    const date = new Date(Date.UTC(2026, 10, 11 + day))
      .toISOString()
      .slice(0, 10);
    const seed = dailySeed(date);
    const map = generateMap(seed);
    checkMap(map);
    assert.equal(dayNumber(date), day + 1);
    assert.equal(JSON.stringify(map), JSON.stringify(generateMap(seed)));
    const { cells, home, checkpoints, goal } = map;
    maps.add(JSON.stringify({ cells, home, checkpoints, goal }));
  }
  assert.ok(maps.size >= 58);
});

void test('50 random practice seeds yield solvable puzzles', () => {
  for (let i = 0; i < 50; i++)
    checkMap(generateMap(randomBytes(4).readUInt32LE()));
});
