import { GameRoomService } from "../services/game_room/game_room.service.js";
import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

async function changeGameState(roomId) {

    
    const room = await GameRoomService.getGameRoom(roomId);

    if (!room) {
        console.log(`Game room ${roomId} not found`);
        return;
    }

    const gameState = GameRoomService.decryptGameState(room.game_state);

    if (!gameState) {
        console.log(`Game room ${roomId} does not have a valid game state`);
        return;
    }

    gameState.rounds.find(round => round.type === 'interrogation').status = 'inactive';
    gameState.rounds.find(round => round.type === 'voting').status = 'active';

    await GameRoomService.updateGameRoom(roomId, { game_state: GameRoomService.encryptGameState(gameState) });


    console.log(`Game room ${roomId} updated to active`);

}


await changeGameState(process.argv[2]);