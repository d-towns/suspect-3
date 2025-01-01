import { z } from "zod";

export const ConversationResponseSchema = z
  .object({
    speaker: z.string(),
    message: z.string(),
  })
  .strict();

export const AnalysisSchema = z.object({
  warmth: z.number().describe("A number between 0 and 1 representing how close the player's analysis is to the correct answer"),
});

export const SuspectTermpemtmentSchema = z.enum([
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
]);

export const SuspectSchema = z
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
  .strict();

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
        offenseReport: z.array(
          z.object({
            location: z.string(),
            time: z.string(),
            description: z.string(),
          })
        ),
        realStory: z.array(
          z.object({
            location: z.string(),
            time: z.string(),
            description: z.string(),
          })
        ),
      })
      .strict(),
    player: z.string(),
    rounds: z.array(
      z
        .object({
          status: z
            .enum(["inactive", "active", "completed"])
            .describe("The status of the round"),
          type: z
            .enum(["interrogation", "voting"])
            .describe("The type of round"),
          conversations: z.array(
            z.object({
              suspect: z.string(),
              active: z.boolean(),
              responses: z.array(ConversationResponseSchema),
            })
          ),
        })
        .strict()
    ),
    suspects: z.array(SuspectSchema),
    deduction: z
      .object({
        nodes: z.array(
          z
            .object({
              id: z.string(),
              type: z.enum(["statement", "evidence", "suspect"]),
              data: z.union([
                ConversationResponseSchema,
                z.string(),
                SuspectSchema,
              ]),
            })
            .strict()
        ),
        edges: z.array(
          z
            .object({
              source_node: z.string(),
              target_node: z.string(),
              type: z.enum(["supports", "contradicts", "implicates"]),
            })
            .strict()
        ),
        warmth: z.number().describe("A number between 0 and 100 that represents how close the player's analysis is to the correct answer"),
      })
      .strict(),
    allEvidence: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
      })
    ),
    outcome: z.enum(["win", "lose", "not_yet_determined"]),
  })
  .strict();
