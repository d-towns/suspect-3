
import { z } from 'zod';

export const InviteSchema = z.object({
  id: z.string(),
  sender_user_id: z.string(),
  recipient_user_email: z.string(),
  game_id: z.string(),
  accepted: z.boolean(),
  invite_code: z.string(),
  expires_at: z.string(),
});

export type Invite = z.infer<typeof InviteSchema>;