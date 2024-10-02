/**
 * We are building a web game called suspect 3. This the is game prospect, 
 * think of it as a MVP. in the game, each player is assigned an identify and 3 
 * out of the 6 evidence peices of their case. they have 5 minutes to convince the interragator ( a chat gpt assistant ) 
 * that they aren't the one who commited to crime. each person enters the room one at a time and doesn't know what the other people said, 
 * but the interragator doees, and so if the stories dont match then can point it out. the interregator works of off an algorithm that moves a 
 * float from .01 to 1.00 where 1 is guilt and .01 is innocent. the game is won by the average score of the team is less than .30.
 * The goal of this class is to create the assistants that will act as the interregator in the game
 * It will be responsible for creating original game state, and updating the game state
 * It will be responsible for creating the messages that are sent to the assistant and the player
 */

import OpenAI from "openai";
import dotenv from "dotenv";
import { GameRoomSocketServer } from '../socket/io.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

dotenv.config({ path: '../.env' })

class OpenaiGameService {
    static client = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
    });

    static async createGameMasterAssistant() {
        console.log("Creating Game Master Assistant...");
        try {
            const assistant = await this.client.beta.assistants.create({
                name: "Game Master",
                instructions: `You are the Game Master for a game called Suspect 3. Your role is to create a crime scenario, assign identities and evidence pieces to players, and conduct interrogations. Here are your key responsibilities:

1. Create a crime scenario with the following details:
   - Type of crime
   - Location
   - Time of occurrence
   - Brief description of what happened

2. Assign identities to players:
    - Each player gets a unique identity related to the crime scenario
    - Use the provided player IDs when assigning identities   - Each player gets a unique identity related to the crime scenario

3. Generate evidence pieces:
   - Create 6 evidence pieces related to the crime

4. Distribute evidence:
   - Assign 3 out of 6 evidence pieces to each player

5. Conduct interrogations:
   - Question each player for 5 minutes
   - Try to determine if they committed the crime
   - Point out inconsistencies between players' stories

6. Evaluate guilt:
   - Assess each player's guilt on a scale from 0.01 (innocent) to 1.00 (guilty)
   - Update the score based on players' responses and inconsistencies

Remember to be impartial but thorough in your investigation.`,
                model: "gpt-4o",
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "update_game_state",
                            description: "Update the game state with new information",
                            parameters: {
                                type: "object",
                                properties: {
                                    crime: {
                                        type: "object",
                                        properties: {
                                            type: { type: "string" },
                                            location: { type: "string" },
                                            time: { type: "string" },
                                            description: { type: "string" }
                                        }
                                    },
                                    players: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                identity: { type: "string" },
                                                evidence: {
                                                    type: "array",
                                                    items: { type: "string" }
                                                },
                                                guiltScore: { type: "number" }
                                            }
                                        }
                                    },
                                    allEvidence: {
                                        type: "array",
                                        items: { type: "string" }
                                    }
                                },
                                required: ["crime", "players", "allEvidence"]
                            }
                        }
                    }
                ],
            });
            console.log("Game Master Assistant created successfully:", assistant.id);
            return assistant;
        } catch (error) {
            console.error("Error creating Game Master Assistant:", error);
            throw error;
        }
    }

    static async createGameStateManager() {
        console.log("Creating Game State Manager Assistant...");
        try {
            const assistant = await this.client.beta.assistants.create({
                name: "Game State Manager",
                instructions: `You are the Game State Manager for Suspect 3. Your role is to process the game thread and generate a structured JSON game state object. This object will be sent to the frontend client and stored in the database. Here are your key responsibilities:

1. Parse the game thread to extract relevant information
2. Generate a JSON object containing:
- Current game state (setup, interrogation, or finished)
- Crime details
- Player information (identities, evidence, guilt scores)
    - Ensure that the player IDs in the game state match the original IDs provided
- Interrogation progress
- Game outcome (if finished)

3. Ensure the JSON object is properly structured and contains all necessary information for the frontend to render the game state.`,
                model: "gpt-4o",
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "generate_game_state",
                            description: "Generate a structured JSON game state object",
                            parameters: {
                                type: "object",
                                properties: {
                                    gameState: {
                                        type: "object",
                                        properties: {
                                            status: { type: "string", enum: ["setup", "interrogation", "finished"] },
                                            crime: {
                                                type: "object",
                                                properties: {
                                                    type: { type: "string" },
                                                    location: { type: "string" },
                                                    time: { type: "string" },
                                                    description: { type: "string" }
                                                }
                                            },
                                            players: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        id: { type: "string" },
                                                        identity: { type: "string" },
                                                        evidence: {
                                                            type: "array",
                                                            items: { type: "string" }
                                                        },
                                                        guiltScore: { type: "number" },
                                                        interrogated: { type: "boolean" }
                                                    }
                                                }
                                            },
                                            allEvidence: {
                                                type: "array",
                                                items: { type: "string" }
                                            },
                                            interrogationProgress: { type: "number" },
                                            outcome: {
                                                type: "object",
                                                properties: {
                                                    teamWon: { type: "boolean" },
                                                    averageGuiltScore: { type: "number" }
                                                }
                                            }
                                        },
                                        required: ["status", "crime", "players", "allEvidence"]
                                    }
                                },
                                required: ["gameState"]
                            }
                        }
                    }
                ],
            });
            console.log("Game State Manager Assistant created successfully:", assistant.id);
            return assistant;
        } catch (error) {
            console.error("Error creating Game State Manager Assistant:", error);
            throw error;
        }
    }

    static async createGameThread(players) {
        console.log(`Creating game thread for ${players.length} players...`);
        try {
            const thread = await this.client.beta.threads.create();
            console.log("Game thread created:", thread.id);
            const crime = this.createCrime(players);
            await this.client.beta.threads.messages.create(thread.id, {
                role: "user",
                content: crime,
            });
            console.log("Initial message added to thread");
            return thread;
        } catch (error) {
            console.error("Error creating game thread:", error);
            throw error;
        }
    }

    static createCrime(players) {
        console.log(`Creating crime scenario for ${players.length} players`);
        const playerInfo = players.map(player => `{id: "${player.id}", email: "${player.email}"}`).join(', ');
        const crime = `Create a crime scenario for a game with the following ${players.length} players: [${playerInfo}]. Assign identities and distribute evidence to each player using their provided ids as the id field.`;
        console.log("Crime scenario created:", crime);
        return crime;
    }

    static async runThreadAndStream(threadId, roomId) {
        console.log(`Running thread: ${threadId} with Game Master assistant: ${process.env.OPENAI_GAMEMASTER_ASSISTANT_ID}`);
        const socketServer = GameRoomSocketServer.getInstance();
        
        try {
            const run = await this.client.beta.threads.runs.create(threadId, {
                assistant_id: process.env.OPENAI_GAMEMASTER_ASSISTANT_ID
            });
            console.log("Run created:", run.id);

            let gameState = null;

            gameState = await this.processRun(threadId, run.id, 'update_game_state');

            if (gameState) {
                console.log("Game state created, processing with Game State Manager");
                const stateManagerThread = await this.client.beta.threads.create();
                console.log("State Manager thread created:", stateManagerThread.id);
                await this.client.beta.threads.messages.create(stateManagerThread.id, {
                    role: "user",
                    content: JSON.stringify(gameState),
                });
                console.log("Game state added to State Manager thread");

                const stateManagerRun = await this.client.beta.threads.runs.create(stateManagerThread.id, {
                    assistant_id: process.env.OPENAI_GAME_STATE_MANAGER_ASSISTANT_ID
                });
                console.log("State Manager run created:", stateManagerRun.id);

                const structuredGameState = await this.processRun(stateManagerThread.id, stateManagerRun.id, 'generate_game_state');

                if (structuredGameState) {
                    console.log("Structured game state created:", structuredGameState);
                    
                    // Save the encrypted game state to the database
                    await this.saveGameState(roomId, structuredGameState.gameState);
                    
                    socketServer.emitToRoom(roomId, 'game-state-update', structuredGameState.gameState);
                    console.log("Game state update emitted to room:", roomId);
                }
            }

            console.log("Thread run completed");
            return run;
        } catch (error) {
            console.error("Error running thread and streaming:", error);
            throw error;
        }
    }

    static async processRun(threadId, runId, expectedFunctionName) {
        let result = null;
        let run = { status: 'queued' };

        while (run.status !== 'completed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            run = await this.client.beta.threads.runs.retrieve(threadId, runId);
            console.log("Run status:", run.status);

            if (run.status === 'requires_action') {
                console.log("Run requires action");
                const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = [];

                for (const toolCall of toolCalls) {
                    if (toolCall.function.name === expectedFunctionName) {
                        console.log(`Executing ${expectedFunctionName}`);
                        const functionArgs = JSON.parse(toolCall.function.arguments);
                        result = functionArgs;
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: JSON.stringify({ success: true })
                        });
                    }
                }

                await this.client.beta.threads.runs.submitToolOutputs(threadId, runId, { tool_outputs: toolOutputs });
                console.log("Tool outputs submitted");
            }
        }

        if (!result) {
            const messages = await this.client.beta.threads.messages.list(threadId);
            const lastMessage = messages.data[0];
            result = JSON.parse(lastMessage.content[0].text.value);
        }

        return result;
    }

    static encryptGameState(gameState) {
        const gameStateString = JSON.stringify(gameState);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
        let encrypted = cipher.update(gameStateString);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    static decryptGameState(encryptedGameState) {
        const textParts = encryptedGameState.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return JSON.parse(decrypted.toString());
    }

    static async saveGameState(roomId, gameState) {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const encryptedGameState = this.encryptGameState(gameState);
        console.log("Saving encrypted game state", encryptedGameState);
        console.log("Saving game state for room ID:", roomId);
        // make a select query to test the client and roomId
        const { data: testData, error: testError } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', roomId);
        console.log(" Test Supabase response:", testData, testError);
        const { data, error } = await supabase
            .from('game_rooms')
            .update({ game_state: encryptedGameState })
            .eq('id', roomId).select();
        console.log("Supabase response:", data, error);
        if (error) {
            console.error('Error saving encrypted game state:', error);
            throw error;
        }
        console.log('Encrypted game state saved successfully');
    }
}

export default OpenaiGameService;