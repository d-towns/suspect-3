import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import { useSocketContext } from '../context/SocketContext/socket.context';
import { ConversationItem, SingleGameState, VotingRoundVote, Suspect, Lead } from '../models/game-state.model';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import { FiChevronUp, FiChevronDown, FiChevronsDown, FiChevronsUp } from 'react-icons/fi';
import { FaChevronDown } from 'react-icons/fa';
import AudioRecorder from '../components/audio-recorder';
import ResponseLoading from '../components/responseLoading';
import * as Accordion from '@radix-ui/react-accordion';
import { Card, Flex, AlertDialog, Box, Text, Grid, Button, Container, Tooltip, Avatar, Separator, RadioCards, Heading, ScrollArea, Badge, TextField, Callout, Strong } from '@radix-ui/themes';
import './game.css';
import { Socket } from 'socket.io-client';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { WavStreamPlayer } from 'wavtools';
import { IoAlertCircle } from "react-icons/io5";
import { decryptGameState } from '../utils/decrypt';


/**
 * TODO:
 * seperate the multiplayer and single player game state schemas
 * change necessary refernces to players to suspects
 * add leads UI that will allow the players to tie conversation items or evidence to suspects and update the game state with the new leads
 *  change players sidebar ui to suspects
 * remove chat interface 
 * skip voting if there are less than 3 leads created
 * 
 */

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
  suspect: Suspect;
}

const SuspectCard: React.FC<PlayerCardProps> = ({ suspect }) => {
  return (
    <Card variant="ghost" className="list-disc list-inside p-4">
      <Box key={suspect.id} >
        <Flex gap="2" align="center" direction="column" mb="5">
          <Avatar fallback={suspect.name.charAt(0)} />

          <Text as="p" weight="bold" size="4">
            {suspect.name}
          </Text>
        </Flex>
        <Text as="p" size={'3'} align="center">
          {suspect.identity}
        </Text>
      </Box>
    </Card>
  );
};

// VotingRound Component
interface VotingRoundProps {
  gameState: SingleGameState;
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
{gameState.leads.map((lead, index) => ( 
        <Box my={'5'}>
        <Heading size='4' mb={'5'}>Your Leads</Heading>
        <Card>
            
            <Flex key={index} className='gap-3 p-4  rounded-lg transition-all duration-100 hover:cursor-pointer'>
                <Text as='p' size='2' weight='bold'> {gameState.suspects.find((suspect) => suspect.id === lead.suspect)?.name} </Text>
                <Text as='p' size='3' weight='bold'> {lead.evidence} </Text>
                    </Flex>
            </Card>
            </Box>
            ))}
            {gameState.leads.length < 3 ? (
        <Callout.Root className='my-4' color='red'>
        <Callout.Icon>
            <IoAlertCircle />
        </Callout.Icon>
            <Callout.Text>
            <Text size='4'>Commisioner Gordon: "Your gonna need at least a few leads before we can make a case against our culprit, Detective!"</Text>
            </Callout.Text>
    </Callout.Root>
            ) : (
        <RadioCards.Root
          className="w-full"
          value={killerVote}
          onValueChange={(vote) => setKillerVote(vote)}
          disabled={voteSubmitted}
        >
          {gameState.suspects.map((player) => (
            <RadioCards.Item value={player.id} key={player.id}>
              <SuspectCard suspect={player} />
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
            )}
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
  gameState: SingleGameState;
  currentSuspect: Suspect | null;
  interrogationTranscript: ConversationItem[];
  responseLoading: boolean;
  audioTranscribing: boolean;
  socket: Socket; // Adjust this type based on your socket implementation
  emitEvent: (event: string, data: any) => void;
  handleAudioRecorded: (arrayBuffer: ArrayBuffer) => void;
  handleCreateNewLead: (conversationItem: ConversationItem) => void;
}

const Interrogation: React.FC<InterrogationProps> = ({
    gameState,
  interrogationTranscript,
  responseLoading,
  audioTranscribing,
  socket,
  currentSuspect,
  emitEvent,
  handleAudioRecorded,
  handleCreateNewLead,
}) => {
  return (
    <>
    <div className='grid grid-cols-2 grid-rows-[auto_1fr] gap-4'>
      <h2 className="text-2xl font-bold w-full text-center h-fit">Interrogation</h2>
      <h2 className="text-2xl font-bold w-full text-center  h-fit">Leads</h2>
      <Box
        as="div"
        className="interrogationChat w-full overflow-y-auto p-4 rounded-lg h-[600px]"
      >
        <Grid mb="2" columns="8" flow="dense" gap="5">
          <Box className="col-span-8">
            <Heading size="5">Transcript</Heading>
          </Box>
          <Separator className="col-span-8" size="4" />
          {interrogationTranscript.map((conversationItem, index) => (
            <Tooltip content={<Text size={'2'}>Create a new lead from this statement </Text>} className='p-1'>
            <Flex key={index} className='col-span-8 gap-5 py-3 hover:border-green-300 hover:border rounded-lg transition-all duration-100 hover:cursor-pointer' onClick={() => handleCreateNewLead(conversationItem)}>
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
            </Flex>
            </Tooltip>
          ))}
        </Grid>
        {responseLoading && (
          <ResponseLoading label={`${currentSuspect?.name}...`} />
        )}
        {audioTranscribing && (
          <ResponseLoading label="Transcribing your response..." />
        )}
      </Box>
      <Box
        as="div"
        className="interrogationChat w-full overflow-y-auto p-4 rounded-lg"
      >
        {gameState.leads.map((lead, index) => ( 
            <Card>
            <Flex key={index} className='gap-3 p-4 hover:border-green-300 hover:border rounded-lg transition-all duration-100 hover:cursor-pointer'>
                <Text as='p' size='2' weight='bold'> {gameState.suspects.find((suspect) => suspect.id === lead.suspect)?.name} </Text>
                <Text as='p' size='3' weight='bold'> {lead.evidence} </Text>
                
            </Flex>
            </Card>
            ))}
        <Callout.Root className='my-4' color='blue'>
            <Callout.Icon>
                <IoAlertCircle />
            </Callout.Icon>
                <Callout.Text>
                <Text as='p' size='4'>Create leads by  <Strong>selecting a piece of evidence </Strong> OR  <Strong>suspect statements from the interrogation</Strong> </Text>
                </Callout.Text>
        </Callout.Root>
        <Callout.Root className='my-4' color='red'>
            <Callout.Icon>
                <IoAlertCircle />
            </Callout.Icon>
                <Callout.Text>
                <Text size='4'>Commisioner Gordon: "Your gonna need at least a few leads before we can make a case against our culprit, Detective!"</Text>
                </Callout.Text>
        </Callout.Root>
      </Box>
      </div>
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
  gameState: SingleGameState;
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
            const player = gameState.suspects.find((p) => p.id === round.player);
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
  gameState: SingleGameState;
  oldRating: number;
  newRating: number | 0
  badges: string[];
}

const GameOver: React.FC<GameOverProps> = ({ gameState, oldRating: elo, newRating: newElo, badges }) => {
  return (
    <Flex direction="column" gap="4" >
      <Flex>
        <Box className="flex flex-col w-full items-center justify-center h-full">
          {gameState.outcome?.winner === 'innocents' ? (
            <>
              <Heading className="mb-4 text-4xl">Innocents Win!</Heading>
              <Flex gap="4"  mt={'9'} direction={{sm: 'column', md: 'row'}} width={'80%'} justify={'between'} >
                <Flex gap="4" >
                {gameState.suspects
                  .filter((suspect) => !suspect.isCulprit)
                  .map((suspect) => (
                    <Card
                      key={suspect.id}
                      size="2"
                      variant="surface"
                      className="p-4 flex flex-col items-center lg:animate-bounce  "
                    >
                      <Avatar
                        fallback={suspect.name.charAt(0)}
                        size="6"
                      />
                      <Text className="mt-2 text-xl">
                        {suspect.identity.split(',')[0]}

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
                    {gameState.suspects
                      .filter((suspect) => suspect.isCulprit)
                      .map((suspect) => (
                        <Card
                          key={suspect.id}
                          size="2"
                          variant="surface"
                          className="p-4 flex flex-col items-center  lg:animate-bounce"
                        >
                          <Avatar
                            fallback={suspect.name.charAt(0)}
                            size="6"
                          />
                          <Text className="mt-2 text-xl">
                            {suspect.identity.split(',')[0]}
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
      </ScrollArea>
    </Flex>
  );
};

const testInterrogationTranscript: ConversationItem[] = [
    {
        audioTranscript: "Where were you on the night of the crime?",
        timestamp: 5,
        speaker: 'user'
    },
    {
        audioTranscript: "I was at the Blue Moon Cafe until closing time. You can check with the staff there.",
        timestamp: 12,
        speaker: 'assistant'
    },
    {
        audioTranscript: "Can anyone else verify your presence at the cafe?",
        timestamp: 18,
        speaker: 'user'
    },
    {
        audioTranscript: "Yes, I was meeting with my business partner Sarah. We were discussing the quarterly reports.",
        timestamp: 25,
        speaker: 'assistant'
    },
    {
        audioTranscript: "What time did you leave the cafe?",
        timestamp: 32,
        speaker: 'user'
    },
    {
        audioTranscript: "Around 11:30 PM. I remember because I checked my watch when paying the bill.",
        timestamp: 40,
        speaker: 'assistant'
    }
];


const SingleGame = () => {
  const { socket, emitEvent, joinRoom } = useSocketContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const [gameState, setGameState] = useState<SingleGameState | null>(null);
  const [interrogationTranscript, setInterrogationTranscript] = useState<ConversationItem[]>(testInterrogationTranscript);
  const nodeRef = useRef(null);
  const [roundTimer, setRoundTimer] = useState<number>(0);
  const [resultsLoading, setResultsLoading] = useState<boolean>(false);
  const [audioTranscribing, setAudioTranscribing] = useState<boolean>(false);
  const [responseLoading, setResponseLoading] = useState<boolean>(false);
  const [killerVote, setKillerVote] = useState<string>();
  const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false)
  const [autoplayDialogOpen, setAutoplayDialogOpen] = useState<boolean>(true);
  const [playerElo, setPlayerElo] = useState<{ oldRating: number, newRating: number }>({ oldRating: 0, newRating: 0 });
  const [playerBadges, setPlayerBadges] = useState<string[]>([]);

  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );

  const gameIsOver = useMemo(() => {
    return gameState?.status == 'finished';
  }, [gameState])

  const activeRound = useMemo(() => {
    // return gameState?.rounds.find((round) => round.status === 'active')?.type;
    return 'voting'
  }, [gameState]);

  const currentSuspect : Suspect | null = useMemo(() => {
    if(!gameState) return null;
    return gameState?.suspects.find((suspect) => suspect.id === gameState?.rounds.find((round) => round.status === 'active')?.player) || null;
  }, [gameState]);  

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
    const { speaker, audioTranscript, currentRoundTime } = params;
    setInterrogationTranscript(prev => [...prev, { audioTranscript, timestamp: currentRoundTime, speaker }]);
    setAudioTranscribing(false);
  }, [roundTimer]);

  const handleRealtimeAudioTranscriptEvent = (params: any) => {
    const { speaker, transcript, currentRoundTime } = params;
    setInterrogationTranscript(prev => {
      const lastItem = prev[prev.length - 1];
      if (!lastItem) {
        // If there's no last item, create a new one and add the delta as the first text of the transcript
        return [{ audioTranscript: transcript, timestamp: currentRoundTime, speaker }];
      } else if (lastItem.speaker !== speaker) {
        // If the speaker has changed, create a new item
        return [...prev, { audioTranscript: transcript, timestamp: currentRoundTime, speaker }];
      }
      const updatedItem = {
        ...lastItem,
        audioTranscript: lastItem.audioTranscript + transcript,
        speaker
      };
      return [...prev.slice(0, prev.length - 1), updatedItem];
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
    const { oldRating, newRating, badges } = params;
    setPlayerElo({ oldRating, newRating });
    setPlayerBadges(badges);
  }

  const handleCreateNewLead = (conversationItem: ConversationItem) => {
    if (!currentSuspect || !gameState || !roomId ) {
      return;
    }

    const newLead: Lead = {
        evidence: conversationItem.audioTranscript,
        suspect: currentSuspect?.id || '',
    }

    roomsService.createNewLead(roomId, newLead).then( async (newGameState) => {
        setGameState(await decryptGameState(newGameState));
    });

  }



  useEffect(() => {
    if (socket) {
      socket.on('game-state-update', (newState: SingleGameState) => {
        console.log('Received game state update:', newState);
        setGameState(newState);
        setInterrogationTranscript([]);
        setResultsLoading(false);
      });

      socket.on('game-state-updating', () => {
        setResultsLoading(true);
      });

      socket.on('realtime-audio-delta', handleRealtimeAudioDeltaEvent);

      socket.on('realtime-audio-transcript-delta', handleRealtimeAudioTranscriptEvent);

      socket.on('realtime-message', handleRealtimeAudioTranscriptEvent);

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
      socket.off('chat-message');

        // Remove other listeners
      }
    };
  }, [socket]);


  useEffect(() => {
    if (roomId) {
      roomsService.getRoom(roomId).then((room) => {

        if (room.game_state && typeof room.game_state === 'object') {
          console.log(room);
          setGameState(room.game_state as SingleGameState);

        } else {
          navigate(`/lobby/${roomId}`);
        }
      });
    }

  }, [roomId]);


  const handleAudioRecorded = (arrayBuffer: ArrayBuffer) => {
    console.log('Audio recorded:', arrayBuffer);
    setAudioTranscribing(true);
    setResponseLoading(true);
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

  const renderGameContent = (): JSX.Element | null => {
    if (!gameState || !socket) {
      return <></>;
    }

    if (gameIsOver) {
      return <GameOver oldRating={playerElo.oldRating} newRating={playerElo.newRating} badges={playerBadges} gameState={gameState} />;
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

        return (
          <Interrogation
            gameState={gameState}
            currentSuspect={currentSuspect}
            interrogationTranscript={interrogationTranscript}
            responseLoading={responseLoading}
            audioTranscribing={audioTranscribing}
            socket={socket}
            emitEvent={emitEvent}
            handleAudioRecorded={handleAudioRecorded}
            handleCreateNewLead={handleCreateNewLead}
          />
        );
      }
    if(gameState) return <ChangingRounds gameState={gameState} />;
    return <></>;
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


  return (
    <Box>
      <AllowAutoplayDialog open={autoplayDialogOpen} onClose={closeAutoplayDialog} onAllow={connectWaveStreamPlayer} />
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
                        {gameState?.allEvidence?.map((item, index) => (
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

                      {gameState.suspects.map(suspect => (
                        <SuspectCard suspect={suspect} key={suspect.id} />
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


export default SingleGame;