import { teamRating } from './rating';
import type { BracketResult, FantasyTeam, SeriesGameResult, SeriesResult } from './types';

function gaussianRandom(mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * std;
}

const BASELINE_SCORE = 104;
const RATING_TO_POINTS = 0.15;
const NOISE_STD = 10;

function simulateGame(
  gameNumber: number,
  teamA: FantasyTeam,
  teamB: FantasyTeam,
  ratingA: number,
  ratingB: number
): SeriesGameResult {
  let scoreA = Math.round(BASELINE_SCORE + ratingA * RATING_TO_POINTS + gaussianRandom(0, NOISE_STD));
  let scoreB = Math.round(BASELINE_SCORE + ratingB * RATING_TO_POINTS + gaussianRandom(0, NOISE_STD));
  if (scoreA === scoreB) scoreA += 1; // no ties in basketball
  return {
    gameNumber,
    teamAScore: scoreA,
    teamBScore: scoreB,
    winnerTeamId: scoreA > scoreB ? teamA.id : teamB.id,
  };
}

export function simulateSeries(teamA: FantasyTeam, teamB: FantasyTeam, round: number): SeriesResult {
  const ratingA = teamRating(teamA).overall;
  const ratingB = teamRating(teamB).overall;

  const games: SeriesGameResult[] = [];
  let winsA = 0;
  let winsB = 0;
  let gameNumber = 0;

  while (winsA < 4 && winsB < 4) {
    gameNumber++;
    const game = simulateGame(gameNumber, teamA, teamB, ratingA, ratingB);
    games.push(game);
    if (game.winnerTeamId === teamA.id) winsA++;
    else winsB++;
  }

  return {
    round,
    teamA,
    teamB,
    games,
    winner: winsA > winsB ? teamA : teamB,
    teamAWins: winsA,
    teamBWins: winsB,
  };
}

/** Standard single-elimination seeding order for a bracket of size `size` (a power of 2). */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const doubled = order.length * 2 + 1;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, doubled - seed);
    }
    order = next;
  }
  return order;
}

export function simulateBracket(teamsInput: FantasyTeam[]): BracketResult {
  const seeded = [...teamsInput].sort((a, b) => teamRating(b).overall - teamRating(a).overall);
  const bracketSize = 2 ** Math.ceil(Math.log2(seeded.length));
  const order = seedOrder(bracketSize);
  const slots: (FantasyTeam | null)[] = order.map((seed) => seeded[seed - 1] ?? null);

  const rounds: SeriesResult[][] = [];
  let current = slots;
  let roundNum = 1;

  while (current.length > 1) {
    const next: (FantasyTeam | null)[] = [];
    const roundResults: SeriesResult[] = [];

    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1];

      if (a && b) {
        const result = simulateSeries(a, b, roundNum);
        roundResults.push(result);
        next.push(result.winner);
      } else {
        // bye
        next.push(a ?? b);
      }
    }

    if (roundResults.length > 0) rounds.push(roundResults);
    current = next;
    roundNum++;
  }

  return { rounds, champion: current[0]! };
}
