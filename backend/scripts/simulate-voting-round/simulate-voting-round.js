import OpenAI from "openai";
import { GameRoomService } from '../../services/game-room.service.js';

export const simulateVotingRound = async ( gameRoomId, options ) => {

    const client = new OpenAI({
        organization: process.env.OPENAI_ORGANIZATION_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });
    const gameRoom = await GameRoomService.getGameRoom(gameRoomId)
    const gameState = GameRoomService.decryptGameState(gameRoom.game_state)
    const gameThreadId = gameRoom.thread_id

    if(options.innocentsWin) {
        // get the player id of the player who is the culprit
        const culprit = gameState.players.find((player) => player.isCulprit)
        const innocents = gameState.players.filter((player) => !player.isCulprit)

        //create a message in the game thread where each innocent votes for the culprit
        for(let innocent of innocents) {
            await client.beta.threads.messages.create(
                gameThreadId,
                {
                    role: "user",
                    content: `Player ${innocent.id} voted for  ${culprit.id} as the culprit`,
                }
            )
            console.log(`Player ${innocent.id} voted for  ${culprit.id} as the culprit \n`)
        }

        await client.beta.threads.messages.create(
            gameThreadId,
            {
                role: "user",
                content: `Player ${culprit.id} voted for  ${innocents[0].id} as the culprit`,
            }
        )
        console.log(`Player ${culprit.id}  voted for  ${innocents[0].id} as the culprit \n`)


    } else if(options.culpritWins) {

        // get the player id of the player who is the culprit
        const culprit = gameState.players.find((player) => player.isCulprit)
        const innocents = gameState.players.filter((player) => !player.isCulprit)

        //create a message in the game thread where each innocent votes for the culprit
        for(let innocent of innocents) {
            await client.beta.threads.messages.create(
                gameThreadId,
                {
                    role: "user",
                    content: `Player ${innocent.id} voted for  ${innocents[0].id} as the culprit`,
                }
            )
            console.log(`Player ${innocent.id} voted for  ${innocents[0].id} as the culprit \n`)
        }

        await client.beta.threads.messages.create(
            gameThreadId,
            {
                role: "user",
                content: `Player ${culprit.id} voted for  ${innocents[0].id} as the culprit`,
            }
        )
        console.log(`Player ${culprit.id} voted for  ${innocents[0].id} as the culprit \n`)

    } else {
        console.error("\n Must specify --innocentsWin or --mafiaWins \n")
    }

    await client.beta.threads.messages.create(
        gameThreadId,
        {
            role: "user",
            content: `The voting round has ended. Tally the votes and determine the outcome of the game. If there is not a majority vote for the culprit, the game will continue to the next round. set this voting round to be completed and the next round to be active`,
        }
    )
}