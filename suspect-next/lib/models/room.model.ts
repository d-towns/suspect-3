
import { z } from 'zod';
import { GameStateSchema } from './game-state.model';

export const GameRoomSchema = z.object({
  id: z.string(),
  players: z.array(z.string()),
  host_id: z.string(),
  game_state: GameStateSchema.or(z.string()).nullable(),
  thread_id: z.string(),
  mode: z.string(),
});

export type GameRoom = z.infer<typeof GameRoomSchema>;