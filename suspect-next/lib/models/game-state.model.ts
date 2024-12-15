
import { z } from 'zod';

export const ConversationExchangeSchema = z.object({
  speaker: z.string(),
  message: z.string(),
});

export const ConversationItemSchema = z.object({
  audioTranscript: z.string(),
  timestamp: z.number(),
  speaker: z.enum(['user', 'assistant']),
});

export const VotingRoundVoteSchema = z.object({
  playerId: z.string(),
  voterId: z.string(),
});

export const RoundSchema = z.object({
  player: z.string(),
  type: z.enum(['interrogation', 'voting']),
  conversation: z.array(ConversationExchangeSchema),
  results: z.object({
    guiltScoreUpdate: z.number().optional(),
    votingResults: z.array(VotingRoundVoteSchema).optional(),
    deduction: z.string().optional(),
  }),
  status: z.enum(['inactive', 'active', 'completed']),
});

export const PlayerSchema = z.object({
  id: z.string(),
  identity: z.string(),
  evidence: z.array(z.string()),
  guiltScore: z.number(),
  interrogated: z.boolean(),
  isCulprit: z.boolean(),
});

export const CrimeSchema = z.object({
  type: z.string(),
  location: z.string(),
  time: z.string(),
  description: z.string(),
});

export const GameStateSchema = z.object({
  status: z.enum(['setup', 'active', 'finished']),
  crime: CrimeSchema.optional(),
  rounds: z.array(RoundSchema),
  players: z.array(PlayerSchema),
  allEvidence: z.array(z.string()),
  interrogationProgress: z.number().optional(),
  outcome: z
    .object({
      winner: z.enum(['innocents', 'culprit', 'not_yet_determined']),
      averageGuiltScore: z.number(),
    })
    .optional(),
});

export type ConversationExchange = z.infer<typeof ConversationExchangeSchema>;
export type ConversationItem = z.infer<typeof ConversationItemSchema>;
export type VotingRoundVote = z.infer<typeof VotingRoundVoteSchema>;
export type Round = z.infer<typeof RoundSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type Crime = z.infer<typeof CrimeSchema>;
export type GameState = z.infer<typeof GameStateSchema>;