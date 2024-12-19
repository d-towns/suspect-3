import { z } from "zod";

export const ConversationResponseSchema = z.object({
  speaker: z.string(),
  message: z.string(),
}).strict();

export const AnalysisSchema = z.object({
  analysis: z.string(),
  accepted: z.boolean(),
});


export const SuspectTermpemtmentSchema = z
  .enum([
    "calm",
    "nervous",
    "angry",
    "confused",
    "neutral",
    "confident",
    "confrontational",
    "defensive",
    "evasive",
    "hostile",
    "inconsistent",
    "uncooperative",
    "unresponsive",
    "untruthful",
    "vague",
  ])

export const MultiPlayerGameStateSchema = z
  .object({
    status: z
      .enum(["setup", "active", "finished"])
      .describe("The current status of the game"),
    crime: z
      .object({
        type: z.string(),
        location: z.string(),
        time: z.string(),
        description: z.string(),
      })
      .strict(),
    rounds: z.array(
      z
        .object({
          player: z
            .string()
            .describe(
              "The player ID for the round, this should always be the uuid of the player that was passed in the first message of the thread"
            ),
          status: z
            .enum(["inactive", "active", "completed"])
            .describe("The status of the round"),
          type: z
            .enum(["interrogation", "voting"])
            .describe("The type of round"),
          conversation: z.array(
            z
              .object({
                speaker: z.string(),
                message: z.string(),
              })
              .strict()
          ),
          results: z
            .object({
              guiltScoreUpdate: z.number(),
              deduction: z.string(),
              votingResults: z.array(
                z
                  .object({
                    playerId: z.string(),
                    voterId: z.string(),
                  })
                  .strict()
              ),
            })
            .strict(),
        })
        .strict()
    ),
    players: z.array(
      z
        .object({
          id: z.string(),
          identity: z.string(),
          evidence: z.array(z.string()),
          guiltScore: z.number(),
          interrogated: z.boolean(),
          isCulprit: z.boolean(),
        })
        .strict()
    ),
    allEvidence: z.array(z.string()),
    interrogationProgress: z.number(),
    outcome: z
      .object({
        winner: z.enum(["innocents", "culprit", "not_yet_determined"]),
        averageGuiltScore: z.number(),
      })
      .strict(),
  })
  .strict();

export const SinglePlayerGameStateSchema = z
  .object({
    status: z
      .enum(["setup", "active", "finished"])
      .describe("The current status of the game"),
    crime: z
      .object({
        type: z.string(),
        location: z.string(),
        time: z.string(),
        description: z.string(),
      })
      .strict(),
    player: z.string(),
    rounds: z.array(
      z
        .object({
          suspect: z
            .string()
            .describe(
              "a 5 digits alphanumeric string that represents the suspect that is in the interrogation room for this round"
            ),
          status: z
            .enum(["inactive", "active", "completed"])
            .describe("The status of the round"),
          type: z
            .enum(["interrogation", "voting"])
            .describe("The type of round"),
          conversation: z.array(
            ConversationResponseSchema
          ),
        })
        .strict()
    ),
    suspects: z.array(
      z
        .object({
          id: z
            .string()
            .describe(
              "a 5 digits alphanumeric string that represents the suspect that is in the interrogation room for this round"
            ),
          name: z.string(),
          identity: z.string(),
          temperment: SuspectTermpemtmentSchema,
          interrogated: z.boolean(),

          isCulprit: z.boolean(),
        })
        .strict()
    ),
    deductions: z.array(
      z.object({
        leads: z
        .array(z.object({ suspect: z.string(), evidence: z.union([z.string(), z.array(z.string())]) }))
        .describe("The leads that the player has gathered"),
        active: z.boolean().describe("Whether the player is currently working on this deduction, this should only be true for one deduction at a time"),
        submitted: z.boolean().describe("Whether the player has submitted this deduction"),
        culpritVote: z.string().describe("The suspect ID that the player thinks is the culprit for this deducution"),
        analysis: AnalysisSchema
      })
    ),
    allEvidence: z.array(z.string()),
    outcome: z
      .object({
        winner: z.enum(["innocents", "culprit", "not_yet_determined"]),
      })
      .strict(),
    culpritVote: z
      .string()
      .describe("The suspect ID that the player thinks is the culprit"),
  })
  .strict();

