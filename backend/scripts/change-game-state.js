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

    gameState.rounds.find(round => round.type === 'interrogation').status = 'completed';
    gameState.rounds.find(round => round.type === 'voting').status = 'active';
    gameState.outcome = 'not_yet_determined';
    gameState.status = 'active';

    gameState.deduction.nodes = [];
    gameState.deduction.edges = [];

    gameState.suspects.forEach((suspect) => {
      gameState.deduction.nodes.push({
        id: suspect.id,
        type: "suspect",
        data: {
          identity: suspect.identity,
          name: suspect.name,
          temperment: suspect.temperment,
        },
      });
    });

    gameState.allEvidence.forEach((evidence) => {
      gameState.deduction.nodes.push({
        id: evidence.id,
        type: "evidence",
        data: {
          id: evidence.id,
          description: evidence.description,
        },
      });
    });

    console.log(gameState);

    await GameRoomService.updateGameRoom(roomId, { game_state: GameRoomService.encryptGameState(gameState) });


    console.log(`Game room ${roomId} updated to active`);

}


await changeGameState(process.argv[2]);