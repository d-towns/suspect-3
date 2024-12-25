import { EventEmitter } from 'events';

/**
 * Abstract GameManager class that serves as a blueprint for different game modes.
 */
export class GameManager extends EventEmitter {
    /**
     * Emits a round tick event with the remaining countdown.
     * @param {number} number - The current countdown number.
     */
    emitRoundTick(number) {
        throw new Error('emitRoundTick method must be implemented.');
    }

    /**
     * Creates a crime scenario for a game
     * @returns {string} - The crime scenario.
     **/
    createCrime() {
        throw new Error('createCrime method must be implemented.');
    }

    /**
     * Starts the game for a given room.
     * @param {string} roomId - The ID of the game room.
     */
    startGame(roomId) {
        throw new Error('startGame method must be implemented.');
    }

    /**
     * Initiates the interrogation phase.
     * @param {string} roomId - The ID of the game room.
     */
    startInterrogationPhase(roomId) {
        throw new Error('startInterrogationPhase method must be implemented.');
    }

    /**
     * Begins an interrogation with a specific suspect.
     * @param {string} roomId - The ID of the game room.
     * @param {string} suspectId - The ID of the suspect.
     */
    startInterrogation(roomId, suspectId) {
        throw new Error('startInterrogation method must be implemented.');
    }

    /**
     * Ends an interrogation with a specific suspect.
     * @param {string} roomId - The ID of the game room.
     * @param {string} suspectId - The ID of the suspect.
     */
    endInterrogation(roomId, suspectId) {
        throw new Error('endInterrogation method must be implemented.');
    }

    /**
     * Concludes the interrogation phase.
     * @param {string} roomId - The ID of the game room.
     */
    endInterrogationPhase(roomId) {
        throw new Error('endInterrogationPhase method must be implemented.');
    }

    /**
     * Initiates the deduction phase.
     * @param {string} roomId - The ID of the game room.
     */
    startDeductionPhase(roomId) {
        throw new Error('startDeductionPhase method must be implemented.');
    }

    /**
     * Concludes the deduction phase.
     * @param {string} roomId - The ID of the game room.
     */
    endDeductionPhase(roomId) {
        throw new Error('endDeductionPhase method must be implemented.');
    }

    /**
     * Checks the win condition based on the current game state.
     * @param {string} roomId - The ID of the game room.
     */
    checkWinCondition(roomId) {
        throw new Error('checkWinCondition method must be implemented.');
    }
}