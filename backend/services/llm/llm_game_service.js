/**
 * An LLM Game Service is responsible for game thread management and message processing.
 * It should be implemented by a class that uses a specific LLM service to manage game threads.
 * 
 * It should be able to add messages to threads, create chat completions, open / close realtime conversations, and run the threads to get new game states. 
 * the class should be setup in a way where the data that comes back from the LLM service functions can be used by a game manager to update the game state in the database.
 */

export default class LLMGameService {
  client = null;
  constructor() {
    if (this.constructor === LLMGameService) {
      throw new Error('Cannot instantiate abstract class');
    }
  }

  addMessageToThread(roomId, message) {
    throw new Error('Method not implemented');
  }

  createGameThread(roomId) {
    throw new Error('Method not implemented');
  }

  runGameThread(roomId) {
    throw new Error('Method not implemented');
  }

  createRealtimeResponse(roomId) {
    throw new Error('Method not implemented');
  }

  openRealtimeConversation(roomId) {
    throw new Error('Method not implemented');
  }

  createChatCompletion(roomId) {
    throw new Error('Method not implemented');
  }

}
