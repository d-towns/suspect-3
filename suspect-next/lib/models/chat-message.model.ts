
import { z } from 'zod';

export const ChatMessageSchema = z.object({
  userEmail: z.string(),
  message: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;