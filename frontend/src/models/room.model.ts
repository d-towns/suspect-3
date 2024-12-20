import { GameState, MultiGameState, SingleGameState } from "./game-state.model";

export interface GameRoom {
    id: string;
    players: string[];
    host_id: string;
    game_state: MultiGameState | SingleGameState | string | null;
    thread_id: string;
    mode: GameMode
  }

  export type GameMode = 'single' | 'multi'