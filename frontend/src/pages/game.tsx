import { useState, useEffect, useRef} from 'react';
import React from 'react';
import { useSocketContext } from '../context/SocketContext/socket.context';
import { ConversationItem, GameState, Player, VotingRoundVote } from '../models/game-state.model';
import { useParams } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import decodeAudio, { decoders } from 'audio-decode';
import { FaChevronDown } from 'react-icons/fa';
import classNames from 'classnames';
import AudioPlayer from '../components/audioPlayer';
import AudioRecorder from '../components/audio-recorder';
import ResponseLoading from '../components/responseLoading';
import * as Accordion from '@radix-ui/react-accordion';
import { Card, Flex, Box, Text, Grid, Button, Container, Avatar, Progress, Separator, RadioCards, Heading } from '@radix-ui/themes';
import './game.css';


const testConversationItems: ConversationItem[] = [
  {
    audioBuffer: new ArrayBuffer(380),
    audioTranscript: "Hello, can you tell me where you were on the night of the crime?",
    timestamp: 100
  },
  {
    audioBuffer: null,
    audioTranscript: "I was at home, watching a movie.",
    timestamp: 200
  },
  {
    audioBuffer: null,
    audioTranscript: "Did anyone see you there?",
    timestamp: 300
  },
  {
    audioBuffer: null,
    audioTranscript: "Yes, my neighbor saw me.",
    timestamp: 400
  },
  {
    audioBuffer: null,
    audioTranscript: "Can you provide any evidence to support your alibi?",
    timestamp: 500
  },
  {
    audioBuffer: null,
    audioTranscript: "Sure, I have the movie ticket and the receipt from the store.",
    timestamp: 600
  },
];

const PlayerCard = ({ player }: { player: Player }) => {
  return (
    <Card variant='ghost' className="list-disc list-inside">
      <Box key={player.id}>
        <Flex gap={'2'} align='center' direction={'column'} mb={'5'}>
          <Avatar fallback={player.identity.split(',')[0].charAt(0)} />
          <Text as='p' weight={'bold'} size='4'>{player.identity.split(',')[0]}</Text>

          <Box maxWidth="300px" width={'80%'}>
            <Text as='p' mb={'3'} align={'center'} weight={'medium'}>Guilt</Text>
            <Progress value={player.guiltScore} max={1} />
          </Box>
        </Flex>
        <Text as='p' align={'center'}> {player.identity.split(',')[1]}</Text>
      </Box>
    </Card>
  )
}

const Game = () => {
  const { socket, emitEvent, joinRoom } = useSocketContext();
  const { user } = useAuth();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const { roomId } = useParams<{ roomId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [interrogationTranscript, setInterrogationTranscript] = useState<ConversationItem[]>(testConversationItems);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const [resultsLoading, setResultsLoading] = useState<boolean>(false);
  const [audioTranscribing, setAudioTranscribing] = useState<boolean>(false);
  const [forceInterrogation, setForceInterrogation] = useState<boolean>(true);
  const [forceVoting, setForceVoting] = useState<boolean>(false);
  const [responseLoading, setResponseLoading] = useState<boolean>(false);
  const [activeRound, setActiveRound] = useState<'interrogation' | 'voting'>('interrogation');
  const [killerVote, setKillerVote] = useState<string>();
  const [detailsRevealed, setDetailsRevealed] = useState<boolean>(false);
  const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false)


  useEffect(() => {
    if (socket) {
      console.log('Adding listeners');
      socket.on('game-state-update', (newState: GameState) => {
        console.log('Received game state update:', newState);
        setGameState(newState);
        setResultsLoading(false);

      });
      socket.on('game-state-updating', () => {
        console.log('Game state is updating');
        setResultsLoading(true);
      });

      socket.on('realtime-audio-message', async (params: any) => {
        try {
          console.log('Received audio message:', params);
          const { audioBuffer, audioTranscript } = params;
          const audioWav = await decoders.wav(params.audioBuffer);

          setInterrogationTranscript(prev => [...prev, { audioBuffer, audioTranscript, timestamp: roundTimer }]);

          setResponseLoading(false);
          console.log('Playing audio message:', audioWav);
        } catch (error) {
          console.error('Error playing audio message:', error);
        }

      });

      socket.on('round-timer-tick', (params: any) => {
        setRoundTimer(params.countdown);
        console.log('Round timer tick:', params.countdown);
      });

      socket.on('voting-round-start', (params: any) => {
        console.log('Voting round starting:', params);
      });


      socket.on('user-audio-transcript', (params: any) => {
        console.log('Received audio transcript:', params);
        setInterrogationTranscript(prev => [...prev, { audioBuffer: null, audioTranscript: params.audioTranscript, timestamp: roundTimer }]);
        setAudioTranscribing(false);
      }
      );

      /**
       * [*] TODO: Create state object that will keep track of the time left in the round, updates on websocket events from the server
       * [*] TODO: Createa startrecording function that cretes a MediaStream and MediaRecorder object and starts recording audio
       * [*] TODO: Stream the audio to the server through websocket events in the MediaRecorder ondataavailable event callback
       * [*] TODO: (moved to useSocket hook) Emit a joined-game event to the server socket to let the server know that the user has joined the game
       * [*] TODO: automatically start recording after the most recent audo message has been played fully
       * [*] TODO: send a 'realtime-audio-response-end' event to the server when the user stops recording ( either by timer ending or manually )
       * [] TODO: once the round timer ends for all rounds after the first, since it is controlled by the server, we will then move to a loading screen and wait for the game state to update
       * [] TODO: once we have the update, we can show the new guily score for the player and the new round timer
       * [] TODO: once the interrogation round is over, we enter the voting round
       * [] TODO: in the voting round, each player will see each others guilt score and will have to vote on who they think is a rat
       * [] TODO: Once the voting round voting is over, the players will ahve either voted for a player or not, 
       * [] TODO: if a player recives at least n // 2 votes where n is the number of players and they did rat out the other players, they will lose the game and leaderboard rank
       * [] TODO: uf a player recieves at least n // 2 votes where n is the number of players and they did not rat out the other players, they will win the game and leaderboard rank
       */

      socket.on('game-starting', async (params: any) => {
        console.log('Game is starting');
      });

      joinRoom(roomId);

    }

    return () => {
      if (socket) {
        console.log('Removing listeners');
        socket.off('game-state-update');
        socket.off('realtime-audio-message');
        socket.off('round-timer-tick');
        // Remove other listeners
      }
    };
  }, [socket]);




  useEffect(() => {
    if (roomId) {
      roomsService.getRoom(roomId).then((room) => {
        console.log('Room:', room);
        if (room.game_state && typeof room.game_state === 'object') {
          console.log(room);
          setGameState(room.game_state);

        }
      });
    }
  }, [roomId, user]);

  useEffect(() => {
    if (roundTimer === 1) {
      setInterrogationTranscript([]);
    }
  }, [roundTimer]);

  useEffect(() => {
    const setCurrentPlayerState = () => {
      if (gameState && user) {
        const player = gameState.players.find(player => player.id === user.id);
        if (player) {
          setCurrentPlayer(player);
        }

      }
    }
    const getActiveRoundFromGameState = () => {
      if (gameState) {
        const activeRound = gameState.rounds.find(round => round.status === 'active');
        if (activeRound) {
          setActiveRound(activeRound.type);
        }
      }
    }

    setCurrentPlayerState();
    getActiveRoundFromGameState();

  }, [gameState, user]);


  const handleAudioRecorded = (arrayBuffer: ArrayBuffer) => {
    console.log('Audio recorded:', arrayBuffer);
    setAudioTranscribing(true);
    setResponseLoading(true);
  }
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

  const handleVoteSubmission = () => {
    if (killerVote && user) {
      const vote: VotingRoundVote = {
        playerId: killerVote,
        voterId: user?.id
      };
      emitEvent('voting-round-vote', vote);
      setVoteSubmitted(true)
    }
  }

  return (
    <Box>
      {gameState?.status !== 'finished' ? (
        <Box className="h-screen flex">
          {/* Main game area */}
          <Flex px={'5'} py={'5'} gap={'4'} className='w-full'>
            {/* Left panel: Crime and Evidence */}
            <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '400px' }}>
              {/* Round Timer */}
              {roundTimer > 0 && (
                <Box className="timerBox mb-4 p-4 rounded border">
                  <Text as='p' size={'5'}>Round Timer</Text>
                  {/* show th etimer left in minutes and seconds */}
                  <Text as='p' size={'8'}>{Math.floor(roundTimer / 60)}:{roundTimer % 60 < 10 && '0'}{roundTimer % 60}</Text>
                </Box>
              )}

              {/* Accordion for Identity, Evidence, and Guilt Scores */}
              <Accordion.Root
                type="single"
                collapsible
                className="w-full rounded-md shadow-md"
              >
                <Accordion.Item value="identity-evidence" className="mt-px overflow-hidden first:mt-0 first:rounded-t last:rounded-b focus-within:relative focus-within:z-10 focus-within:shadow-[0_0_0_1px] focus-within:shadow-mauve12">
                  <Accordion.Header>
                    <Accordion.Trigger className="group flex h-[45px] accordionTrigger w-full flex-1 cursor-pointer items-center justify-between px-5 text-[15px] leading-none shadow-[0_1px_0]  outline-none transition duration-200 ease-in-out ">
                      Identity & Evidence
                      <FaChevronDown className="text-violet10 transition-transform duration-300 ease-[cubic-bezier(0.87,_0,_0.13,_1)] group-data-[state=open]:rotate-180" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="overflow-hidden text-[15px] text-mauve10 data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">

                    <Container p={'5'}>
                      <h2 className="text-2xl font-bold mb-4">Identity</h2>
                      <p className="mb-4">{currentPlayer?.identity || 'Unknown'}</p>
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
                    </Container>
                  </Accordion.Content>
                </Accordion.Item>

                <Accordion.Item value="guilt-scores" className="mt-px overflow-hidden first:mt-0 first:rounded-t last:rounded-b focus-within:relative focus-within:z-10 focus-within:shadow-[0_0_0_2px] focus-within:shadow-mauve12">
                  <Accordion.Header>
                    <Accordion.Trigger className="group flex h-[45px] accordionTrigger w-full flex-1 cursor-pointer items-center justify-between px-5 text-[15px] leading-none shadow-[0_1px_0]  outline-none transition duration-200 ease-in-out ">

                      Player Details
                      <FaChevronDown className="text-violet10 transition-transform duration-300 ease-[cubic-bezier(0.87,_0,_0.13,_1)] group-data-[state=open]:rotate-180" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="overflow-hidden text-[15px] text-mauve10 data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                    <Flex p={'5'} direction={'column'} gap={'4'}>

                      {gameState.players.map(player => (
                        <PlayerCard player={player} key={player.id} />
                      ))}

                    </Flex>
                  </Accordion.Content>
                </Accordion.Item>
              </Accordion.Root>
            </Card>

            {/* Right panel: Interrogation chat or Voting */}
            {!resultsLoading ? (
              (user && activeRound === 'voting' && !forceInterrogation) || forceVoting ? (
                <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '1400px' }}>
                  <h2 className="text-2xl font-bold mb-4 text-center">Voting Round</h2>
                  {!voteSubmitted ? (
                    <>
                      <div>
                        <p className='text-xl font-bold mb-4 text-center'>Interrogator's Deduction</p>
                        <div>
                          <p className='text-lg p-4'>{gameState.rounds?.slice().reverse().find(round => round.status === 'completed')?.results?.deduction}</p>
                        </div>
                      </div>
                      <RadioCards.Root className='w-full' value={killerVote} onValueChange={(vote) => setKillerVote(vote)} columns={{ initial: "1", sm: "2" }}>
                        {gameState.players.map((player) => (
                          <RadioCards.Item value={player.id}>
                            <PlayerCard player={player} key={player.id} />
                          </RadioCards.Item>
                        ))}
                      </RadioCards.Root>
                    </>
                  ) : (
                    <p className="text-center text-lg">Vote Submitted</p>
                  )}
                  {!voteSubmitted && (
                    <Flex>
                      <Button
                        onClick={handleVoteSubmission}
                        style={{ width: '40%', margin: ' 20px auto' }}
                        mt={'4'}
                      >
                        Submit Vote
                      </Button>
                    </Flex>
                  )}
                </Card>
              ) : ((activeRound === 'interrogation' && !forceVoting) || forceInterrogation) && (
                <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '1400px' }}>
                  {(gameState.rounds?.find(round => round.status === 'active')?.player === currentPlayer?.id || forceInterrogation) ? (
                    <>
                      <h2 className="text-2xl font-bold mb-4 w-full">Interrogation</h2>
                      <Box
                        ref={chatAreaRef}
                        as='div'
                        className="interrogationChat w-full overflow-y-auto p-4 rounded-lg  "
                        height={'80%'}
                      >
<Grid mb={'2'} columns={'8'} flow={'dense'} gap={'5'} >
  <Box ml={'2'} >
    <Heading size="5">Time</Heading>
  </Box>
  <Box className='col-span-7' >
    <Heading size="5">Transcript</Heading>
  </Box>
  <Separator  className='col-span-8' size={'4'} />
  {interrogationTranscript.map((conversationItem, index) => (
    <React.Fragment key={index} >
      <Box ml={'2'} mb={'4'} >
        <Text as='p' weight='bold' size={'3'}>
          {Math.floor(conversationItem.timestamp / 60)}:{conversationItem.timestamp % 60 < 10 ? '0' : ''}{conversationItem.timestamp % 60}
        </Text>
        {conversationItem.audioBuffer && (
          <Flex direction='column' justify='center' align='center'className='col-span-3' >
            <Separator my={'3'} size={'4'} />
            <AudioPlayer audioData={conversationItem.audioBuffer} />
          </Flex>
        )}
      </Box>
      <Box className='col-span-7' >
      <Text align='left' as='span'>{conversationItem.audioTranscript}</Text>
      </Box>
    </React.Fragment>
  ))}
  {responseLoading && <ResponseLoading label='Interrogator is thinking...' />}
  {audioTranscribing && <ResponseLoading label='Transcribing your response...' />}
</Grid>
                        {responseLoading && <ResponseLoading label='Interrogator is thinking...' />}
                        {audioTranscribing && <ResponseLoading label='Transcribing your response...' />}
                      </Box>
                      <div className="flex justify-center">
                        {socket &&
                          <AudioRecorder socket={socket} emitEvent={emitEvent} onAudioRecorded={handleAudioRecorded} />
                        }
                      </div>
                    </>) : (
                    <Flex maxHeight={'40%'} align={'center'} direction={'column'}>
                      <Text size={'8'} className=''>
                        {gameState.players.find(player => gameState.rounds?.find(round => round.status === 'active')?.player === player.id)?.identity.split(',')[0]} enters the room...
                      </Text>
                    </Flex>)}

                </Card>
              )
            ) : (
              <div className="w-full bg-gray-800 p-4 rounded-lg text-center">
                <h2 className="text-4xl font-bold mb-4">Results</h2>
                <p className="text-2xl">Results are being calculated...</p>
                <ResponseLoading label='Calculating Results' />
              </div>
            )}
          </Flex>
        </Box>
      ) :
        (
          <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-2xl font-bold">Game Over</div>
            <div className="text-xl">Team {gameState.outcome?.winner} Won</div>
          </div>
        )}
    </Box>
  );
};


export default Game;