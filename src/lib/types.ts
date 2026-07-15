export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface Player {
  id: number;
  name: string;
  pos: Position | string;
  team: string;
  age: number;
  gp: number;
  gs: number;
  mpg: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  ppg: number;
}

export interface DraftSettings {
  numTeams: number;
  playersPerTeam: number;
  userTeamIndex: number;
}

export interface FantasyTeam {
  id: number;
  name: string;
  isUser: boolean;
  players: Player[];
}

export interface DraftPick {
  round: number;
  pickInRound: number;
  overallPick: number;
  teamId: number;
  player: Player;
}

export type DraftPhase = 'setup' | 'drafting' | 'complete';

export interface SeriesGameResult {
  gameNumber: number;
  teamAScore: number;
  teamBScore: number;
  winnerTeamId: number;
}

export interface SeriesResult {
  round: number;
  teamA: FantasyTeam;
  teamB: FantasyTeam;
  games: SeriesGameResult[];
  winner: FantasyTeam;
  teamAWins: number;
  teamBWins: number;
}

export interface Matchup {
  teamA: FantasyTeam | null;
  teamB: FantasyTeam | null;
  result: SeriesResult | null;
  winner: FantasyTeam | null;
  isBye: boolean;
}

export interface BracketState {
  rounds: Matchup[][];
  champion: FantasyTeam | null;
}
