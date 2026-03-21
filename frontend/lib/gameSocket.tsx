"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'connecting' | 'connected' | 'offline';
export type GamePhase = 'COMMIT' | 'REVEAL' | 'RESOLVE' | null;

export type PendingTx = {
  operation: string;
  to: string;
  amount?: string;
  boc: string;
};

export type Player = {
  address: string;
  displayName?: string;
  avatarUrl?: string;
  classType?: string;
  committed?: boolean;
  revealed?: boolean;
  alive: boolean;
};

export type DiceRoll = {
  address: string;
  roll: number;
  diceMax: number;
};

export type GameState = {
  syncStatus: SyncStatus;
  wsUrl: string | null;
  roomId: string | null;
  players: Player[];
  round: number;
  phase: GamePhase;
  winner: string | null;
  results: unknown;
  pendingTx: PendingTx | null;
  error: string | null;
  diceRolls: Map<string, DiceRoll>;
  rollingPlayers: Set<string>;
};

type GameAction =
  | { type: 'WS_STATUS'; status: SyncStatus }
  | { type: 'ROOM_CREATED'; roomId: string }
  | { type: 'LOBBY_STATE'; players: Player[] }
  | { type: 'LOBBY_PLAYER_JOINED'; address: string; displayName?: string; avatarUrl?: string }
  | { type: 'LOBBY_PLAYER_LEFT'; address: string }
  | { type: 'PLAYER_JOINED'; address: string; classType: string }
  | { type: 'GAME_STARTED' }
  | { type: 'COMMIT_PHASE'; round: number }
  | { type: 'REVEAL_PHASE' }
  | { type: 'PLAYER_COMMITTED'; address: string }
  | { type: 'PLAYER_REVEALED'; address: string }
  | { type: 'DICE_ROLLING'; address: string }
  | { type: 'DICE_RESULT'; address: string; roll: number; diceMax: number }
  | { type: 'ROUND_RESULTS'; results: unknown }
  | { type: 'NEXT_ROUND'; round: number; alivePlayers: string[] }
  | { type: 'GAME_OVER'; winner: string }
  | { type: 'TIMEOUT_ELIMINATE'; eliminated: string[] }
  | { type: 'PLAYER_DISCONNECTED'; address: string }
  | { type: 'TX_REQUEST'; pendingTx: PendingTx }
  | { type: 'TX_CONFIRMED' }
  | { type: 'SERVER_ERROR'; message: string };

// ─── URL resolution ───────────────────────────────────────────────────────────

function resolveWebSocketUrl(): string {
  // Use direct property access — Next.js DefinePlugin only replaces
  // process.env.NEXT_PUBLIC_FOO as a full expression, not destructured vars.
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;

  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  if (process.env.NEXT_PUBLIC_WS_HOST) {
    const port = process.env.NEXT_PUBLIC_WS_PORT ?? '4020';
    const raw  = process.env.NEXT_PUBLIC_WS_PATH ?? '';
    const path = raw && !raw.startsWith('/') ? `/${raw}` : raw;
    return `${proto}://${process.env.NEXT_PUBLIC_WS_HOST}:${port}${path}`;
  }

  return `${proto}://${hostname}:4020`;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const initialState: GameState = {
  syncStatus: 'connecting',
  wsUrl: null,
  roomId: null,
  players: [],
  round: 0,
  phase: null,
  winner: null,
  results: null,
  pendingTx: null,
  error: null,
  diceRolls: new Map(),
  rollingPlayers: new Set(),
};

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'WS_STATUS':
      return { ...state, syncStatus: action.status };
    case 'LOBBY_STATE':
      return { ...state, players: action.players };
    case 'LOBBY_PLAYER_JOINED':
      if (state.players.some((p) => p.address === action.address)) return state;
      return {
        ...state,
        players: [...state.players, { address: action.address, displayName: action.displayName, avatarUrl: action.avatarUrl, alive: true }],
      };
    case 'LOBBY_PLAYER_LEFT':
      return { ...state, players: state.players.filter((p) => p.address !== action.address) };
    case 'ROOM_CREATED':
      return { ...state, roomId: action.roomId };
    case 'PLAYER_JOINED':
      if (state.players.some((p) => p.address === action.address)) return state;
      return {
        ...state,
        players: [...state.players, { address: action.address, classType: action.classType, alive: true }],
      };
    case 'GAME_STARTED':
      return { ...state, round: 1 };
    case 'COMMIT_PHASE':
      return {
        ...state,
        phase: 'COMMIT',
        round: action.round,
        players: state.players.map((p) => ({ ...p, committed: false, revealed: false })),
      };
    case 'REVEAL_PHASE':
      return { ...state, phase: 'REVEAL' };
    case 'PLAYER_COMMITTED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.address === action.address ? { ...p, committed: true } : p
        ),
      };
    case 'PLAYER_REVEALED':
      return {
        ...state,
        players: state.players.map((p) =>
          p.address === action.address ? { ...p, revealed: true } : p
        ),
      };
    case 'DICE_ROLLING':
      return {
        ...state,
        rollingPlayers: new Set([...state.rollingPlayers, action.address]),
        diceRolls: new Map(state.diceRolls).set(action.address, {
          address: action.address,
          roll: 0,
          diceMax: 10,
        }),
      };
    case 'DICE_RESULT': {
      const newDiceRolls = new Map(state.diceRolls);
      newDiceRolls.set(action.address, {
        address: action.address,
        roll: action.roll,
        diceMax: action.diceMax,
      });
      return {
        ...state,
        diceRolls: newDiceRolls,
        rollingPlayers: new Set(
          [...state.rollingPlayers].filter((p) => p !== action.address)
        ),
      };
    }
    case 'ROUND_RESULTS':
      return { ...state, results: action.results, phase: 'RESOLVE' };
    case 'NEXT_ROUND':
      return {
        ...state,
        round: action.round,
        phase: null,
        results: null,
        players: state.players.map((p) => ({
          ...p,
          alive: action.alivePlayers.includes(p.address),
        })),
      };
    case 'GAME_OVER':
      return { ...state, winner: action.winner, phase: null };
    case 'TIMEOUT_ELIMINATE':
      return {
        ...state,
        players: state.players.map((p) => ({
          ...p,
          alive: !action.eliminated.includes(p.address),
        })),
      };
    case 'PLAYER_DISCONNECTED':
      return {
        ...state,
        players: state.players.filter((p) => p.address !== action.address),
      };
    case 'TX_REQUEST':
      return { ...state, pendingTx: action.pendingTx };
    case 'TX_CONFIRMED':
      return { ...state, pendingTx: null };
    case 'SERVER_ERROR':
      return { ...state, error: action.message };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type GameSocketContextValue = {
  state: GameState;
  send: (type: string, payload?: Record<string, unknown>) => void;
};

const GameSocketContext = createContext<GameSocketContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameSocketProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  const send = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    const url = resolveWebSocketUrl();

    let active = true;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!active) return;
      dispatch({ type: 'WS_STATUS', status: 'connected' });
    };
    ws.onerror = () => {
      if (!active) return;
      dispatch({ type: 'WS_STATUS', status: 'offline' });
    };
    ws.onclose = () => {
      if (!active) return;
      dispatch({ type: 'WS_STATUS', status: 'offline' });
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!active) return;
      let msg: { type: string; payload: Record<string, unknown> };
      try { msg = JSON.parse(event.data as string); }
      catch { return; }

      const { type, payload } = msg;

      switch (type) {
        case 'LOBBY_STATE':
          dispatch({ type: 'LOBBY_STATE', players: payload.players as Player[] });
          break;
        case 'LOBBY_PLAYER_JOINED':
          dispatch({ type: 'LOBBY_PLAYER_JOINED', address: payload.address as string, displayName: payload.displayName as string | undefined, avatarUrl: payload.avatarUrl as string | undefined });
          break;
        case 'LOBBY_PLAYER_LEFT':
          dispatch({ type: 'LOBBY_PLAYER_LEFT', address: payload.address as string });
          break;
        case 'ROOM_CREATED':
          dispatch({ type: 'ROOM_CREATED', roomId: payload.roomId as string });
          break;
        case 'PLAYER_JOINED':
          dispatch({ type: 'PLAYER_JOINED', address: payload.address as string, classType: payload.classType as string });
          break;
        case 'ROOM_FULL':
          router.push('/selection');
          break;
        case 'GAME_STARTED':
          dispatch({ type: 'GAME_STARTED' });
          router.push('/arena');
          break;
        case 'COMMIT_PHASE':
          dispatch({ type: 'COMMIT_PHASE', round: payload.round as number });
          break;
        case 'REVEAL_PHASE':
          dispatch({ type: 'REVEAL_PHASE' });
          break;
        case 'PLAYER_COMMITTED':
          dispatch({ type: 'PLAYER_COMMITTED', address: payload.address as string });
          break;
        case 'PLAYER_REVEALED':
          dispatch({ type: 'PLAYER_REVEALED', address: payload.address as string });
          break;
        case 'DICE_ROLLING':
          dispatch({ type: 'DICE_ROLLING', address: payload.address as string });
          break;
        case 'DICE_RESULT':
          dispatch({
            type: 'DICE_RESULT',
            address: payload.address as string,
            roll: payload.roll as number,
            diceMax: payload.diceMax as number,
          });
          break;
        case 'ROUND_RESULTS':
          dispatch({ type: 'ROUND_RESULTS', results: payload.results });
          break;
        case 'NEXT_ROUND':
          dispatch({ type: 'NEXT_ROUND', round: payload.round as number, alivePlayers: payload.alivePlayers as string[] });
          break;
        case 'GAME_OVER':
          dispatch({ type: 'GAME_OVER', winner: payload.winner as string });
          router.push('/victory');
          break;
        case 'TIMEOUT_ELIMINATE':
          dispatch({ type: 'TIMEOUT_ELIMINATE', eliminated: payload.eliminated as string[] });
          break;
        case 'PLAYER_DISCONNECTED':
          dispatch({ type: 'PLAYER_DISCONNECTED', address: payload.address as string });
          break;
        case 'TX_REQUEST':
          dispatch({
            type: 'TX_REQUEST',
            pendingTx: {
              operation: payload.operation as string,
              to:        payload.to as string,
              amount:    payload.amount as string | undefined,
              boc:       payload.boc as string,
            },
          });
          break;
        case 'TX_CONFIRMED':
          dispatch({ type: 'TX_CONFIRMED' });
          break;
        case 'ERROR':
          dispatch({ type: 'SERVER_ERROR', message: payload.message as string });
          break;
      }
    };

    return () => {
      active = false;
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose the resolved WS URL in state (stable — URL never changes after mount)
  const wsUrl = useMemo(() => resolveWebSocketUrl(), []);
  const contextValue = useMemo(
    () => ({ state: { ...state, wsUrl }, send }),
    [state, wsUrl, send]
  );

  return (
    <GameSocketContext.Provider value={contextValue}>
      {children}
    </GameSocketContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameSocket() {
  const ctx = useContext(GameSocketContext);
  if (!ctx) throw new Error('useGameSocket must be used within GameSocketProvider');
  return ctx;
}
