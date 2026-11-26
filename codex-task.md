# Task: Build "Daily Detour" — a daily route puzzle game on this Devvit Web template

You are working in an existing clone of Reddit's official `devvit-template-react`
(React 19 + Tailwind CSS 4 + Vite client, Hono server, @devvit/web 0.15.4).
Read `AGENTS.md` first and follow it (Devvit Web only — never use
`@devvit/public-api` or blocks; type aliases over interfaces; named exports;
never cast types).

Explain your design decisions in prose as you go, work in several genuine
passes (core logic first, then client, then server, then polish/tests), and
run the project's own checks at the end.

## The game: Daily Detour

A bite-sized daily puzzle. Every player gets the SAME city map each day
(generated deterministically from the date). Walk from Home to the Goal,
visiting three numbered checkpoints in order (1 → 2 → 3), stepping only on
streets (not through buildings). Fewer steps is better: the map has a known
optimal length ("par"). One focused 1–3 minute session per day, plus an
unlimited practice mode with random maps.

### Core logic — `src/shared/detour.ts` (new file, pure TS, no imports from client/server)

- `mulberry32(seed: number)` PRNG and `hashSeed(str: string)` (FNV-1a or similar).
- Grid: 9 columns × 9 rows. Cell kinds: street, building (wall).
- `generateMap(seed: number): DetourMap`:
  - Scatter buildings with the PRNG (roughly 18–24% density, never on reserved cells).
  - Choose Home, checkpoint 1/2/3, Goal at spread-out positions (minimum Manhattan
    distance between key points, e.g. ≥ 3).
  - Guarantee: BFS path exists Home → 1 → 2 → 3 → Goal through streets.
  - Compute `par` = total BFS shortest length for the ordered route.
  - Calibrate difficulty: retry with incremented seeds until par is within
    24–46 steps AND each leg is ≥ 4 steps. Return the winning seed offset so
    generation stays deterministic.
- `dailySeed(dateKey: string)` from a `YYYY-MM-DD` string; `dateKeyFor(date)` using
  the player's LOCAL date; `dayNumber(dateKey)` = days since 2026-11-11 (min 1).
- `solvePar(map)` BFS helper (also used by tests).
- Types: `DetourMap`, `Point`, `GameResult` etc. as type aliases.

### Unit tests — `src/shared/detour.test.ts`

Using `node:test` (the repo's `test:unit` script runs `src/**/*.test.ts`):
- For 60 consecutive dates starting 2026-11-11: map is solvable in order,
  par within 24–46, generation is deterministic (same date → identical map JSON),
  different dates give different maps (allow at most 2 collisions).
- Practice seeds: 50 random seeds all solvable.

### Server — replace the counter demo

- `src/shared/api.ts`: replace counter types with:
  - `InitResponse { type: 'init'; username: string; dateKey: string; dayNumber: number; streak: number; bestSteps: number | null; completedToday: boolean; playersToday: number }`
  - `FinishRequest { steps: number; seconds: number }`
  - `FinishResponse { type: 'finish'; streak: number; bestSteps: number; playersToday: number; isNewBest: boolean }`
- `src/server/routes/api.ts`:
  - `GET /api/init`: username via `reddit.getCurrentUsername()` (fallback
    'anonymous'), dateKey/dayNumber computed server-side (UTC is fine),
    per-user record in Redis hash `user:<username>` with fields
    `lastPlayed`, `streak`, `best:<dateKey>`; `completedToday` = lastPlayed == today
    AND a finish was recorded; `playersToday` from Redis key `players:<dateKey>`.
    Streak rule: if lastPlayed is yesterday → streak continues (value stored at
    finish time); if older → streak shown is the stored one but finishing today
    resets to 1. Implement streak updates in finish; init only reads.
  - `POST /api/finish`: validate steps (10–400) and seconds (1–7200); record
    best (min) per user per day; if first finish today: update streak
    (yesterday → +1, today already → same, older → 1), set lastPlayed, and
    increment `players:<dateKey>` exactly once per user per day (guard with a
    per-user-per-day flag key). Return FinishResponse.
  - Remove /increment and /decrement.
- `src/server/core/post.ts`: post title becomes
  `Daily Detour #<dayNumber> — find today's shortest route!` (compute dayNumber
  from the shared helper with the current date).
- Keep menu `/internal/menu/post-create` and the onAppInstall trigger working.

### devvit.json / package.json cleanup

- Set `"name": "daily-detour"` in BOTH devvit.json and package.json.
- Menu: keep only the post-create item, relabel to "Create Daily Detour post",
  description "Daily Detour — a new route puzzle every day".
- Remove the example form: delete the `forms` block from devvit.json, delete
  `src/server/routes/forms.ts`, remove its mounting in `src/server/index.ts`,
  and remove the `/example-form` handler from `src/server/routes/menu.ts`.
- Check the installed @devvit/web package (node_modules) for whether
  devvit.json supports a `permissions` object in this version; if the schema
  supports it, add `"permissions": { "redis": true, "reddit": true }`,
  otherwise leave the config as the template ships and say so in your summary.
- Delete `src/client/hooks/useCounter.ts` (no longer used).

### Client — `src/client/game.tsx` (expanded view) and `splash.tsx` (inline view)

Design language (this matters — the game must NOT look like a generic template):
warm paper-map aesthetic. Cream background (#faf6ee), ink-navy text (#1f2a37),
streets in soft sand (#efe6d0), buildings in muted slate-rose blocks with tiny
roof lines, route trail in vivid orange (#e4572e), checkpoints as numbered
amber pins, Home as a house marker, Goal as a checkered flag marker. Rounded
corners, soft shadows, system font stack with strong numerals. NO Snoo image,
NO Reddit branding, no lorem ipsum. Everything must fit the viewport without
page scroll on a phone (grid sized via min(92vw, 46vh, 430px)).

Game screen layout (top → bottom):
1. Header: "DAILY DETOUR" wordmark + "Detour #<n> · <Mon 12 Jan>" + mode badge
   (Daily / Practice).
2. Stat strip: Steps (big) · Par · Time (m:ss, ticks while playing) · streak flame "🔥 n" (only if ≥1).
3. Checkpoint chips: ①②③ that fill in as reached, then Goal chip.
4. The grid: CSS grid of buttons. Player token (a walker dot with direction
   ring) moves with a short transition. Visited trail shown as dotted/footprint
   path. Buildings are solid blocks; streets light. Next-checkpoint pulses.
5. Controls row: Undo · Reset · D-pad (▲▼◀▶) for touch. Also support:
   clicking/tapping an adjacent street cell moves there; Arrow keys / WASD.
   Stepping onto a checkpoint out of order is impossible by design (checkpoints
   are walkable streets; only the CURRENT target checkpoint "counts" — show a
   small toast/hint "Find checkpoint 1 first!" if stepping on a later one early;
   stepping on it doesn't break anything).
6. Finish state: replace controls with a result card — stars (★★★ if steps == par,
   ★★ if steps ≤ par + 4, ★ otherwise), "You: N steps · Par: M · ⏱ t", streak line,
   players-today count when known ("128 detourers finished today"), a share-text
   block with a Copy button (uses clipboard + showToast from @devvit/web/client
   with a graceful fallback), buttons: "Practice a random map" and (in daily
   mode) "See you tomorrow — next map in HH:MM:SS" countdown (static text ok,
   ticking is nicer). Share text format exactly:
   `🗺️ Daily Detour #<n> — <stars as ⭐ repeated> <steps> steps (par <par>) · 🔥<streak>`
   (omit the streak part when streak is 0).
7. First-visit hint: one line under the grid for the first game only:
   "Tap a street next to you — or use the arrows — to walk. Visit 1, 2, 3 in order, then reach the flag." Dismiss once finished or after first moves.

State & data flow:
- On mount, client computes today's map locally from dateKey (local timezone)
  via shared logic — the game must be fully playable even if /api/init fails
  (standalone mode: stats in localStorage key `daily-detour-stats`, username
  shown as "you"). Try /api/init first; on success use server stats (streak,
  best, playersToday) and POST /api/finish on completion; on failure use
  localStorage equivalents with the same streak rules.
- Practice mode: seed from Date.now(); finishing practice shows the same result
  card minus streak/players, with "Back to today's map" + "Another random map".
- Timer starts on first move, stops at goal.

Splash screen (inline, keep it light — no game grid):
- Same paper-map styling, mini decorative map motif (a small static grid made
  of divs is fine), game name, "Detour #<n> · <date>", "Today's par: <par> steps",
  personal line from /api/init when available ("🔥 3-day streak · Best: 31"),
  big orange "▶ Play today's route" button calling
  `requestExpandedMode(e.nativeEvent, 'game')`, and one-line how-to.
- Remove the template footer links and Snoo image from both views.

### README.md

Rewrite briefly: what the game is, how the daily map works, local dev
(`npm install`, `npm run build`, open dist/client/game.html via any static
server for standalone mode), and the Devvit flow (`npm run login`,
`npm run dev` for playtest, `npm run deploy` to upload — do NOT publish).

## Checks (must all pass before you finish)

- `npm run build`
- `npm run test:types`
- `npm run test:unit`
- `npm run lint`

Fix whatever fails. In your final summary, describe: the generation/calibration
approach, any Devvit config findings (permissions), and the check results.
