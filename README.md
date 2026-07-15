# 🏀 Hoops Draft Sim

Draft fantasy-style basketball teams from a live pool of current NBA players, then
simulate a best-of-7 single-elimination bracket to crown a champion — all based on
real 2025-26 season per-game stats and roster fit.

**[Play it live](https://sachinsharma30.github.io/hoops-draft/)**

## How it works

1. **Setup** — choose number of teams and roster size. The player pool is every
   current NBA player with real per-game stats for the season.
2. **Draft** — a snake draft against AI opponents. Pick your team, or auto-draft
   the rest. AI teams draft by player value with a bonus for filling open
   positions.
3. **Team rating** — each roster is scored on core talent (top-5 rated players),
   positional fit (variety across the starting five), scoring balance, and bench
   depth.
4. **Bracket** — teams are seeded by rating into a single-elimination bracket.
   Every series is simulated game-by-game as a best-of-7, with each team's rating
   driving expected scoring margin plus randomness, until a champion is crowned.

## Stack

- React + TypeScript + Vite
- No backend — everything runs client-side, state is in-memory per session
- Player data scraped from [Basketball-Reference](https://www.basketball-reference.com/)
  season per-game stats

## Development

```bash
npm install
npm run dev
```

## Roadmap

- Online multiplayer drafts
- Configurable player pools (all-time greats, specific eras, custom pools)
