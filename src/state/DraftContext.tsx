import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import playersData from '../data/players.json';
import { autoPick, buildPickOrder, createTeams } from '../lib/draft';
import { simulateBracket } from '../lib/simulate';
import type { BracketResult, DraftSettings, FantasyTeam, Player } from '../lib/types';

type Phase = 'setup' | 'drafting' | 'teams' | 'bracket';

interface DraftState {
  phase: Phase;
  settings: DraftSettings;
  teams: FantasyTeam[];
  pool: Player[];
  pickOrder: number[];
  currentPickIdx: number;
  bracket: BracketResult | null;
  lastPick: { teamId: number; player: Player } | null;
}

type Action =
  | { type: 'START_DRAFT'; settings: DraftSettings }
  | { type: 'USER_PICK'; player: Player }
  | { type: 'AUTO_DRAFT_REST' }
  | { type: 'SIMULATE_BRACKET' }
  | { type: 'RESET' };

const allPlayers = playersData as Player[];

const initialState: DraftState = {
  phase: 'setup',
  settings: { numTeams: 8, playersPerTeam: 8, userTeamIndex: 0 },
  teams: [],
  pool: allPlayers,
  pickOrder: [],
  currentPickIdx: 0,
  bracket: null,
  lastPick: null,
};

function pickForTeam(
  teams: FantasyTeam[],
  pool: Player[],
  teamId: number,
  player: Player
): { teams: FantasyTeam[]; pool: Player[] } {
  const newTeams = teams.map((t) => (t.id === teamId ? { ...t, players: [...t.players, player] } : t));
  const newPool = pool.filter((p) => p.id !== player.id);
  return { teams: newTeams, pool: newPool };
}

/** Auto-picks for every AI team in sequence until it's the user's turn or the draft ends. */
function advanceAIQueue(state: DraftState): DraftState {
  let { teams, pool, currentPickIdx } = state;
  const { pickOrder, settings } = state;
  let lastPick = state.lastPick;

  while (currentPickIdx < pickOrder.length && pickOrder[currentPickIdx] !== settings.userTeamIndex) {
    const teamId = pickOrder[currentPickIdx];
    const team = teams.find((t) => t.id === teamId)!;
    const player = autoPick(team, pool);
    ({ teams, pool } = pickForTeam(teams, pool, teamId, player));
    lastPick = { teamId, player };
    currentPickIdx++;
  }

  const phase: Phase = currentPickIdx >= pickOrder.length ? 'teams' : 'drafting';
  return { ...state, teams, pool, currentPickIdx, phase, lastPick };
}

function reducer(state: DraftState, action: Action): DraftState {
  switch (action.type) {
    case 'START_DRAFT': {
      const teams = createTeams(action.settings);
      const pickOrder = buildPickOrder(action.settings);
      const started: DraftState = {
        ...initialState,
        settings: action.settings,
        teams,
        pool: allPlayers,
        pickOrder,
        currentPickIdx: 0,
        phase: 'drafting',
      };
      return advanceAIQueue(started);
    }
    case 'USER_PICK': {
      if (state.phase !== 'drafting') return state;
      const teamId = state.pickOrder[state.currentPickIdx];
      const { teams, pool } = pickForTeam(state.teams, state.pool, teamId, action.player);
      const next: DraftState = {
        ...state,
        teams,
        pool,
        currentPickIdx: state.currentPickIdx + 1,
        lastPick: { teamId, player: action.player },
      };
      return advanceAIQueue(next);
    }
    case 'AUTO_DRAFT_REST': {
      let { teams, pool, currentPickIdx } = state;
      const { pickOrder } = state;
      let lastPick = state.lastPick;
      while (currentPickIdx < pickOrder.length) {
        const teamId = pickOrder[currentPickIdx];
        const team = teams.find((t) => t.id === teamId)!;
        const player = autoPick(team, pool);
        ({ teams, pool } = pickForTeam(teams, pool, teamId, player));
        lastPick = { teamId, player };
        currentPickIdx++;
      }
      return { ...state, teams, pool, currentPickIdx, phase: 'teams', lastPick };
    }
    case 'SIMULATE_BRACKET': {
      const bracket = simulateBracket(state.teams);
      return { ...state, bracket, phase: 'bracket' };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface DraftContextValue extends DraftState {
  dispatch: React.Dispatch<Action>;
  currentTeamId: number | null;
  isUserTurn: boolean;
  pickNumber: number;
  totalPicks: number;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<DraftContextValue>(() => {
    const currentTeamId =
      state.phase === 'drafting' && state.currentPickIdx < state.pickOrder.length
        ? state.pickOrder[state.currentPickIdx]
        : null;
    return {
      ...state,
      dispatch,
      currentTeamId,
      isUserTurn: currentTeamId === state.settings.userTeamIndex,
      pickNumber: state.currentPickIdx + 1,
      totalPicks: state.pickOrder.length,
    };
  }, [state]);

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used within DraftProvider');
  return ctx;
}
