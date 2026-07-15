import { playerRating } from './rating';
import type { DraftSettings, FantasyTeam, Player, Position } from './types';

export function createTeams(settings: DraftSettings): FantasyTeam[] {
  return Array.from({ length: settings.numTeams }, (_, i) => ({
    id: i,
    name: i === settings.userTeamIndex ? 'Your Team' : `Team ${i + 1}`,
    isUser: i === settings.userTeamIndex,
    players: [],
  }));
}

/** Snake draft order: team indices for every pick across all rounds. */
export function buildPickOrder(settings: DraftSettings): number[] {
  const order: number[] = [];
  for (let round = 0; round < settings.playersPerTeam; round++) {
    const roundOrder = Array.from({ length: settings.numTeams }, (_, i) => i);
    if (round % 2 === 1) roundOrder.reverse();
    order.push(...roundOrder);
  }
  return order;
}

const NEED_WEIGHT = 6;

/** Picks the best-fit available player for a team: talent plus a bonus for filling thin positions. */
export function autoPick(team: FantasyTeam, pool: Player[]): Player {
  const posCounts: Record<string, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  for (const p of team.players) {
    const pos = p.pos as Position;
    if (pos in posCounts) posCounts[pos]++;
  }

  let best = pool[0];
  let bestScore = -Infinity;
  for (const p of pool) {
    const pos = p.pos as Position;
    const count = pos in posCounts ? posCounts[pos] : 0;
    const needBonus = count === 0 ? NEED_WEIGHT : count === 1 ? NEED_WEIGHT * 0.3 : 0;
    const score = playerRating(p) + needBonus;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

export function sortPoolByRating(pool: Player[]): Player[] {
  return [...pool].sort((a, b) => playerRating(b) - playerRating(a));
}
