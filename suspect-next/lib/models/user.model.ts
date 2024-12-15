
import { z } from 'zod';

export const LobbyUserSchema = z.object({
  email: z.string(),
  username: z.string(),
  id: z.string(),
  isReady: z.boolean(),
});

export type LobbyUser = z.infer<typeof LobbyUserSchema>;