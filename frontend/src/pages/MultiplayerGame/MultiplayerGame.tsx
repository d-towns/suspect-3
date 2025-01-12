import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import { useSocketContext } from '../../context/SocketContext/socket.context';
import { ConversationItem, MultiGameState, Player, VotingRoundVote } from '../../models/game-state.model';
import { leaderboardService } from '../../services/leaderboard.service';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsService } from '../../services/rooms.service';
import { useAuth } from '../../context/auth.context';
import { FiChevronUp, FiChevronDown, FiChevronsDown, FiChevronsUp } from 'react-icons/fi';
import { FaChevronDown } from 'react-icons/fa';
// import AudioRecorder from '../../components/audioRecorder';
import ResponseLoading from '../../components/responseLoading';
import * as Accordion from '@radix-ui/react-accordion';
import { Card, Flex, AlertDialog, Box, Text, Grid, Button, Container, Table, Avatar, Progress, Separator, RadioCards, Heading, ScrollArea, Badge, TextField } from '@radix-ui/themes';
import './game.css';
import { Socket } from 'socket.io-client';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { WavStreamPlayer } from 'wavtools';
import { ChatMessage } from '../../models';




interface AllowAutoplayDialogProps {
  open: boolean;
  onClose: () => void;
  onAllow: () => void;
}

const AllowAutoplayDialog: React.FC<AllowAutoplayDialogProps> = ({ open, onClose, onAllow }) => {
  return (
    <AlertDialog.Root open={open} onOpenChange={onClose}>
      <AlertDialog.Content size='4'>
        <Box className="p-4">
          <Text as="p" size="3" align="center">
            This game requires audio playback. Please allow autoplay to proceed.
          </Text>
          <Flex justify="center" mt="4" gap={'6'}>

            <AlertDialog.Cancel onClick={() => onClose()}>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action onClick={() => onAllow()}>
              <Button variant="soft">Allow</Button>
            </AlertDialog.Action>
          </Flex>
        </Box>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};

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
            <Progress value={player.guiltScore} max={100} />
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
  gameState: MultiGameState;
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
          disabled={voteSubmitted}
        >
          {gameState.players.map((player) => (
            <RadioCards.Item value={player.id} key={player.id}>
              <PlayerCard player={player} />
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
      </>
      <Flex>
        <Button
          onClick={handleVoteSubmission}
          color={`${killerVote ? 'green' : 'gray'}`}
          style={{ width: '40%', margin: '20px auto' }}
          mt="4"
          disabled={!killerVote || voteSubmitted}
        >
          {voteSubmitted ? 'Vote Submitted!' : 'Submit Vote'}
        </Button>
      </Flex>
    </>
  );
};

// Interrogation Component
interface InterrogationProps {
  gameState: MultiGameState;
  currentPlayer: Player | null;
  interrogationTranscript: ConversationItem[];
  responseLoading: boolean;
  audioTranscribing: boolean;
  socket: Socket; // Adjust this type based on your socket implementation
  emitEvent: (event: string, data: any) => void;
  handleAudioRecorded: (arrayBuffer: ArrayBuffer) => void;
}

const Interrogation: React.FC<InterrogationProps> = ({
  interrogationTranscript,
  responseLoading,
  audioTranscribing,
  // socket,
  // emitEvent,
  // handleAudioRecorded,
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
                {/* {conversationItem.audioBuffer && (
                  <Flex direction="column" className="col-span-3">
                    <Separator my="3" size="2" />
                    <AudioPlayer audioData={conversationItem.audioBuffer} />
                  </Flex>
                )} */}
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
        {/* {socket && (
          <AudioRecorder
            socket={socket}
            emitEvent={emitEvent}
            onAudioRecorded={handleAudioRecorded}
          />
        )} */}
      </div>
    </>
  );
};

// ChangingRounds Component
interface ChangingRoundsProps {
  gameState: MultiGameState;
}

const ChangingRounds: React.FC<ChangingRoundsProps> = ({ gameState }) => {
  return (
    <Flex
      justify="center"
      direction="column"
      align="center"
      gap="2"
      maxHeight="90vh"
      height="100%"
    >
      <Heading size="9" align="center">
        Changing Rounds
      </Heading>
      <Flex
        direction={{ xs: 'column', md: 'row' }}
        justify="center"
        align="center"
        gap="2"
        maxHeight="90vh"
        height="100%"

      >
        {gameState.rounds.map((round, index) => {
          if (round.type === 'interrogation') {
            const player = gameState.players.find((p) => p.id === round.player);
            const initial = player?.identity.split(',')[0].charAt(0) || '?';
            return (
              <React.Fragment key={index}>
                <Box>
                  <Flex align="center" direction={{ xs: 'column', md: 'row' }} gap="2">
                    <Flex direction="column" align="center" gap="2" >
                      <Avatar
                        className={`${round.status === 'active' &&
                          'border border-lime-400 animate-bounce'
                          }`}
                        mt="3"
                        size={{ md: '9', sm: '6', xs: '4' }}
                        fallback={initial}
                      />
                      <Text size="2" style={{ maxWidth: '100px' }} as="p" align="center">
                        Questioning
                      </Text>
                    </Flex>
                    <Box width={'30px'}>
                      {index < gameState.rounds.length - 1 && (
                        <Separator size="4" my="3" />
                      )}
                    </Box>
                  </Flex>
                </Box>
              </React.Fragment>
            );
          } else if (round.type === 'voting') {
            return (
              <React.Fragment key={index}>
                <Box>
                  <Flex align="center" gap="2" direction={{ xs: 'column', md: 'row' }}>
                    <Flex direction="column" align="center" gap="2">
                      <Avatar
                        className={`${round.status === 'active' && 'border border-lime-400 animate-bounce'
                          }`}
                        mt="3"
                        size={{ md: '9', sm: '6', xs: '4' }}
                        src="voting-icon-url"
                        fallback="V"
                      />
                      <Text size="2" as="p" align="center">
                        Voting
                      </Text>
                    </Flex>
                    <Box width={'30px'}>
                      {index < gameState.rounds.length - 1 && (
                        <Separator size="4" my="3" />
                      )}
                    </Box>
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

interface ResultsSummaryProps {
  elo: number;
  newElo: number | 0;
  badges: string[];
}

const ResultsSummary: React.FC<ResultsSummaryProps> = ({ elo, newElo, badges }) => {
  const eloDiff = newElo == 0 ? 0 : newElo - elo;
  return (
    <Flex direction={'column'} >

      <Heading> Results Summary </Heading>
      <Flex gap={'5'} mt='3'>
        <Flex gap={'3'} >

          <Text weight='bold' size='9'>{newElo || elo}<Text size={'3'} as='p'> New Rank</Text></Text>

          <Text>
            {eloDiff > 0 ? (
              eloDiff > 15 ? (
                <>
                  <FiChevronsUp /> {eloDiff}
                </>
              ) : (
                <>
                  <FiChevronUp /> {eloDiff}
                </>
              )
            ) : eloDiff < 0 ? (
              eloDiff < -15 ? (
                <>
                  <FiChevronsDown /> {eloDiff}
                </>
              ) : (
                <>
                  <FiChevronDown /> {eloDiff}
                </>
              )
            ) : (
              '----'
            )}
          </Text>
        </Flex>
        <Flex gap={'2'}>
          {badges.map((badge, index) => (
            <Badge key={index} size='2' variant='surface'>{badge}</Badge>
          ))}
        </Flex>
      </Flex>
    </Flex>
  )
}

// GameOver Component
interface GameOverProps {
  gameState: MultiGameState;
  elo: number;
  newElo: number | 0
  badges: string[];
}

const GameOver: React.FC<GameOverProps> = ({ gameState, elo, newElo, badges }) => {
  return (
    <Flex direction="column" gap="4" >
      <Flex>
        <Box className="flex flex-col w-full items-center justify-center h-full">
          {gameState.outcome === 'win' ? (
            <>
              <Heading className="mb-4 text-4xl">Innocents Win!</Heading>
              <Flex gap="4"  mt={'9'} direction={{sm: 'column', md: 'row'}} width={'80%'} justify={'between'} >
                <Flex gap="4" >
                {gameState.players
                  .filter((player) => !player.isCulprit)
                  .map((player) => (
                    <Card
                      key={player.id}
                      size="2"
                      variant="surface"
                      className="p-4 flex flex-col items-center lg:animate-bounce  "
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
                <ResultsSummary elo={elo} newElo={newElo} badges={badges} />
              </Flex>
            </>
          ) : (
            <>
              <Heading className="mb-4 text-4xl">Culprit Wins!</Heading>
              <Flex gap="9" mt={'9'} width={'80%'} justify={'between'} align={'center'} direction={{sm: 'column', md: 'row'}} >
                <Flex direction={'column'}>
                  <Heading> Winning Team </Heading>
                  <Flex mt='9'>
                    {gameState.players
                      .filter((player) => player.isCulprit)
                      .map((player) => (
                        <Card
                          key={player.id}
                          size="2"
                          variant="surface"
                          className="p-4 flex flex-col items-center  lg:animate-bounce"
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
                </Flex>
                <ResultsSummary elo={elo} newElo={newElo} badges={badges} />
              </Flex>
            </>
          )}
        </Box>
      </Flex>
      <Heading>Game Summary</Heading>
      <ScrollArea
        className="border rounded-lg p-4 h-full"
        type="always"
        scrollbars="vertical"
        style={{ height: '50vh' }}
      >
        <Heading size="7" mt="4" mb="7" align="left">
          Deductions from Each Round
        </Heading>
        <Grid columns={{md: '1', lg:"2"}} gap={'5'}>
          {gameState.rounds
            .filter((round) => round.type === 'interrogation')
            .map((round, index) => (
              <Card
                key={index}
                size="2"
                variant="surface"
                style={{ maxWidth: '400px', width: '400px', margin: 'auto' }}
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
        </Grid>
        <Heading align="left" mb="7" mt="7" size="7">
          Voting Results
        </Heading>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.RowHeaderCell>Player</Table.RowHeaderCell>
              {gameState.rounds
                .filter((round) => round.type === 'voting')
                .map((_, idx) => (
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


const MultiplayerGame = () => {
  const { socket, emitEvent, joinRoom, sendChatMessage } = useSocketContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const { roomId } = useParams<{ roomId: string }>();
  const [gameState, setGameState] = useState<MultiGameState | null>(null);
  const [interrogationTranscript, setInterrogationTranscript] = useState<ConversationItem[]>([]);
  const nodeRef = useRef(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const [resultsLoading, setResultsLoading] = useState<boolean>(false);
  const [audioTranscribing, setAudioTranscribing] = useState<boolean>(false);
  const [responseLoading, setResponseLoading] = useState<boolean>(false);
  const [activeRound, setActiveRound] = useState<'interrogation' | 'voting'>('interrogation');
  const [killerVote, setKillerVote] = useState<string>();
  const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false)
  const [autoplayDialogOpen, setAutoplayDialogOpen] = useState<boolean>(true);
  const [playerElo, setPlayerElo] = useState<{ currentElo: number, updatedElo: number }>({ currentElo: 0, updatedElo: 0 });
  const [playerBadges, setPlayerBadges] = useState<string[]>([]);
  const [chatState, setChatState] = useState<{
    messages: ChatMessage[];
    inputMessage: string;
  }>({
    messages: [],
    inputMessage: '',
  }
  );

  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );

  const gameIsOver = useMemo(() => {
    return gameState?.status == 'finished';
  }, [gameState])


  const connectWaveStreamPlayer = async () => {
    if (wavStreamPlayerRef.current) {
      await wavStreamPlayerRef.current.connect();
    }
    setAutoplayDialogOpen(false);
  }

  const closeAutoplayDialog = () => {
    setAutoplayDialogOpen(false);
  }

  const handleUserAudioTranscriptEvent = useCallback((params: any) => {
    console.log('Received audio transcript:', params);
    const { speaker, audioTranscript, currentRoundTime, responseId } = params;
    setInterrogationTranscript(prev => [...prev, { audioTranscript, timestamp: currentRoundTime, speaker, responseId }]);
    setAudioTranscribing(false);
  }, [roundTimer]);

  const handleRealtimeAudioTranscriptEvent = (params: any) => {
    const { speaker, transcript, currentRoundTime, responseId } = params;
    console.log('Received audio transcript:', params);
    setInterrogationTranscript(prev => {
        const lastItem = prev[prev.length - 1];
        if (!lastItem) {
            // If there's no last item, create a new one
            return [{ audioTranscript: transcript, timestamp: currentRoundTime, speaker, responseId }];
        }

        if (!prev.find((item) => item.responseId === responseId)) {
            // If the responseId is different, add as new item
            return [...prev, { audioTranscript: transcript, timestamp: currentRoundTime, speaker, responseId }];
        }

        // Append to existing item
        return prev.map((item) => {
            if (item.responseId === responseId) {
                return { ...item, audioTranscript: item.audioTranscript + ' ' + transcript };
            }
            return item;
        });
    });
};


  const handleRealtimeAudioDeltaEvent = async (params: { speaker: string, audio: Int16Array }) => {
    console.log('Received audio delta:', params);
    const { audio } = params;
    // check if params is a int16array
    // if so, add it to the wavStreamPlayer
    const wavStreamPlayer = wavStreamPlayerRef.current;
    if (wavStreamPlayer) {
      wavStreamPlayer.add16BitPCM(new Int16Array(audio));
    }
  }

  const handleLeaderboardStatsUpdate = (params: any) => {
    console.log('Leaderboard stats update:', params);
    const { elo, badges } = params;
    setPlayerElo(prev => ({ ...prev, updatedElo: elo }));
    setPlayerBadges(badges);
  }


  const addChatMessage = (messageData: ChatMessage) => {
    console.log('Received chat message:', messageData);
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, messageData]
    }));
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  const handleSendMessage = () => {
    console.log('Sending message:', chatState.inputMessage);
    if(!chatState.inputMessage) {
      return;
    }
    sendChatMessage(chatState.inputMessage);
    setChatState(prev => ({messages:[ ...prev.messages , {message: prev.inputMessage, userEmail: user?.username || 'YOU'}] , inputMessage: ''}));


  };



  useEffect(() => {
    if (socket) {
      socket.on('game-state-update', (newState: MultiGameState) => {
        console.log('Received game state update:', newState);
        setGameState(newState);
        setInterrogationTranscript([]);
        setResultsLoading(false);
      });

      socket.on('game-state-updating', () => {
        setResultsLoading(true);
      });

      socket.on('chat:message', addChatMessage);

      socket.on('realtime-audio-delta', handleRealtimeAudioDeltaEvent);

      socket.on('realtime-audio-transcript-delta', handleRealtimeAudioTranscriptEvent);

      socket.on('round-timer-tick', (params: any) => {
        setRoundTimer(params.countdown);
      });

      socket.on('user-audio-transcript', handleUserAudioTranscriptEvent);

      socket.on('leaderboard-stats-update', handleLeaderboardStatsUpdate);


      joinRoom(roomId);

    }

    return () => {
      if (socket) {
        console.log('Removing listeners');
        socket.off('game-state-update');
        socket.off('game-state-updating');
        socket.off('round-timer-tick');
        socket.off('user-audio-transcript');
        socket.off('realtime-audio-transcript-delta');
        socket.off('realtime-audio-delta');
      socket.off('leaderboard-stats-update');
      socket.off('chat:message');

        // Remove other listeners
      }
    };
  }, [socket]);




  useEffect(() => {
    if (roomId) {
      roomsService.getRoom(roomId).then((room) => {

        if (room.game_state && typeof room.game_state === 'object') {
          console.log(room);
          setGameState(room.game_state as MultiGameState);

        } else {
          navigate(`/lobby/${roomId}`);
        }
      });
    }
  }, [roomId, user]);


  useEffect(() => {
    //

    const setCurrentPlayerState = () => {
      if (gameState && user) {
        const player = gameState.players.find(player => player.id === user.id);
        if (player) {
          setCurrentPlayer(player);
        }

      }
    }
    const getActiveRoundFromMultiGameState = () => {
      if (gameState) {
        const activeRound = gameState.rounds.find(round => round.status === 'active');
        if (activeRound) {
          setActiveRound(activeRound.type);
        }
      }
    }

    // TODO: clean up this function in the return statement
    const getUserElo = async () => {
      if (!user) {
        return;
      }
      leaderboardService.getUserStats(user?.id || '').then((response) => {
        setPlayerElo(prev => ({ ...prev, currentElo: response?.stats?.elo || 0 }));
      });
    }


    setCurrentPlayerState();
    getUserElo();
    getActiveRoundFromMultiGameState();



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
   * 
   * give players who arent in the room the ability to speak to their "lawyer". they get 3 chat completions from laywer 
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
      return <GameOver elo={playerElo.currentElo} newElo={playerElo.updatedElo} badges={playerBadges} gameState={gameState} />;
    }

    if (resultsLoading) {
      return <ChangingRounds gameState={gameState} />;
    }

    if ((user && activeRound === 'voting')) {
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

    if ((activeRound === 'interrogation')) {
      const isCurrentPlayer =
        gameState.rounds?.find((round) => round.status === 'active')?.player === currentPlayer?.id;

      if (isCurrentPlayer) {
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
          (user && activeRound === 'voting')
        ) {
          return 'voting';
        } else if (
          (activeRound === 'interrogation')
        ) {
          return 'interrogation';
        } else {
          return 'results';
        }
      } else {
        return 'loading';
      }

    } else {
      return 'gameOver'
    }
  }




  if (!gameState) {
    return <></>
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <Box>
      <AllowAutoplayDialog open={autoplayDialogOpen} onClose={closeAutoplayDialog} onAllow={connectWaveStreamPlayer} />
      {/* <Button onClick={() => handleLeaderboardStatsUpdate({ elo: 220, badges: ['Strategist', 'Crash Out'] })}>Update ELO </Button> */}
      <Box className="h-screen flex">
        {/* Main game area */}
        <Flex px={'5'} py={'5'} gap={'4'} className='w-full'>
          {/* Left panel: Crime and Evidence */}
          <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '400px' }}>
            {/* Round Timer */}

            <Box className="timerBox mb-4 p-4 rounded border">
              {roundTimer > 0 ? (
                <>
                  <Text as='p' size={'5'}>Round Timer</Text>
                  <Text as='p' size={'8'}>{Math.floor(roundTimer / 60)}:{roundTimer % 60 < 10 && '0'}{roundTimer % 60}</Text>
                </>
              ) : (
                <Text as='p' size={'5'}>Game Over</Text>
              )}
            </Box>

            {/* Accordion for Identity, Evidence, and Guilt Scores */}
            <ScrollArea style={{ height: '800px', marginTop: '8px' }}>
            <Box mt={'4'} >
            <Heading size="4" mb="2">
              Chat
            </Heading>
            <Separator size={'4'} />
            <ScrollArea style={{ height: '200px', marginTop: '8px' }}>
              <Box ref={chatMessagesRef} pr="2">
                <ScrollArea>
                  <Flex direction="column">
                {chatState.messages.map((message, index) => (
                  <Text key={index} mt="2">
                    <strong>{message.userEmail}:</strong> {message.message}
                  </Text>
                ))}
                </Flex>
                </ScrollArea>
              </Box>
            </ScrollArea>
            <Flex mt="2" gap="2">
              <TextField.Root
                placeholder="Type a message..."
                value={chatState.inputMessage}
                onChange={(e) =>
                  setChatState((prev) => ({
                    ...prev,
                    inputMessage: e.target.value,
                  }))
                }
                onKeyDown={handleKeyDown}
                style={{ flex: 1 }}
              />
              <Button onClick={handleSendMessage}>Send</Button>
            </Flex>
          </Box>

              <Accordion.Root
                type="multiple"
                className="w-full rounded-md shadow-md px-2 mt-9"
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
                          <p className="mb-4"><strong>Description:</strong> {gameState.crime.offenseReport[0].description || 'No description available'}</p>
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

            </ScrollArea>
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
                <div ref={nodeRef} className='h-full'>
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


export default MultiplayerGame;