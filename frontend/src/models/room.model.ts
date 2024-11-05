import { GameState } from "./game-state.model";

export interface GameRoom {
    id: string;
    players: string[];
    host_id: string;
    game_state: GameState | string | null;
    thread_id: string;
  }