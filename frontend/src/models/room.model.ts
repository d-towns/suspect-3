import { GameState } from "./game-state.model";

export interface Room {
    id: string;
    players: string[];
    host_id: string;
    game_state: GameState | string | null;
  }