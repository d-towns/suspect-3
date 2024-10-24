import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { GameState } from '../models/game-state.model';
import { useParams } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import decode, { decoders } from 'audio-decode';
import { FaMicrophone } from 'react-icons/fa6'

const Game = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const { roomId } = useParams<{ roomId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userIsHost, setUserIsHost] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [audioMessageDeltas, setAudioMessageDeltas] = useState<any[]>([]);
  const [interragationTranscript, setInterragationTranscript] = useState<any[]>([]);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (socket) {
      socket.on('game-state-update', (newState: GameState) => {
        console.log('Received game state update:', newState);
        setGameState(newState);
      });

      socket.on('game-message-delta', ({ delta }) => {
        setMessages(prev => [...prev, delta]);
      });

      socket.on('realtime-audio-message', async (params: any) => {
        console.log('Received audio message:', params);
        const audioWav = await decoders.wav(params.audioBuffer);

        setInterragationTranscript(prev => [...prev, params.audioTranscript]);
        const audioContext = new AudioContext();
        const audioBufferSource = audioContext.createBufferSource();
        audioBufferSource.buffer = audioWav;
        audioBufferSource.connect(audioContext.destination);
        audioBufferSource.start();

      });

      /**
       * TODO: Create roundTimer state object that will keep track of the time left in the round, updates on websocket events from the server
       * TODO: Createa startrecording function that cretes a MediaStream and MediaRecorder object and starts recording audio
       * TODO: Create a stopRecording function that stops the recording and sends the audio to the server
       * TODO: Create a event handler function that will attach to the MediaRecorder and take in the blob objects and 
       */

      /**
       * game loop
       * once i receive a game-starting event
       * start the next round
       * the server will keep track of the time left in the round
       * and send updates to all sockets in the room with the time-left
       */

      socket.on('game-starting', async (params: any) => {
        console.log('Game is starting');
        startNextRound();
        /**
         * Start the first round
         * the server will start the timer for the round with a setTiemout
         * the set timeout function will take the conversation and place the conversation items into the game thread
         * and then do a run so that it updates the game_state
         */
      });
      /**
       * once a message is received
       * we play the audiO, then we open up the user mic for them to respon
       * send the response to the server
       * the server will the next response
       * and restart the loop
       */



      // emit a joined-game event to the server socket to let the server know that the user has joined the game
      socket.emit('joined-game');

      // Add other event listeners as needed
    }

    return () => {
      if (socket) {
        socket.off('game-state-update');
        socket.off('game-message-delta');
        // Remove other listeners
      }
    };
  }, [socket]);

  useEffect(() => {
    if (roomId) {
      roomsService.getRoom(roomId).then((room) => {
        if (room.game_state && typeof room.game_state === 'object') {
          // Assuming room.game_state is already a JSON string representation of the game state
          console.log(room);
          console.log(room.host_id, user?.id)
          setUserIsHost(room.host_id === user?.id);
          setGameState(room.game_state);

        }
      });
    }
  }, [roomId, user]);


  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (!gameState) {
    return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-2xl font-bold">Loading game...</div>
    </div>;
  }

  const currentPlayer = gameState.players?.find(player => player.id === user?.id) || gameState.players?.[0];

  const handleSendMessage = () => {
    if (socket && inputMessage.trim()) {
      socket.emit('player-message', { roomId, message: inputMessage });
      setInputMessage('');
    }
  };



  const startNextRound = () => {
    if (socket) {
      socket.emit('start-next-round', roomId);
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* HUD-like top bar */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div className="flex-1">
          <h3 className="text-xl font-bold">Identity: {currentPlayer?.identity || 'Unknown'}</h3>
        </div>
        <div className="flex-1 text-center">
          <h2 className="text-2xl font-bold">Suspect 3</h2>
          <p className="text-lg">
            Status: {gameState.status ? gameState.status.charAt(0).toUpperCase() + gameState.status.slice(1) : 'Unknown'}
          </p>
          {userIsHost &&
            <button
              className=" bg-blue-500 text-white px-4 py-2 rounded mt-2"
              onClick={startNextRound}>
              Start Next Round
            </button>
          }
        </div>
        <div className="flex-1 text-right">
          <h3 className="text-xl font-bold">Guilt Meter</h3>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-red-600 h-2.5 rounded-full"
              style={{ width: `${currentPlayer?.guiltScore ? currentPlayer.guiltScore * 100 : 0}%` }}
            ></div>
          </div>
          <p className="mt-1">Score: {currentPlayer?.guiltScore?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 p-6 flex">
        {/* Left panel: Crime and Evidence */}
        <div className="w-1/4 bg-gray-800 p-4 rounded-lg mr-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">Crime Details</h2>
          {gameState.crime && (
            <>
              <p><strong>Type:</strong> {gameState.crime.type || 'Unknown'}</p>
              <p><strong>Location:</strong> {gameState.crime.location || 'Unknown'}</p>
              <p><strong>Time:</strong> {gameState.crime.time || 'Unknown'}</p>
              <p className="mb-4"><strong>Description:</strong> {gameState.crime.description || 'No description available'}</p>
            </>
          )}
          <h3 className="text-xl font-bold mb-2">Your Evidence:</h3>
          <ul className="list-disc list-inside">
            {currentPlayer?.evidence?.map((item, index) => (
              <li key={index}>{item}</li>
            )) || <li>No evidence available</li>}
          </ul>
        </div>

        {/* Right panel: Interrogation chat */}
        <div className="flex-1 bg-gray-800 p-4 rounded-lg flex flex-col">
          <h2 className="text-2xl font-bold mb-4">Interrogation</h2>
          <div
            ref={chatAreaRef}
            className="flex-1 overflow-y-auto mb-4 bg-gray-700 p-4 rounded"
          >
            {interragationTranscript.map((message, index) => (
              <p key={index} className="mb-2">{message}</p>
            ))}
          </div>
          <div className="flex justify-center">
            {/* TODO: use a radix tab to switch between text and audio messages */}
            <button
              onClick={() => {

              }}
              className="
              flex
              flex-row
              gap-2
              items-center
              bg-gray-700 text-white p-2 rounded-l
              hover:bg-gray-600
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
              focus:ring-offset-2
              focus:ring-offset-gray-900  
            ">
              Respond
              <FaMicrophone />
            </button>

            {/* <input 
              type="text" 
              className="flex-1 bg-gray-700 text-white p-2 rounded-l"
              placeholder="Type your response..." 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded-r"
              onClick={handleSendMessage}
            >
              Send
            </button> */}
          </div>
        </div>
      </div>

      {/* Interrogation Progress */}
      {gameState.status === 'interrogation' && gameState.interrogationProgress !== undefined && (
        <div className="bg-gray-800 p-4">
          <h2 className="text-xl font-semibold mb-2">Interrogation Progress</h2>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${gameState.interrogationProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* Game Outcome */}
      {gameState.status === 'finished' && gameState.outcome && (
        <div className="bg-gray-800 p-4 mt-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">Game Outcome</h2>
          <p><strong>Team Won:</strong> {gameState.outcome.teamWon ? 'Yes' : 'No'}</p>
          <p><strong>Average Guilt Score:</strong> {gameState.outcome.averageGuiltScore?.toFixed(2) || 'N/A'}</p>
        </div>
      )}
    </div>
  );
};

export default Game;