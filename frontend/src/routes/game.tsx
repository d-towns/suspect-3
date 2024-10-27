import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { GameState, Player } from '../models/game-state.model';
import { useParams } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import decode, { decoders } from 'audio-decode';
import { FaMicrophone } from 'react-icons/fa6'
import { convertAudioData } from '../utils/audio-helpers';

const Game = () => {
  const { socket, emitEvent } = useSocket();
  const { user } = useAuth();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const { roomId } = useParams<{ roomId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [interragationTranscript, setInterragationTranscript] = useState<any[]>([]);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const [recordingTimer, setRecordingTimer] = useState<number>(15);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);


  useEffect(() => {
    if (socket) {
      socket.on('game-state-update', (newState: GameState) => {
        console.log('Received game state update:', newState);
        setGameState(newState);
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

      socket.on('round-timer-tick', (params: any) => {
        setRoundTimer(params.countdown);
        console.log('Round timer tick:', params.countdown);
      });

      /**
       * [*] TODO: Create roundTimer state object that will keep track of the time left in the round, updates on websocket events from the server
       * [*] TODO: Createa startrecording function that cretes a MediaStream and MediaRecorder object and starts recording audio
       * [*] TODO: Stream the audio to the server through websocket events in the MediaRecorder ondataavailable event callback
       * [*] TODO: (moved to useSocket hook) Emit a joined-game event to the server socket to let the server know that the user has joined the game
       */

      socket.on('game-starting', async (params: any) => {
        console.log('Game is starting');
      });
    }

    return () => {
      if (socket) {
        socket.off('game-state-update');
        socket.off('realtime-audio-message');
        socket.off('round-timer-tick');
        // Remove other listeners
      }
    };
  }, [socket]);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (roomId) {
      roomsService.getRoom(roomId).then((room) => {
        if (room.game_state && typeof room.game_state === 'object') {
          console.log(room);
          setGameState(room.game_state);

        }
      });
    }
  }, [roomId, user]);

  useEffect(() => {
    if (roundTimer === 1) {
      setInterragationTranscript([]);
    }
  }, [roundTimer]);

  useEffect(() => {
    if (gameState && user) {
      const player = gameState.players.find(player => player.id === user.id);
      if (player) {
        setCurrentPlayer(player);
      }
    }
  }, [gameState, user]);


  // const startNextRound = () => {
  //   if (socket) {
  //     socket.emit('start-next-round', roomId);
  //   }
  // }


  const startRecording = async () => {
    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;


      mediaRecorder.ondataavailable = async (event) =>{
        const base64AudioString = convertAudioData(event);
        emitEvent('realtime-audio-message', { audioBuffer: base64AudioString});
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped');
      };

      mediaRecorder.start(1000);

      const recordingInterval = setInterval(() => {
        setRecordingTimer(prev => prev - 1);
        if (recordingTimer === 0) {
          clearInterval(recordingInterval);
          stopRecording();
        }
      }, 1000);

      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };
  /**
   * UI FLow
   * once all players are in the game, ( we receive the game-starting event )
   * we start a 30 second timer for players to read the crime details and thier identity and evidence
   * then we send a message to the server to start the first round
   * for the player in the first round, who arent in the round show the interregation transcript and play the audio message
   * for those who arent in the round show the crime details and thier evidence along with the round timer
   */

  if (!gameState) {
    return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-2xl font-bold">Loading game...</div>
    </div>;
  }

  return (
    <div>
      {roundTimer > 0 && (
        <div className="fixed top-0 right-0 p-4 bg-gray-800 text-white rounded-bl-lg">
          <p>Time left in round: {roundTimer} seconds</p>
        </div>
      )}
      <div className="h-screen bg-gray-900 text-white flex flex-col">
        {/* HUD-like top bar */}
        <div className="bg-gray-800 p-4 flex justify-between items-center">
          <div className="flex-1 ml-7 text-left">
            <h2 className="text-4xl font-bold">Suspect 3</h2>
            <p className="text-lg">
              Round: {gameState.status ? gameState.status.charAt(0).toUpperCase() + gameState.status.slice(1) : 'Unknown'}
            </p>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-xl font-bold">Guilt Meter</h3>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-red-600 h-2.5 rounded-full"
                style={{ width: `${currentPlayer?.guiltScore ? currentPlayer.guiltScore * 100 : 0}%` }}
              ></div>
            </div>
            <p className="mt-1">Score: {Number(currentPlayer?.guiltScore?.toFixed(2)) * 100 || '0.00'}%</p>
          </div>
        </div>

        {/* Main game area */}
        <div className="flex-1 p-6 flex">
          {/* Left panel: Crime and Evidence */}
          <div className="w-1/4 bg-gray-800 p-4 rounded-lg mr-4 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Identity</h2>
            <p className="mb-4">{currentPlayer?.identity || 'Unknown'} </p>
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
          {roundTimer > 0 ? (
            <div className="flex w-full flex-col items-center justify-center p-4 bg-gray-800 text-white rounded-bl-lg">
              <p className="text-lg mb-2">Next round begins in:</p>
              <p className="text-5xl">{roundTimer} seconds</p>
            </div>
          ) :
            gameState.rounds?.find(round => round.status === 'inactive')?.player == currentPlayer?.id ? (

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
                      if (isRecording) {
                        stopRecording();
                      } else {
                      startRecording();
                      }
                    }}
                    className={`
              flex
              flex-row
              gap-2
              items-center
              ${isRecording 
              ? 'bg-red-700' : 'bg-gray-700'}
              } text-white p-2 rounded-lg
              hover:bg-gray-600
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
              focus:ring-offset-2
              focus:ring-offset-gray-900  
                 `}>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                    <div>
                      <FaMicrophone />
                    </div>
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
              </div>) :
              <div className="flex w-full flex-col items-center justify-center p-4 bg-gray-800 text-white rounded-bl-lg">
                <p className="text-5xl">{gameState.players.find(player => gameState.rounds?.find(round => round.status === 'inactive')?.player == player.id)?.identity.split(',')[0]} enters the room...</p>
              </div>
          }
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
    </div>
  );
};


export default Game;