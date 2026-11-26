# Daily Detour

Walk from Home through checkpoints 1, 2, and 3, then reach the flag. Aim to match par in as few steps as possible. Move with the arrow keys, WASD, the on-screen direction buttons, or by tapping an adjacent street. Practice offers unlimited random maps.

Each local calendar date seeds the same 9×9 city map for everyone playing that date. Breadth-first search verifies that every leg is reachable and calculates par. The generator retries until the shortest route totals 24–46 steps.

## Local development

Run `npm install` and `npm run build`. Serve `dist/client` with any static server and open `game.html` for standalone play. Standalone best scores and streaks are saved in your browser.

## Devvit playtest and upload

Run `npm run login` to sign in, then `npm run dev` to playtest on Reddit. Run `npm run deploy` to check and upload a build. Publishing is a separate step.
