import dotenv from "dotenv";
import OpenAI from "openai";
import { GameRoomService } from "../services/game_room/game_room.service.js";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { SinglePlayerGameStateSchema } from "../models/game-state-schema.js";

// auto-command.js

dotenv.config({ path: "../.env" });

const openai = new OpenAI({
    organization: process.env.OPENAI_ORGANIZATION_ID,
    apiKey: process.env.OPENAI_API_KEY,
});


export async function updateGameStateFromPrompt(gameRoomId, prompt) {
    try {
        const gameRoom = await GameRoomService.getGameRoom(gameRoomId);
        const gameState = GameRoomService.decryptGameState(gameRoom.game_state);
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Update the game state based on the user's prompt. The current game state is: " + JSON.stringify(gameState),
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            response_format: zodResponseFormat(SinglePlayerGameStateSchema, "game_state"),
        });

        const newGameState = completion.choices[0].message.content
        console.log("New game state:", GameRoomService.encryptGameState(JSON.parse(newGameState)));
        await GameRoomService.updateGameRoom(gameRoomId, { game_state: GameRoomService.encryptGameState(newGameState) });
       
    } catch (error) {
        console.error("Error updating game state:", error);
    }
}

// get the game room id from the command line arguments and the prompt from the command line arguments
updateGameStateFromPrompt(process.argv[2], process.argv[3]);
// Run this script with the following command: