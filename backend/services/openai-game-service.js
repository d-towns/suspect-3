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
// import { strict } from "assert";
// import { io } from "socket.io-client";
import Websocket from "ws";
import fs from "fs";
import decode, { decoders } from "audio-decode";
import { log } from "console";


dotenv.config({ path: '../.env' })

class OpenaiGameService {
    static client = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
    });

    static lastAudioMessageDeltas = [];
    static lastAudioMessageTranscript = [];
    static roomRealtimeSessions = new Map();

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
    - Use the provided player IDs when assigning identities - Each player gets a unique identity related to the crime scenario

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
6. Assign rounds:
    - Conduct a total of n*2 rounds, where n is the number of players
    - Each round is either an interrogation or a kill round
    - Each round has a status, it is either inactive, active, or completed
    - Interrogation rounds are for individual players, assign a player attribute for these rounds using their player ID uuid
    - Kill rounds involve all players voting on a suspected "rat", make the player attribute for these rounds be "all"
    - Assign a interregation round for each player

Remember to be impartial but thorough in your investigation.`,
                model: "gpt-4o",
                tools: [{
                    type: "function",
                    function: {
                        name: "update_game_state",
                        strict: true,
                        description: "Update the game state with new information",
                        parameters: {
                            type: "object",
                            properties: {
                                status: { 
                                    type: "string", 
                                    enum: ["setup", "interrogation", "finished"],
                                    description: "The current status of the game"
                                },
                                crime: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string" },
                                        location: { type: "string" },
                                        time: { type: "string" },
                                        description: { type: "string" }
                                    },
                                    required: ["type", "location", "time", "description"],
                                    additionalProperties: false
                                },
                                rounds: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            player: { type: "string" },
                                            status: {
                                                type: "string",
                                                enum: ["inactive", "active", "completed"],
                                                description: "The status of the round"
                                            },
                                            type: { 
                                                type: "string", 
                                                enum: ["interrogation", "kill"],
                                                description: "The type of round"
                                            },
                                            conversation: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        speaker: { type: "string" },
                                                        message: { type: "string" }
                                                    },
                                                    required: ["speaker", "message"],
                                                    additionalProperties: false
                                                }
                                            },
                                            results: {
                                                type: "object",
                                                properties: {
                                                    guiltScoreUpdate: { 
                                                        type: "number",
                                                    },
                                                    playerFlipped: { type: "boolean" },
                                                    votedRat: { type: "string" }
                                                },
                                                required: ["guiltScoreUpdate", "playerFlipped", "votedRat"],
                                                additionalProperties: false
                                            }
                                        },
                                        required: ["type", "conversation", "results", "player", "status"],
                                        additionalProperties: false
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
                                            guiltScore: { 
                                                type: "number",
                                            },
                                            interrogated: { type: "boolean" }
                                        },
                                        required: ["id", "identity", "evidence", "guiltScore", "interrogated"],
                                        additionalProperties: false
                                    }
                                },
                                allEvidence: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                interrogationProgress: { 
                                    type: "number",
                                },
                                outcome: {
                                    type: "object",
                                    properties: {
                                        teamWon: { type: "boolean" },
                                        averageGuiltScore: { 
                                            type: "number",
                                        }
                                    },
                                    required: ["teamWon", "averageGuiltScore"],
                                    additionalProperties: false
                                }
                    },
                    required: ["status", "crime", "players", "allEvidence", "interrogationProgress", "outcome", "rounds"],
                    additionalProperties: false
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

    static async runThreadAndProcess(threadId, roomId) {
        console.log(`Running thread: ${threadId} with Game Master assistant: ${process.env.OPENAI_GAMEMASTER_ASSISTANT_ID}`);
        
        try {
            console.log("Using assistant:", process.env.OPENAI_GAMEMASTER_ASSISTANT_ID);
            const run = await this.client.beta.threads.runs.create(threadId, {
                assistant_id: process.env.OPENAI_GAMEMASTER_ASSISTANT_ID
            });
            console.log("Run created:", run.id);

            const gameState = await this.waitForRunCompletion(threadId, run.id);

            if (gameState) {
                console.log("Game state created:", gameState);
                
                // Save the encrypted game state to the database
                await this.saveGameState(roomId, gameState);
                // TODO: this may be redundant since we can setup listeners using supabase on the game_rooms table
                const socketServer = GameRoomSocketServer.getInstance();
                socketServer.emitToRoom(roomId, 'game-state-update', gameState);
                console.log("Game state update emitted to room:", roomId);
            }

            console.log("Thread run completed");
            return run;
        } catch (error) {
            console.error("Error running thread and processing:", error);
            throw error;
        }
    }
    /**
     * 
     * @param {*} threadId 
     * @param {*} runId 
     * @returns gameState Object -> to be saved in encrytped format in the db
     * 
     * Remember: the OpenAI Aissistant is tring the conversation threah into the strctured output using the function call
     * 
     * control the flow of the game with user messages
     * they will come in the form of audio or text
     * audio for the interregations
     * text for the kill rounds and game management
     * how do i know when it is safe to start the game?
     * when all of the players are in the started game ( at the game/{game_id} page )
     * once that is the case i can start the first round
     * there are teo types of rounds
     * iterregation roudns or kill rounds
     * There are a total of n*2 rounds in a game where n is the number of total players
     * so the game state needs to have rounds object, 
     * an array with a round object in each with their type, conversation (i rounds), and results ( guilt socre update, if the player flipped, who was voted as a rat,)
     * if the first game state update comes with a rounds object, we can take the first i round player and put then into the room, and start the interregation
     * client needs to have its socket ready to receive the first audio from the realtime API
     * I rounds are 
     * - for a specific player
     * - last 2 minutes
     * - have guilt score updates after each back and forth exchange which send update-game state events so each player can see the score update
     * K rounds
     * - involve every players
     * - have each player vote on if a player is a rat
     * - if there is a consensus on someone being a rat
     * -- if it is true, the player is removed from the game and lose significant rank
     * -- if it is false, guilt scores are doubled what happened to the suspected rat is now added to the game crime for each player, making the game harder
     * 
     * 
     */
    static async waitForRunCompletion(threadId, runId) {
        let run = { status: 'queued' };

        while (run.status !== 'completed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            run = await this.client.beta.threads.runs.retrieve(threadId, runId);
            console.log("Run status:", run.status);

            if (run.status === 'requires_action') {
                const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = [];

                for (const toolCall of toolCalls) {
                    if (toolCall.function.name === 'update_game_state') {
                        console.log("Executing update_game_state");
                        const functionArgs = JSON.parse(toolCall.function.arguments);
                        toolOutputs.push({
                            tool_call_id: toolCall.id,
                            output: JSON.stringify({ success: true })
                        });
                        return functionArgs;
                    }
                }

                if (toolOutputs.length > 0) {
                    await this.client.beta.threads.runs.submitToolOutputs(threadId, runId, { tool_outputs: toolOutputs });
                    console.log("Tool outputs submitted");
                }
            } else if(run.status === 'failed') {
                console.error("Run failed:", run);
                console.error("Error:", run.last_error);
                return null;
            }
        }

        const messages = await this.client.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];
        return JSON.parse(lastMessage.content[0].text.value);
    }

    static async addUserResponseToInputAudioBuffer(roomId, userId, base64AudioChunk) {
        const ws = this.roomRealtimeSessions.get(roomId);
        if (!ws) {
            console.error('Realtime session not found for room:', roomId);
            return;
        }

        const event = {
            type: 'input_audio_buffer.append',
            audio: base64AudioChunk
        }

        ws.send(JSON.stringify(event));
        console.log('Added audio chunk to input audio buffer to realtime API:', event);
    }

    static async createInterrogationResponse(roomId) {
        const ws = this.roomRealtimeSessions.get(roomId);
        if (!ws) {
            console.error('Realtime session not found for room:', roomId);
            return;
        }

        ws.send(JSON.stringify({type: 'input_audio_buffer.commit'}));
        ws.send(JSON.stringify({type: 'response.create'}));
        console.log('Created response in realtime API:', event)
    }


    static startRealtimeInterregation(roomId, userId, gameState) {
        const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
        const ws = new Websocket(url, {
            headers: {
                "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
                "OpenAI-Beta": "realtime=v1",
            },
        });

        console.log('Connecting to OpenAI Realtime API...');

        this.roomRealtimeSessions.set(roomId, ws);

        ws.on('open', () => {
            const user = gameState.players.find(player => player.id === userId);
            if (!user) {
                console.error('User not found in game state');
                return;
            }

            const event = {
                type: 'conversation.item.create',

                item: {
                  type: 'message',
                  role: 'user',
                  content: [
                    {
                      type: 'input_text',
                      text: `${user.identity} enters the room for interrogation, with a guilt score of ${user.guiltScore}. the evidence of their involvement in the crime is ${user.evidence.join(', ')}.`
                    }
                  ]
                  
                }
              };

            ws.send(JSON.stringify(event));
            ws.send(JSON.stringify({ type: 'response.create' }));
            console.log('Sent user conversation item to realtime API:', event);
        });

        ws.on('message', async (data) => { 
            try {
                const event = JSON.parse(data);
                console.log('Received event from OpenAI Realtime API:', event.type);
                
                switch (event.type) {
                    case 'error':
                        console.error('Error from OpenAI Realtime API:', event);
                        break;
                    
                    case 'session.created':
                        // take the session object and update its instructions to respond to the user's most previous message in the conversation, and do not respond as the user, but as their interrogator only
                        const session = event.session;
                        session.instructions = 
                        `You are AI who is acting as a police detective for a co-operative criminal mystery game. 
                        You will interrogate a set of suspects for this crime:
                         
                        ${JSON.stringify(gameState.crime.description)}. 
                        Time of the crime: ${gameState.crime.time}.
                        Location of the crime: ${gameState.crime.location}.

                        The identities of the suspects are as follows:
                        ${gameState.players.map(player => `${player.identity}`).join('\n')}
                        
                        Conduct a thorough interrogation, but only respond as the interrogator.
                        Do not respond as the user, but as their interrogator only. 
                        Use the provided player identities when referring to the players. Only one player will be in the interrogation room at a time. 
                        You can know who is in the room by using the user messages that are in the conversation that define who is entering the room.
                        When a new suspect enters the room, you can assume that the previous one has left. 
                        You are able to play the suspects off of each other, using a previous suspect's statements against them and the other suspects. 
                        When a user enters the room, start the interrogation by asking them about the crime, and their involvement in it. `;
                        delete session['id'];
                        delete session['object'];
                        delete session['expires_at'];
                        ws.send(JSON.stringify({ type: 'session.update', session }));
                        break;
                    
                    case 'session.updated':
                        console.log('Session updated:', event);
                        break;
                    
                    case 'response.audio.delta':
                        this.lastAudioMessageDeltas.push(event.delta);
                        break;
                    
                    case 'response.audio_transcript.delta':
                        this.lastAudioMessageTranscript.push(event.delta);
                        break;
                    
                    case 'response.audio.done':
                        const audioBuffer = await this.convertAudioMessageDeltasToAudio([...this.lastAudioMessageDeltas]);
                        const socketServer = GameRoomSocketServer.getInstance();
                        const conversationItem = {
                            audioBuffer,
                            audioTranscript: this.lastAudioMessageTranscript.join(' ')
                        };
                        // write the audio buffer to the file system
                        console.log('Writing audio buffer to file system');
                        const audioWav = await decoders.wav(audioBuffer);
                        fs.writeFileSync(event.response_id + '_audio.wav', Buffer.from(audioWav.getChannelData(0)));
                        fs.writeFileSync(event.response_id + '_audio_transcript.txt', this.lastAudioMessageTranscript.join(' '));

                        socketServer.emitToRoom(roomId, 'realtime-audio-message', conversationItem);
                        this.lastAudioMessageDeltas = [];
                        this.lastAudioMessageTranscript = [];
                        break;
                    
                    default:
                        console.warn('Unhandled event type:', event.type);
                        break;
                }
            } catch (e) {
                console.error(e);
            }
            });

        ws.on('disconnect', () => {
            console.log('Disconnected from OpenAI Realtime API');
        });

        ws.on('error', (error) => {
            console.error('Error with OpenAI Realtime API:', error);
        });
    }

    static async convertAudioMessageDeltasToAudio(audioMessageDeltas) {
        // Convert Base64 encoded string into a Blob
        const audioMessage = audioMessageDeltas.join('');
        const byteCharacters = atob(audioMessage);
        // Convert the string to an ArrayBuffer
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const pcm16ArrayBuffer = byteNumbers.buffer;
    
        // Create WAV header
        /**
         * 
         * @param {*} sampleRate 
         * @param {*} numChannels 
         * @param {*} bytesPerSample 
         * @param {*} numFrames 
         * @returns 
         */
        const createWavHeader = (sampleRate, numChannels, bytesPerSample, numFrames) => {
          const buffer = new ArrayBuffer(44);
          const view = new DataView(buffer);
    
          /* RIFF identifier */
          view.setUint32(0, 1380533830, false);
          /* file length minus RIFF identifier length and file description length */
          view.setUint32(4, 36 + numFrames * numChannels * bytesPerSample, true);
          /* RIFF type */
          view.setUint32(8, 1463899717, false);
          /* format chunk identifier */
          view.setUint32(12, 1718449184, false);
          /* format chunk length */
          view.setUint32(16, 16, true);
          /* sample format (raw) */
          view.setUint16(20, 1, true);
          /* channel count */
          view.setUint16(22, numChannels, true);
          /* sample rate */
          view.setUint32(24, sampleRate, true);
          /* byte rate (sample rate * block align) */
          view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
          /* block align (channel count * bytes per sample) */
          view.setUint16(32, numChannels * bytesPerSample, true);
          /* bits per sample */
          view.setUint16(34, bytesPerSample * 8, true);
          /* data chunk identifier */
          view.setUint32(36, 1684108385, false);
          /* data chunk length */
          view.setUint32(40, numFrames * numChannels * bytesPerSample, true);
    
          return buffer;
        };
    
        const sampleRate = 24000;
        const numChannels = 1;
        const bytesPerSample = 2;
        const numFrames = pcm16ArrayBuffer.byteLength / bytesPerSample;
    
        const wavHeader = createWavHeader(sampleRate, numChannels, bytesPerSample, numFrames);
    
        // Concat wavHeader ArrayBuffer + PCM16 ArrayBuffer
        const audioBuffer = new Uint8Array(wavHeader.byteLength + pcm16ArrayBuffer.byteLength);
        audioBuffer.set(new Uint8Array(wavHeader), 0);
        audioBuffer.set(new Uint8Array(pcm16ArrayBuffer), wavHeader.byteLength);
        
        return audioBuffer;
    
        // play audio

    
        // Send the array buffer via WebSocke
      };
        

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
        console.log("Saving encrypted game state for room ID:", roomId);
        
        const { data, error } = await supabase
            .from('game_rooms')
            .update({ game_state: encryptedGameState })
            .eq('id', roomId)
            .select();
        
        if (error) {
            console.error('Error saving encrypted game state:', error);
            throw error;
        }
        console.log('Encrypted game state saved successfully');
    }
}

export default OpenaiGameService;