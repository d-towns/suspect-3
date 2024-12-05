import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { useSocketContext } from '../context/SocketContext/socket.context';
import { ConversationItem, GameState, Player, VotingRoundVote } from '../models/game-state.model';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import decodeAudio, { decoders } from 'audio-decode';
import { FaChevronDown } from 'react-icons/fa';
import AudioPlayer from '../components/audioPlayer';
import AudioRecorder from '../components/audio-recorder';
import ResponseLoading from '../components/responseLoading';
import * as Accordion from '@radix-ui/react-accordion';
import { FaArrowRightLong } from "react-icons/fa6";
import { Card, Flex, Box, Text, Grid, Button, Container, Table, Avatar, Progress, Separator, RadioCards, Heading, Spinner, ScrollArea } from '@radix-ui/themes';
import './game.css';
import { Socket } from 'socket.io-client';
import { TransitionGroup, CSSTransition, SwitchTransition } from 'react-transition-group';


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

interface PlayerCardProps {
  player: Player;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
  return (
    <Card variant="ghost" className="list-disc list-inside">
      <Box key={player.id}>
        <Flex gap="2" align="center" direction="column" mb="5">
          <Avatar fallback={player.identity.split(',')[0].charAt(0)} />
          <Text as="p" weight="bold" size="4">
            {player.identity.split(',')[0]}
          </Text>

          <Box maxWidth="300px" width="80%">
            <Text as="p" mb="3" align="center" weight="medium">
              Guilt
            </Text>
            <Progress value={player.guiltScore} max={1} />
          </Box>
        </Flex>
        <Text as="p" align="center">
          {player.identity.split(',')[1]}
        </Text>
      </Box>
    </Card>
  );
};

// VotingRound Component
interface VotingRoundProps {
  gameState: GameState;
  killerVote: string | undefined;
  setKillerVote: React.Dispatch<React.SetStateAction<string | undefined>>;
  handleVoteSubmission: () => void;
  voteSubmitted: boolean;
}

const VotingRound: React.FC<VotingRoundProps> = ({
  gameState,
  killerVote,
  setKillerVote,
  handleVoteSubmission,
  voteSubmitted,
}) => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4 text-center">Voting Round</h2>
      {!voteSubmitted ? (
        <>
          <div>
            <p className="text-xl font-bold mb-4 text-center">
              Interrogator's Deduction
            </p>
            <div>
              <p className="text-lg p-4">
                {gameState.rounds
                  ?.slice()
                  .reverse()
                  .find((round) => round.status === 'completed')
                  ?.results?.deduction}
              </p>
            </div>
          </div>
          <RadioCards.Root
            className="w-full"
            value={killerVote}
            onValueChange={(vote) => setKillerVote(vote)}
            columns={{ initial: '1', sm: '2' }}
          >
            {gameState.players.map((player) => (
              <RadioCards.Item value={player.id} key={player.id}>
                <PlayerCard player={player} />
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
            style={{ width: '40%', margin: '20px auto' }}
            mt="4"
          >
            Submit Vote
          </Button>
        </Flex>
      )}
    </>
  );
};

// Interrogation Component
interface InterrogationProps {
  gameState: GameState;
  currentPlayer: Player | null;
  interrogationTranscript: ConversationItem[];
  responseLoading: boolean;
  audioTranscribing: boolean;
  socket: Socket; // Adjust this type based on your socket implementation
  emitEvent: (event: string, data: any) => void;
  handleAudioRecorded: (arrayBuffer: ArrayBuffer) => void;
}

const Interrogation: React.FC<InterrogationProps> = ({
  gameState,
  currentPlayer,
  interrogationTranscript,
  responseLoading,
  audioTranscribing,
  socket,
  emitEvent,
  handleAudioRecorded,
}) => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4 w-full">Interrogation</h2>
      <Box
        as="div"
        className="interrogationChat w-full overflow-y-auto p-4 rounded-lg"
        height="80%"
      >
        <Grid mb="2" columns="8" flow="dense" gap="5">
          <Box ml="2">
            <Heading size="5">Time</Heading>
          </Box>
          <Box className="col-span-7">
            <Heading size="5">Transcript</Heading>
          </Box>
          <Separator className="col-span-8" size="4" />
          {interrogationTranscript.map((conversationItem, index) => (
            <React.Fragment key={index}>
              <Box ml="2" mb="2">
                <Text as="p" weight="bold" size="3">
                  {Math.floor(conversationItem.timestamp / 60)}:
                  {conversationItem.timestamp % 60 < 10 ? '0' : ''}
                  {conversationItem.timestamp % 60}
                </Text>
                {conversationItem.audioBuffer && (
                  <Flex direction="column" className="col-span-3">
                    <Separator my="3" size="2" />
                    <AudioPlayer audioData={conversationItem.audioBuffer} />
                  </Flex>
                )}
              </Box>
              <Box className="col-span-7">
                <Text align="left" as="span">
                  {conversationItem.audioTranscript}
                </Text>
              </Box>
            </React.Fragment>
          ))}
        </Grid>
        {responseLoading && (
          <ResponseLoading label="Interrogator is thinking..." />
        )}
        {audioTranscribing && (
          <ResponseLoading label="Transcribing your response..." />
        )}
      </Box>
      <div className="flex justify-center">
        {socket && (
          <AudioRecorder
            socket={socket}
            emitEvent={emitEvent}
            onAudioRecorded={handleAudioRecorded}
          />
        )}
      </div>
    </>
  );
};

// ChangingRounds Component
interface ChangingRoundsProps {
  gameState: GameState;
}

const ChangingRounds: React.FC<ChangingRoundsProps> = ({ gameState }) => {
  return (
    <Flex
      justify="center"
      direction="column"
      align="center"
      gap="2"
      maxHeight="90vh"
      height="60%"
    >
      <Heading size="9" align="center">
        Changing Rounds
      </Heading>
      <Flex
        justify="center"
        align="center"
        gap="2"
        maxHeight="90vh"
        height="80%"
      >
        {gameState.rounds.map((round, index) => {
          if (round.type === 'interrogation') {
            const player = gameState.players.find((p) => p.id === round.player);
            const initial = player?.identity.split(',')[0].charAt(0) || '?';
            const name = player?.identity.split(',')[0] || 'Unknown';
            return (
              <React.Fragment key={index}>
                <Box>
                  <Flex align="center" gap="2">
                    <Flex direction="column" align="center" gap="2">
                      <Avatar
                        className={`${round.status === 'active' &&
                          'border border-lime-400 animate-bounce'
                          }`}
                        mt="3"
                        size="9"
                        fallback={initial}
                      />
                      <Text size="2" as="p" align="center">
                        {name} Questioning
                      </Text>
                    </Flex>
                    {index < gameState.rounds.length - 1 && (
                      <FaArrowRightLong size={24} />
                    )}
                  </Flex>
                </Box>
              </React.Fragment>
            );
          } else if (round.type === 'voting') {
            return (
              <React.Fragment key={index}>
                <Box>
                  <Flex align="center" gap="2">
                    <Flex direction="column" align="center" gap="2">
                      <Avatar
                        className={`${round.status === 'active' && 'border border-lime-400'
                          }`}
                        mt="3"
                        size="9"
                        src="voting-icon-url"
                        fallback="V"
                      />
                      <Text size="2" as="p" align="center">
                        Culprit Voting
                      </Text>
                    </Flex>
                    {index < gameState.rounds.length - 1 && (
                      <FaArrowRightLong size={24} />
                    )}
                  </Flex>
                </Box>
              </React.Fragment>
            );
          }
          return null;
        })}
      </Flex>
    </Flex>
  );
};

// GameOver Component
interface GameOverProps {
  gameState: GameState;
}

const GameOver: React.FC<GameOverProps> = ({ gameState }) => {
  return (
    <Flex direction="column" gap="4">
      <Box mt="8">
        <Box className="flex flex-col items-center justify-center h-full animate-bounce">
          {gameState.outcome?.winner === 'innocents' ? (
            <>
              <Heading className="mb-4 text-4xl">Innocents Win!</Heading>
              <Flex gap="4">
                {gameState.players
                  .filter((player) => !player.isCulprit)
                  .map((player) => (
                    <Card
                      key={player.id}
                      size="2"
                      variant="surface"
                      className="p-4 flex flex-col items-center"
                    >
                      <Avatar
                        fallback={player.identity.split(',')[0].charAt(0)}
                        size="6"
                      />
                      <Text className="mt-2 text-xl">
                        {player.identity.split(',')[0]}
                      </Text>
                    </Card>
                  ))}
              </Flex>
            </>
          ) : (
            <>
              <Heading className="mb-4 text-4xl">Culprit Wins!</Heading>
              <Flex gap="4">
                {gameState.players
                  .filter((player) => player.isCulprit)
                  .map((player) => (
                    <Card
                      key={player.id}
                      size="2"
                      variant="surface"
                      className="p-4 flex flex-col items-center"
                    >
                      <Avatar
                        fallback={player.identity.split(',')[0].charAt(0)}
                        size="6"
                      />
                      <Text className="mt-2 text-xl">
                        {player.identity.split(',')[0]}
                      </Text>
                    </Card>
                  ))}
              </Flex>
            </>
          )}
        </Box>
      </Box>
      <ScrollArea
        className="border rounded-lg p-4"
        type="always"
        scrollbars="vertical"
        style={{ height: 500 }}
      >
        <Heading size="7" mt="4" mb="7" align="left">
          Deductions from Each Round
        </Heading>
        <Flex direction="row" gap="2" justify="center">
          {gameState.rounds
            .filter((round) => round.type === 'interrogation')
            .map((round, index) => (
              <Card
                key={index}
                size="2"
                variant="surface"
                style={{ maxWidth: '400px', width: '400px' }}
              >
                <Flex direction="column" align="center">
                  <Text weight="bold" size="6">
                    Round {index + 1}
                  </Text>
                  <Separator size="4" my="3" />
                  <Heading weight="bold" size="4" mb="3" align="center">
                    Deduction
                  </Heading>
                  {round.results?.deduction || 'No deduction provided.'}
                  <Separator size="4" my="3" />
                  <Text as="p" weight="bold" size="3" align="center">
                    Guilt Score Updates
                  </Text>
                  <Flex direction="column" gap="1">
                    {gameState.players.map((player) => (
                      <Box key={player.id}>
                        <Text as="p">
                          {player.identity.split(',')[0]}: {player.guiltScore}
                        </Text>
                      </Box>
                    ))}
                  </Flex>
                </Flex>
              </Card>
            ))}
        </Flex>
        <Heading align="left" mb="7" mt="7" size="7">
          Voting Results
        </Heading>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.RowHeaderCell>Player</Table.RowHeaderCell>
              {gameState.rounds
                .filter((round) => round.type === 'voting')
                .map((round, idx) => (
                  <Table.RowHeaderCell key={idx}>
                    Round {idx + 1}
                  </Table.RowHeaderCell>
                ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {gameState.players.map((player) => (
              <Table.Row key={player.id}>
                <Table.Cell>{player.identity.split(',')[0]}</Table.Cell>
                {gameState.rounds
                  .filter((round) => round.type === 'voting')
                  .map((round, idx) => {
                    const vote = round.results.votingResults?.find(
                      (vote) => vote.voterId === player.id
                    );
                    const votedFor = gameState.players.find(
                      (p) => p.id === vote?.playerId
                    );
                    return (
                      <Table.Cell key={idx}>
                        {votedFor
                          ? votedFor.identity.split(',')[0]
                          : 'No Vote'}
                      </Table.Cell>
                    );
                  })}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </ScrollArea>
    </Flex>
  );
};


const Game = () => {
  const { socket, emitEvent, joinRoom } = useSocketContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const { roomId } = useParams<{ roomId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [interrogationTranscript, setInterrogationTranscript] = useState<ConversationItem[]>(testConversationItems);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const interrogationCardRef = useRef<HTMLDivElement>(null);
  const votingCardRef = useRef<HTMLDivElement>(null);
  const resultsCardRef = useRef<HTMLDivElement>(null);
  const resultsLoadingRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef(null);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const [resultsLoading, setResultsLoading] = useState<boolean>(false);
  const [audioTranscribing, setAudioTranscribing] = useState<boolean>(false);
  const [forceInterrogation, setForceInterrogation] = useState<boolean>(false);
  const [forceVoting, setForceVoting] = useState<boolean>(false);
  const [responseLoading, setResponseLoading] = useState<boolean>(false);
  const [activeRound, setActiveRound] = useState<'interrogation' | 'voting'>('interrogation');
  const [killerVote, setKillerVote] = useState<string>();
  const [detailsRevealed, setDetailsRevealed] = useState<boolean>(false);
  const [gameIsOver, setGameIsOver] = useState<boolean>(false);
  const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false)


  useEffect(() => {
    if (socket) {
      console.log('Adding listeners');
      socket.on('game-state-update', (newState: GameState) => {
        console.log('Received game state update:', newState);
        setGameState(newState);
        if (newState.status === 'finished') {
          setGameIsOver(true);
        }
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

        } else {
          navigate(`/lobby/${roomId}`);
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




  const renderGameContent = (): JSX.Element | null => {
    if (!gameState || !socket) {
      return <></>;
    }

    if (gameIsOver) {
      return <GameOver gameState={gameState} />;
    }

    if (resultsLoading) {
      return null;
    }

    if ((user && activeRound === 'voting' && !forceInterrogation) || forceVoting) {
      return (
        <VotingRound
          gameState={gameState}
          killerVote={killerVote}
          setKillerVote={setKillerVote}
          handleVoteSubmission={handleVoteSubmission}
          voteSubmitted={voteSubmitted}
        />
      );
    }

    if ((activeRound === 'interrogation' && !forceVoting) || forceInterrogation) {
      const isCurrentPlayer =
        gameState.rounds?.find((round) => round.status === 'active')?.player === currentPlayer?.id;

      if (isCurrentPlayer || forceInterrogation) {
        return (
          <Interrogation
            gameState={gameState}
            currentPlayer={currentPlayer}
            interrogationTranscript={interrogationTranscript}
            responseLoading={responseLoading}
            audioTranscribing={audioTranscribing}
            socket={socket}
            emitEvent={emitEvent}
            handleAudioRecorded={handleAudioRecorded}
          />
        );
      }

      const activePlayer = gameState.players.find(
        (player) => gameState.rounds?.find((round) => round.status === 'active')?.player === player.id
      );

      return (
        <Flex maxHeight="40%" align="center" direction="column">
          <Text size="8">
            {activePlayer?.identity.split(',')[0] || 'A player'} enters the room...
          </Text>
        </Flex>
      );
    }

    return <ChangingRounds gameState={gameState} />;
  };

  const determineKeyBasedOnState = () => {
    if (!gameIsOver) {
      if (!resultsLoading) {
        if (
          (user && activeRound === 'voting' && !forceInterrogation) ||
          forceVoting
        ) {
          return 'voting';
        } else if (
          (activeRound === 'interrogation' && !forceVoting) ||
          forceInterrogation
        ) {
          return 'interrogation';
        } else {
          return 'results';
        }
      }

    };
  }




  if (!gameState) {
    return <></>
  }

  return (
    <Box>

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
            <Button onClick={() => setDetailsRevealed(prev => !prev)}>
              reveal
            </Button>

            <CSSTransition
              in={detailsRevealed}
              nodeRef={votingCardRef}
              timeout={500}
              classNames="fade"
              unmountOnExit>
              <div ref={votingCardRef}>TEST</div>
            </CSSTransition>

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
          <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '1400px' }}>
            <SwitchTransition mode="out-in">
              <CSSTransition
                key={determineKeyBasedOnState()}
                classNames="fade"
                timeout={1000}
                unmountOnExit
                nodeRef={nodeRef}
              >
                <div ref={nodeRef}>
                  {renderGameContent()}
                </div>
              </CSSTransition>
            </SwitchTransition>
          </Card>
        </Flex>
      </Box>
    </Box>
  );
}


export default Game;