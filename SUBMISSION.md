# Daily Detour — Submission Pack
## Reddit's Game of the Day Hackathon (Devpost)

- Hackathon: https://redditgameofday2026.devpost.com/
- Prize pool: $35,000 — Best Daily Game $15,000 / Best Ported Daily Game $6,000 / Honorable Mentions $1,000 × 10 / Devvit Helper $500 × 6 / Feedback Awards $200 × 5
- **Deadline: December 9, 2026, 11:00 JST** (Dec 8, 6:00 PM PST)
- Our entry targets: **Best Daily Game** (this is an original game, NOT a port)
- Project location: `~/workspace/bounty/reddit-game/` (Kinako's workspace)

### Build status (done, no Reddit account needed)
- Full Devvit Web app built on Reddit's official React template (@devvit/web 0.15.4):
  client (splash + game), Hono server (`/api/init`, `/api/finish` with Redis streaks,
  best scores and daily finisher counts), subreddit menu item "Create Daily Detour post".
- Checks all pass: `npm run build` / `npm run test:types` / `npm run test:unit`
  (60 consecutive daily maps + 50 practice seeds verified solvable, par 24–46) / `npm run lint`.
- Played end-to-end in a browser (standalone mode): finished today's map in exactly
  par (32 steps) → ★★★ result card, streak, share text all working.
- Screenshots: `screenshots/splash.png`, `screenshots/game-start.png`,
  `screenshots/game-mid.png`, `screenshots/game-result.png` (attach to the Devpost gallery).

---

## Part 1 — Devpost submission copy (paste-ready, English)

**Project name:** Daily Detour

**Tagline:** A brand-new city route puzzle every day. Walk Home → 1 → 2 → 3 → Flag in as few steps as you can — everyone plays the same map.

**Description:**

Daily Detour is a bite-sized daily puzzle that lives inside a Reddit post. Every day, a new 9×9 city map is generated from the date itself, so every player in the world walks the exact same streets. Starting from Home, you visit three numbered checkpoints in order and finish at the flag. Buildings block the streets, so the shortest route is never a straight line — it's a small daily detour.

Each map is calibrated before it ships: a breadth-first search measures the true shortest route ("par", always between 24 and 46 steps) and the generator keeps re-rolling until every leg of the journey is a real puzzle. Your score is your step count against par — match it for three stars.

**How to play**
- Tap a street next to you, use the on-screen arrows, or use arrow keys / WASD
- Visit checkpoints 1, 2 and 3 in order, then reach the flag
- Undo and Reset are always there — a detour should be relaxing, not punishing
- One focused run takes about 1–3 minutes

**Why it brings players back**
- A fresh, fair, solvable map every day (same map for everyone — perfect for comparing routes in the comments)
- Streaks, personal bests and star ratings on a clear result card
- A one-line share result made for comment threads:
  `🗺️ Daily Detour #15 — ⭐⭐⭐ 32 steps (par 32) · 🔥1`
- "How many detourers finished today" counter on Reddit, so a subreddit can grow a daily ritual together
- Unlimited practice mode with random maps when one run isn't enough

**Built with:** Devvit Web (@devvit/web), React, TypeScript, Vite, Tailwind CSS, Hono, Redis (streaks, bests, daily finisher counts)

**What makes it Reddit-native:** the game is designed around the comment thread — one shared map per day, a comparable score, and a copy-paste result line that starts route debates ("you went *over* the library??"). Any subreddit can adopt it as a daily ritual post.

---

## Part 2 — 残ステップ（松本の作業・合計 約45〜60分）

締切は **12/9 11:00 JST**。以下はすべて無料。**アプリの publish（公開申請）は絶対に押さないこと**（ハッカソン公式が「公開せず upload のまま」を指定。`npm run launch` は使わない）。

1. **Reddit アカウント作成（約5分）** — reddit.com で登録。developers.reddit.com も同じアカウントで使える。
2. **テスト用 subreddit 作成（約3分）** — reddit.com/subreddits/create で自分の subreddit を1つ作る（例: r/DailyDetour。取られていたら r/DailyDetourGame 等）。公開設定（デフォルト）のまま。デモ投稿はこの subreddit に立てる。
3. **Devpost で参加登録（約3分）** — https://redditgameofday2026.devpost.com/ を開き、既存の Devpost アカウント（starwingmaxx）で Join hackathon。
4. **コードを PC に持っていく（約5分）** — GitHub に空リポジトリ https://github.com/starwingmaxx/daily-detour を作成済み。きなこがコードを push したら `git clone` する（VM 側の書き込みロックが解けない場合は、きなこのワークスペースからフォルダ一式を受け取る）。PC 側に **Node.js 24 以上** が必要（`node -v` で確認。古ければ nodejs.org から最新を入れる）。
5. **ログイン（約5分）** — プロジェクトフォルダで `npm install`（約3分）→ `npm run login`（ブラウザで Reddit 認証、約2分）。
6. **Playtest（約10分）** — `npm run dev` を実行すると自分の subreddit にアプリが入る。subreddit を開き、モデレーターメニューの **「Create Daily Detour post」** から投稿を作成（インストール時に自動で1件作られる場合もある）。投稿を開いて実際に1ゲーム最後まで遊び、スマホでも表示を確認する。
7. **Upload（約3分）** — `npm run deploy`（型チェック＋lint＋`devvit upload`）。※ アプリ名 `daily-detour` が既に取られているとエラーになる。その場合は `devvit.json` と `package.json` の `"name"` を `daily-detour-game` 等に変えて再実行（きなこに言ってくれれば直す）。
8. **リンクを2つ控える（約2分）**
   - App listing: https://developers.reddit.com/apps/daily-detour （Apps 一覧から自分のアプリ）
   - Demo post: 手順6で作った公開投稿の URL
9. **Devpost に提出（約10分）** — プロジェクトを作成し、Part 1 の英文を貼り、上の2リンクを登録。カテゴリは **Best Daily Game**。スクリーンショット4点（`screenshots/` フォルダ）もギャラリーに添付。任意で、ハッカソンページにある開発者アンケートに答えると Feedback Award（$200）の対象になる。

### 注意点
- 審査はデモ投稿リンクの実物で採点される。投稿が「公開」になっていて、開いてすぐ遊べる状態にしておくこと。
- アプリ自体は未公開（private upload）のままで資格がある。publish はハッカソン終了後でよい、と公式明記。

---

## Part 3 — 検証記録（きなこ側で実施済み）

- 公式ページで確認した要件: Devvit Web 製であること / 提出物は App listing リンク＋デモ投稿リンク（動画は任意）/ publish 不要 / 審査軸は Delightful UX・Polish・Reddit-y・Daily Content。
- ローカル動作確認（スタンドアロンモード）: 静的サーバーで `dist/client/game.html` を開き、キーボード操作で本日のマップ（Detour #15、par 32）を実際にクリア。結果カード（★★★・ストリーク・共有テキスト・翌日カウントダウン）まで表示確認済み。スクリーンショット4点を `screenshots/` に保存。
- サーバーは Reddit 上でのみ動作（Redis / Reddit API を使用）。スタンドアロン時は localStorage にフォールバックする設計。
- 既知の小さな注意: この VM のファイル同期レイヤーの都合で、VM 内からの git push と再ビルドが一時的に EPERM で失敗した。ソースは完成しており、PC 側（または Codex 経由）でのビルドは問題ない想定。dist/ は最終ソースからビルド済み。
