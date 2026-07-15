import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import playersData from '../data/players.json';
import { autoPick, buildPickOrder, createTeams } from '../lib/draft';
import { createBracket, simulateAllRemaining, simulateNextSeries, simulateRound } from '../lib/simulate';
import type { BracketState, DraftPick, DraftSettings, FantasyTeam, Player } from '../lib/types';

type Phase = 'setup' | 'drafting' | 'teams' | 'bracket';

interface DraftState {
  phase: Phase;
  settings: DraftSettings;
  teams: FantasyTeam[];
  pool: Player[];
  pickOrder: number[];
  currentPickIdx: number;
  picks: DraftPick[];
  bracket: BracketState | null;
  lastPick: DraftPick | null;
}

type Action =
  | { type: 'START_DRAFT'; settings: DraftSettings }
  | { type: 'USER_PICK'; player: Player }
  | { type: 'AUTO_DRAFT_REST' }
  | { type: 'SIMULATE_BRACKET' }
  | { type: 'SIM_NEXT_SERIES' }
  | { type: 'SIM_ROUND'; roundIdx: number }
  | { type: 'SIM_ALL' }
  | { type: 'RESET' };

const allPlayers = playersData as Player[];

const initialState: DraftState = {
  phase: 'setup',
  settings: { numTeams: 8, playersPerTeam: 8, userTeamIndex: 0 },
  teams: [],
  pool: allPlayers,
  pickOrder: [],
  currentPickIdx: 0,
  picks: [],
  bracket: null,
  lastPick: null,
};

function makePick(
  teams: FantasyTeam[],
  pool: Player[],
  picks: DraftPick[],
  numTeams: number,
  currentPickIdx: number,
  teamId: number,
  player: Player
): { teams: FantasyTeam[]; pool: Player[]; picks: DraftPick[]; lastPick: DraftPick } {
  const newTeams = teams.map((t) => (t.id === teamId ? { ...t, players: [...t.players, player] } : t));
  const newPool = pool.filter((p) => p.id !== player.id);
  const pick: DraftPick = {
    round: Math.floor(currentPickIdx / numTeams) + 1,
    pickInRound: (currentPickIdx % numTeams) + 1,
    overallPick: currentPickIdx + 1,
    teamId,
    player,
  };
  return { teams: newTeams, pool: newPool, picks: [...picks, pick], lastPick: pick };
}

/** Auto-picks for every AI team in sequence until it's the user's turn or the draft ends. */
function advanceAIQueue(state: DraftState): DraftState {
  let { teams, pool, picks, currentPickIdx } = state;
  const { pickOrder, settings } = state;
  let lastPick = state.lastPick;

  while (currentPickIdx < pickOrder.length && pickOrder[currentPickIdx] !== settings.userTeamIndex) {
    const teamId = pickOrder[currentPickIdx];
    const team = teams.find((t) => t.id === teamId)!;
    const player = autoPick(team, pool);
    ({ teams, pool, picks, lastPick } = makePick(
      teams,
      pool,
      picks,
      settings.numTeams,
      currentPickIdx,
      teamId,
      player
    ));
    currentPickIdx++;
  }

  const phase: Phase = currentPickIdx >= pickOrder.length ? 'teams' : 'drafting';
  return { ...state, teams, pool, picks, currentPickIdx, phase, lastPick };
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
        picks: [],
        phase: 'drafting',
      };
      return advanceAIQueue(started);
    }
    case 'USER_PICK': {
      if (state.phase !== 'drafting') return state;
      const teamId = state.pickOrder[state.currentPickIdx];
      const { teams, pool, picks, lastPick } = makePick(
        state.teams,
        state.pool,
        state.picks,
        state.settings.numTeams,
        state.currentPickIdx,
        teamId,
        action.player
      );
      const next: DraftState = {
        ...state,
        teams,
        pool,
        picks,
        lastPick,
        currentPickIdx: state.currentPickIdx + 1,
      };
      return advanceAIQueue(next);
    }
    case 'AUTO_DRAFT_REST': {
      let { teams, pool, picks, currentPickIdx } = state;
      const { pickOrder, settings } = state;
      let lastPick = state.lastPick;
      while (currentPickIdx < pickOrder.length) {
        const teamId = pickOrder[currentPickIdx];
        const team = teams.find((t) => t.id === teamId)!;
        const player = autoPick(team, pool);
        ({ teams, pool, picks, lastPick } = makePick(
          teams,
          pool,
          picks,
          settings.numTeams,
          currentPickIdx,
          teamId,
          player
        ));
        currentPickIdx++;
      }
      return { ...state, teams, pool, picks, currentPickIdx, phase: 'teams', lastPick };
    }
    case 'SIMULATE_BRACKET': {
      const bracket = createBracket(state.teams);
      return { ...state, bracket, phase: 'bracket' };
    }
    case 'SIM_NEXT_SERIES': {
      if (!state.bracket) return state;
      return { ...state, bracket: simulateNextSeries(state.bracket) };
    }
    case 'SIM_ROUND': {
      if (!state.bracket) return state;
      return { ...state, bracket: simulateRound(state.bracket, action.roundIdx) };
    }
    case 'SIM_ALL': {
      if (!state.bracket) return state;
      return { ...state, bracket: simulateAllRemaining(state.bracket) };
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
