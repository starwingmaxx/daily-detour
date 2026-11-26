export const GRID_SIZE = 9;
export type Point = { x: number; y: number };
export type DetourMap = {
  cells: ('street' | 'building')[];
  home: Point;
  checkpoints: [Point, Point, Point];
  goal: Point;
  par: number;
  seed: number;
  seedOffset: number;
};
export type GameResult = { steps: number; seconds: number };

export const directions = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 0 },
];

export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash ^ str.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

export const dailySeed = (dateKey: string) =>
  hashSeed(`daily-detour:${dateKey}`);
const pad = (value: number) => String(value).padStart(2, '0');
export function dateKeyFor(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function previousDateKey(dateKey: string) {
  return new Date(Date.parse(dateKey) - 86400000).toISOString().slice(0, 10);
}
export function dayNumber(dateKey: string) {
  return Math.max(
    1,
    (Date.parse(dateKey) - Date.UTC(2026, 10, 11)) / 86400000 + 1
  );
}

export const cellIndex = ({ x, y }: Point) => y * GRID_SIZE + x;
export const pointAt = (index: number): Point => ({
  x: index % GRID_SIZE,
  y: Math.floor(index / GRID_SIZE),
});
export const distance = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export function isStreet(map: DetourMap, { x, y }: Point) {
  return (
    x >= 0 &&
    x < GRID_SIZE &&
    y >= 0 &&
    y < GRID_SIZE &&
    map.cells[cellIndex({ x, y })] === 'street'
  );
}

function shortestLeg(map: DetourMap, start: Point, goal: Point) {
  const queue = [{ point: start, steps: 0 }];
  const seen = new Set([cellIndex(start)]);
  for (const { point, steps } of queue) {
    if (distance(point, goal) === 0) return steps;
    for (const direction of directions) {
      const next = { x: point.x + direction.x, y: point.y + direction.y };
      const index = cellIndex(next);
      if (!isStreet(map, next) || seen.has(index)) continue;
      seen.add(index);
      queue.push({ point: next, steps: steps + 1 });
    }
  }
  return Infinity;
}

function routeLegs(map: DetourMap) {
  const [first, second, third] = map.checkpoints;
  return [
    shortestLeg(map, map.home, first),
    shortestLeg(map, first, second),
    shortestLeg(map, second, third),
    shortestLeg(map, third, map.goal),
  ];
}

export function solvePar(map: DetourMap) {
  return routeLegs(map).reduce((sum, steps) => sum + steps, 0);
}

export function generateMap(seed: number): DetourMap {
  for (let seedOffset = 0; ; seedOffset++) {
    const winningSeed = (seed + seedOffset) >>> 0;
    const random = mulberry32(winningSeed);
    let candidates = Array.from({ length: GRID_SIZE ** 2 }, (_, index) =>
      pointAt(index)
    );
    const takeStop = () => {
      const stop = candidates[Math.floor(random() * candidates.length)];
      if (stop)
        candidates = candidates.filter((point) => distance(stop, point) >= 3);
      return stop;
    };
    const [home, first, second, third, goal] = Array.from(
      { length: 5 },
      takeStop
    );
    if (!home || !first || !second || !third || !goal) continue;
    const reserved = new Set([home, first, second, third, goal].map(cellIndex));
    const cells: DetourMap['cells'] = Array.from(
      { length: GRID_SIZE ** 2 },
      () => 'street'
    );
    const streets = cells
      .map((_, index) => index)
      .filter((index) => !reserved.has(index));
    const buildings = 15 + Math.floor(random() * 5);
    for (let i = 0; i < buildings; i++) {
      const [index] = streets.splice(Math.floor(random() * streets.length), 1);
      if (index !== undefined) cells[index] = 'building';
    }
    const map: DetourMap = {
      cells,
      home,
      checkpoints: [first, second, third],
      goal,
      par: 0,
      seed: winningSeed,
      seedOffset,
    };
    const legs = routeLegs(map);
    map.par = legs.reduce((sum, steps) => sum + steps, 0);
    if (map.par >= 24 && map.par <= 46 && legs.every((steps) => steps >= 4))
      return map;
  }
}
