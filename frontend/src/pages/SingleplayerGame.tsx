import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocketContext } from '../context/SocketContext/socket.context';
import { ConversationItem, SingleGameState, Suspect, Lead, Deduction, OffenseReportItem } from '../models/game-state.model';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import { FiChevronUp, FiChevronDown, FiChevronsDown, FiChevronsUp, FiSidebar } from 'react-icons/fi';
import AudioRecorder from '../components/audioRecorder';
import ResponseLoading from '../components/responseLoading';
import { Card, Flex, SegmentedControl, AlertDialog, Box, Text, Grid, Button, Tooltip, Avatar, Separator, RadioCards, Heading, ScrollArea, Badge, Strong, CardProps, Tabs, Spinner, Inset, IconButton } from '@radix-ui/themes';
import './game.css';
import { Socket } from 'socket.io-client';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { WavStreamPlayer } from 'wavtools';
import { decryptGameState } from '../utils/decrypt';
import AnimatedChatBubble from '../components/chatBubble';
import AnimatedText from '../components/animatedText';

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

interface OffenseReportProps {
    offenseReport: OffenseReportItem[] | null;
    handleStartGame: () => void;
    // suspects: Suspect[];
}

const OffenseReport: React.FC<OffenseReportProps> = ({ offenseReport, handleStartGame }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const nodeRef = React.useRef<HTMLDivElement>(null);

    if (!offenseReport) return null;

    const handleNext = () => {
        if (currentIndex < offenseReport.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleStartGame();
        }
    };

    const currentItem = offenseReport[currentIndex];

    return (
        <Flex direction="column" align="center" justify="center" gap="4" className='offenseReport '>
            <div onClick={handleNext} style={{ cursor: 'pointer' }}>
                <SwitchTransition mode="out-in">
                    <CSSTransition
                        key={currentIndex}
                        nodeRef={nodeRef}
                        classNames="fade"
                        timeout={500}
                        unmountOnExit
                    >
                        <div ref={nodeRef}>
                            <Card className="p-8" style={{ width: '700px' }}>
                                <Inset clip="padding-box" side="top" pb="current">
                                    <img
                                        src={currentItem.imgSrc}
                                        className="block object-cover w-full h-64 sm:h-80 md:h-96 bg-gray-200"
                                    />
                                </Inset>

                                <div>
                                    <Text size="6" as="span" align="center" mt="2" mr={'4'}>
                                        Time:
                                    </Text>
                                    <AnimatedText message={currentItem.time} animationSpeed={300} />
                                </div>
                                <div>
                                    <Text size="6" as="span" align="center" mt="2" mr={'4'}>
                                        Location:
                                    </Text>
                                    <AnimatedText message={currentItem.location} animationSpeed={150} />
                                </div>
                                <div className='min-w-[600px] min-h-[100px]'>
                                    <AnimatedText message={currentItem.description} animationSpeed={50} />
                                </div>
                                <div className='w-full text-center mt-9' >
                                    <Text as='span' size='3' >Click to continue</Text>
                                </div>
                            </Card>
                        </div>
                    </CSSTransition>
                </SwitchTransition>
            </div>
        </Flex>
    );
};



interface LeadCardProps {
    lead: Lead | null;
    suspects: Suspect[];
    index: number;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, suspects, index }) => {
    return (
        <Card style={{ height: '150px' }} className='w-full'>
            <Flex
                direction="column"
                className="gap-2 p-2 items-left justify-center rounded-lg transition-all duration-100 hover:cursor-pointer"
            >
                {lead ? (
                    <>
                        <Text as="p" size="2" className="text-left">
                            {suspects.find((suspect) => suspect.id === lead.suspect)?.name}
                        </Text>
                        <ScrollArea className="h-20 p-1" type='auto'>
                            <Text
                                as="p"
                                size="2"
                                weight="bold"
                                style={{
                                    textAlign: 'center',
                                }}
                            >
                                {lead.evidence}
                            </Text>
                        </ScrollArea>
                    </>
                ) : (
                    <Text as="p" size="3" weight="bold" color="gray">
                        Lead #{index + 1}
                    </Text>
                )}
            </Flex>
        </Card>
    );
};



interface ChiefCardProps {
    gameState: SingleGameState;
    defaultMessage: string;
    deduction: Deduction;
}

const ChiefCard: React.FC<ChiefCardProps> = ({ gameState, defaultMessage, deduction }) => {
    return (
        <Card variant='ghost' className='w-full min-w-[100px] text-center ' >
            <Flex gap="4" direction="row" align={'center'}>
                <Box>

                    <Avatar
                        src="https://i.ibb.co/GJWMFtf/chief-1.webp"
                        fallback="C"
                        size="6"
                    />
                    <Text size="2" as="p" align="center" mt={'3'}>
                        Commisioner Gordon
                    </Text>
                </Box>
                <Flex direction={'column'} gap={'2'}>
                    <AnimatedChatBubble message={gameState.deductions.find((deduction) => deduction.submitted)?.analysis.analysis || defaultMessage} maxWidth='max-w-full' tailPosition='topRight' animationSpeed={50} />
                    <AnimatedChatBubble message={deduction?.analysis.analysis || defaultMessage} maxWidth='max-w-full' tailPosition='topRight' animationSpeed={50} />
                </Flex>
                {/* {deduction?.submitted && (
                    <Callout.Root
                        className="my-4"
                        color={deduction.analysis.accepted ? 'green' : 'red'}
                    >
                        <Callout.Icon>
                            <IoAlertCircle />
                        </Callout.Icon>
                        <Callout.Text>
                            <Text size="4">
                                {deduction.analysis.accepted
                                    ? 'Deduction accepted'
                                    : 'Deduction denied'}
                            </Text>
                        </Callout.Text>
                    </Callout.Root>
                )} */}
            </Flex>
        </Card>
    );
}

interface RoundTimerProps {
    roundTimer: number
    activeRoundType: string
}

const RoundTimer: React.FC<RoundTimerProps> = ({ roundTimer, activeRoundType }: RoundTimerProps) => {
    return (

        <Card className="flex gap-4 justify-center items-center timerBox my-4 px-4 py-2 rounded text-center max-w-[400px] m-auto">
                <Text as='p' mt={'3'} size={'8'}>{Math.floor(roundTimer / 60)}:{roundTimer % 60 < 10 && '0'}{roundTimer % 60}</Text>
            <Separator orientation={'vertical'} size="2" />
            
            <SegmentedControl.Root defaultValue={activeRoundType} radius="full" className='my-3 w-full'>
                <SegmentedControl.Item value="interrogation">Interrogation</SegmentedControl.Item>
                <SegmentedControl.Item value="voting">Deduction</SegmentedControl.Item>
            </SegmentedControl.Root>
        </Card>

    )
}



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
    suspect: Suspect | undefined;
    variant: CardProps['variant'];
    onClick?: () => void;
}
const SuspectCard: React.FC<PlayerCardProps & { size?: 'small' | 'large' }> = ({
    suspect,
    variant,
    size = 'small',
    onClick,
}) => {
    if (!suspect) return null;

    if (size === 'small') {
        return (
            <Card variant={variant} onClick={onClick} className='cursor-pointer'>
                <Box key={suspect.id}>
                    <Flex gap="4" align="center">
                        <Avatar fallback={suspect.name.charAt(0)} src={suspect.imgSrc} />
                        <Box>
                            <Text as="p" weight="bold" size="4">
                                {suspect.name}
                            </Text>
                            <Text as="p" size="3">
                                {suspect.identity}
                            </Text>
                        </Box>
                    </Flex>
                </Box>
            </Card>
        );
    }

    return (
        <Card
            variant={variant}
            className="flex flex-col items-center cursor-pointer p-4 transition-transform hover:scale-105 hover:shadow-[0_0_10px_5px_rgba(255,255,255,0.25)]"
            onClick={() => {
                if (onClick) onClick()
            }}
        >
            <Avatar fallback={suspect?.name.charAt(0)} src={"https://i.ibb.co/GJWMFtf/chief-1.webp"} size="6" radius='full' className='min-w-[300px] min-h-[300px]'/>
            <Text as="p" weight="bold" size="8" mt="3">
                {suspect.name}
            </Text>
            <Text as="p" size="3" mt="1">
                {suspect.identity}
            </Text>
        </Card>
    );
};

// const testConversationExchanges: ConversationExhange[] = [
//     {
//         speaker: "Detective",
//         message: "Where were you on the night of March 15th?"
//     },
//     {
//         speaker: "John Smith",
//         message: "I was working late at the office until about 10 PM. You can check the building's security logs."
//     },
//     {
//         speaker: "Detective",
//         message: "Can anyone confirm your presence there?"
//     },
//     {
//         speaker: "John Smith",
//         message: "Yes, my colleague Mary was also working late. And I ordered takeout which was delivered around 9 PM."
//     },
//     {
//         speaker: "Detective",
//         message: "Tell me about your relationship with the victim."
//     },
//     {
//         speaker: "John Smith",
//         message: "We were business partners, but lately there had been some tension over the company's direction. Nothing violent though, I assure you."
//     },
//     {
//         speaker: "Detective",
//         message: "Were you aware of the missing documents from the company safe?"
//     },
//     {
//         speaker: "John Smith",
//         message: "Missing documents? This is the first I'm hearing about this. What documents are you referring to?"
//     }
// ];

// VotingRound Component
interface VotingRoundProps {
    gameState: SingleGameState;
    killerVote: string | undefined;
    roundTimer: number
    deductionSubmitted: boolean;
    handleStartNextRound: () => void;
    handleCreateNewLead: (evidence: string) => void;
    setKillerVote: React.Dispatch<React.SetStateAction<string | undefined>>;
    handleSubmitDeduction: () => void;
    handleShowGameOver: () => void;
    handleVoteSubmission: () => void;
    voteSubmitted: boolean;
}

const VotingRound: React.FC<VotingRoundProps> = ({
    gameState,
    killerVote,
    deductionSubmitted,
    handleCreateNewLead,
    setKillerVote,
    handleSubmitDeduction,
    handleShowGameOver,
    handleVoteSubmission,
    handleStartNextRound,
    voteSubmitted,
}) => {
    let cheifMessage

    const mostRecentConvesation = gameState.rounds.filter((round) => round.type === 'interrogation').slice().reverse().find((round) => round.status === 'completed')?.conversation || [];
    const currentDeduction = gameState.deductions.find((deduction) => (deduction.active == true)) || null;
    if (!currentDeduction) { return (<Text> No deductions available </Text>) }
    if (currentDeduction && currentDeduction.leads.length < 3) {
        cheifMessage = "Your gonna need at least a few leads before we can make a case against our culprit, Detective!"
    }
    else if (currentDeduction && currentDeduction.culpritVote === '') {
        cheifMessage = "I see you've been hard at work, Detective. Who do you think is the culprit?"
    } else if (currentDeduction && currentDeduction.culpritVote !== '' && !deductionSubmitted) {
        cheifMessage = "You've made your choice, Detective. I'll take a look at this and get back to you shortly."
    } else {
        cheifMessage = "*Chief Gordon is reviewing your deduction*"
    }
    return (
        <>
            <Flex gap={'4'} direction={'column'}>
                {/* First item: ChiefCard */}
                <Flex direction={'column'} justify={'center'} align={'center'}>

                    <ChiefCard gameState={gameState} defaultMessage={cheifMessage} deduction={currentDeduction} />
                    <Flex direction={'row'} justify={'between'} className='w-full'>
                        <Button
                            onClick={handleSubmitDeduction}
                            style={{ margin: '20px auto' }}
                            mt="4"
                            size="4"
                            disabled={currentDeduction.leads.length < 3 || currentDeduction.culpritVote === ''}
                        >
                            {deductionSubmitted ? <Spinner /> : 'Submit Deduction'}
                        </Button>
                        <Button
                            onClick={gameState.status == 'finished' ? () => handleShowGameOver() : handleStartNextRound}
                            style={{ margin: '20px auto', padding: '10px 20px' }}
                            mt="4"
                            size="4"
                            disabled={gameState.rounds[gameState.rounds.length - 1].status === 'active'}
                        >
                            {gameState.status == 'finished' && !deductionSubmitted ? 'Go to court' : 'Start Next Round'}
                        </Button>
                    </Flex>
                </Flex>
                {/* Second item: List of Leads */}

                <Flex direction='row' gap={'4'}>
                    <Flex direction='column' justify='center' align='center' gap='4' className='max-w-xs'>
                        <Card variant='surface' className=' flex flex-col'>
                            <Text align={'center'} mb={'2'}> Culprit </Text>
                            {currentDeduction.culpritVote ?
                                <SuspectCard suspect={gameState.suspects.find((suspect) => suspect.id === currentDeduction.culpritVote)} variant='ghost' />
                                : <Text> No vote submitted </Text>
                            }
                        </Card>
                        <Flex direction="column" gap="2" className='w-full'>

                            {Array.from({ length: 3 }).map((_, index) => (
                                <React.Fragment key={index}>
                                    <LeadCard
                                        lead={currentDeduction.leads[index]}
                                        suspects={gameState.suspects}
                                        index={index}
                                    />
                                    {index < 2 && <Separator orientation="horizontal" size="4" />}
                                </React.Fragment>
                            ))}
                        </Flex>
                    </Flex>


                    {/* Third item: Tabs component */}
                    <Tabs.Root defaultValue='conversation' className='w-full h-full'>
                        <Tabs.List className='w-full text-center justify-center mb-2 text-xl'>
                            <Tabs.Trigger value='conversation'>Transcript</Tabs.Trigger>
                            <Tabs.Trigger value='evidence'>Evidence</Tabs.Trigger>
                            {currentDeduction.leads.length === 3 && (
                                <Tabs.Trigger value='vote'>Culprit</Tabs.Trigger>
                            )}
                        </Tabs.List>
                        <Tabs.Content value='conversation' className='h-full'>
                            <Box className='interrogationChat w-full overflow-y-auto p-4 rounded-lg h-full'>
                                {mostRecentConvesation.responses.map((conversationItem, index) => (
                                    <Tooltip key={index} content={<Text size={'2'}>Create a new lead from this statement</Text>} className='p-1'>
                                        <Flex className='col-span-8 gap-5 py-3 hover:border-green-300 hover:border rounded-lg transition-all duration-100 hover:cursor-pointer' onClick={() => handleCreateNewLead(conversationItem.message)}>
                                            <Box ml="2" mb="2">
                                                <Text as="p" weight="bold" size="3">
                                                    {conversationItem.speaker === 'detective' ? 'You' : conversationItem.speaker}
                                                </Text>
                                            </Box>
                                            <Box className="col-span-7">
                                                <Text align="left" as="span">
                                                    {conversationItem.message}
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </Tooltip>
                                ))}
                            </Box>
                        </Tabs.Content>
                        <Tabs.Content value='evidence'>
                            <Grid columns="2" gap="4">
                                {gameState?.allEvidence?.map((item, index) => (
                                    <Tooltip key={index} content={<Text size={'2'}>Create a new lead from this evidence</Text>} className='p-1'>
                                        <Card variant="surface" className="p-4 hover:border-green-300 hover:border rounded-lg transition-all duration-100 hover:cursor-pointer" onClick={() => handleCreateNewLead(item.description)}>
                                            <Flex gap="2" align="center">
                                                <Box>
                                                    <Text>{item.description}</Text>
                                                </Box>
                                            </Flex>
                                        </Card>
                                    </Tooltip>
                                )) || (
                                        <Card variant="surface" className="p-4">
                                            <Text>No evidence available</Text>
                                        </Card>
                                    )}
                            </Grid>
                        </Tabs.Content>
                        <Tabs.Content value='vote'>
                            <>
                                <Heading size='4' my={'5'} >Based on your deduction, the culprit is...</Heading>
                                <RadioCards.Root
                                    className="w-full"
                                    value={killerVote}
                                    onValueChange={(vote) => setKillerVote(vote)}
                                    disabled={voteSubmitted}
                                >
                                    {gameState.suspects.map((player) => (
                                        <RadioCards.Item value={player.id} key={player.id}>
                                            <SuspectCard suspect={player} variant='ghost' />
                                        </RadioCards.Item>
                                    ))}
                                </RadioCards.Root>
                                <Flex>
                                    <Button
                                        onClick={handleVoteSubmission}
                                        color={`${killerVote ? 'green' : 'gray'}`}
                                        style={{ width: '40%', margin: '20px auto' }}
                                        mt="4"
                                        size={'4'}
                                        disabled={!killerVote || voteSubmitted}
                                    >
                                        {voteSubmitted ? 'Vote Submitted!' : 'Add to deduction'}
                                    </Button>
                                </Flex>
                            </>
                        </Tabs.Content>
                    </Tabs.Root>
                </Flex>
                {/* Fourth item: if there is anther round left in the game, and the player has less than 3 leads, show the next interrogation button, else show the submit deduction button */}
            </Flex>

            {/* Additional content if leads.length > 3 */}

        </>
    );
};


interface ChooseInterrogationProps {
    gameState: SingleGameState;
    handleStartInterrogation: (suspectId:string) => void;
}

const ChooseInterrogation: React.FC<ChooseInterrogationProps> = ({ gameState, handleStartInterrogation }) => {
    return (
        <Flex direction="column" align="center" justify="center" gap="4">
            <Heading size="7">Choose a Suspect to Interrogate</Heading>
            <Grid columns="3" gap="4">
                {gameState.suspects.map((suspect) => (
                    <SuspectCard key={suspect.id} suspect={suspect} variant="surface" size='large' onClick={() => handleStartInterrogation(suspect.id)}/>
                ))}
            </Grid>
        </Flex>
    );
}

// Interrogation Component
interface InterrogationProps {
    gameState: SingleGameState;
    currentSuspect: Suspect | undefined;
    interrogationTranscript: ConversationItem[];
    wavStreamPlayerRef: React.MutableRefObject<WavStreamPlayer | null>;
    roundTimer: number
    responseLoading: boolean;
    audioTranscribing: boolean;
    socket: Socket; // Adjust this type based on your socket implementation
    emitEvent: (event: string, data: any) => void;
    handleAudioRecorded: (arrayBuffer: ArrayBuffer) => void;
    handleEndInterrogation: () => void
    handleCreateNewLead: (evidence: string) => void;
}

/**
 * I need to be able to know if there is an active conversation, and use an eventually consistent approach to update the conversation
 * if there an active conversation, then I should show the interrogation transcript UI along with the suspect card
 * if there is no active conversation, then I should show the choose a suspect UI
 * @param param0 
 * @returns 
 */

const Interrogation: React.FC<InterrogationProps> = ({
    interrogationTranscript,
    roundTimer,
    responseLoading,
    audioTranscribing,
    socket,
    currentSuspect,
    emitEvent,
    handleAudioRecorded,
    handleEndInterrogation,
    handleCreateNewLead,
}) => {
    return (
        <>
            <div className='grid grid-cols-1 grid-rows-[auto_1fr] gap-4'>
                <h2 className="text-2xl font-bold w-full text-center h-fit">Interrogation</h2>
                <Box
                    as="div"
                    className="interrogationChat w-full overflow-y-auto p-4 rounded-lg h-[550px]"
                >
                    <Flex className='h-full'>
                    <Flex className='min-w-[400px] min-h-full' justify={'center'} align={'center'} direction={'column'}>
                        <Avatar fallback={currentSuspect?.name.charAt(0)} src={"https://i.ibb.co/GJWMFtf/chief-1.webp"} size="6" className='min-w-[300px] min-h-[300px]'/>
                    </Flex>
                        <Box>
                    <Flex className='w-full' justify={'center'} align={'center'} direction={'column'}>
                    {/* <SuspectCard suspect={currentSuspect} variant='surface' size='small' /> */}
                     <AnimatedText animationSpeed={50} size='xs' message='The suspect enters the room for interrogation. Begin the interrogation. ask them about the crime, and their involvement in it.'/>
                     </Flex>
                    <Grid mb="2" columns="8" flow="dense" gap="5">
                       
                        {interrogationTranscript.map((conversationItem, index) => (
                            <Tooltip content={<Text size={'2'}>Create a new lead from this statement </Text>} className='p-1'>
                                <Flex key={index} className='col-span-8 gap-5 py-3 hover:border-green-300 hover:border rounded-lg transition-all duration-100 hover:cursor-pointer' onClick={() => handleCreateNewLead(conversationItem.audioTranscript)}>
                                    <Box ml="2" mb="2">
                                        <Text as="p" weight="bold" size="3">
                                            {Math.floor(conversationItem.timestamp / 60)}:
                                            {conversationItem.timestamp % 60 < 10 ? '0' : ''}
                                            {conversationItem.timestamp % 60}
                                        </Text>
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
                    </Box>
                    </Flex>
                    {responseLoading && (
                        <ResponseLoading label={`${currentSuspect?.name}...`} />
                    )}
                    {audioTranscribing && (
                        <ResponseLoading label="Transcribing your response..." />
                    )}
                </Box>
                <div className="flex gap-4 justify-center">
                {socket && (
                    <AudioRecorder
                        socket={socket}
                        emitEvent={emitEvent}
                        onAudioRecorded={handleAudioRecorded}
                    />
                )}
                <Button
                    size="4"
                    variant='outline'
                    radius='small'
                    mt={'5'}
                    className='py-6'
                    disabled={roundTimer === 0}
                    onClick={() => handleEndInterrogation()}
                >
                    End Interrogation
                </Button>
            </div>
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
                            <Flex gap="4" mt={'9'} direction={{ sm: 'column', md: 'row' }} width={'80%'} justify={'between'} >
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
                            <Flex gap="9" mt={'9'} width={'80%'} justify={'between'} align={'center'} direction={{ sm: 'column', md: 'row' }} >
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

// const testInterrogationTranscript: ConversationItem[] = [
//     {
//         audioTranscript: "Where were you on the night of the crime?",
//         timestamp: 5,
//         speaker: 'user'
//     },
//     {
//         audioTranscript: "I was at the Blue Moon Cafe until closing time. You can check with the staff there.",
//         timestamp: 12,
//         speaker: 'assistant'
//     },
//     {
//         audioTranscript: "Can anyone else verify your presence at the cafe?",
//         timestamp: 18,
//         speaker: 'user'
//     },
//     {
//         audioTranscript: "Yes, I was meeting with my business partner Sarah. We were discussing the quarterly reports.",
//         timestamp: 25,
//         speaker: 'assistant'
//     },
//     {
//         audioTranscript: "What time did you leave the cafe?",
//         timestamp: 32,
//         speaker: 'user'
//     },
//     {
//         audioTranscript: "Around 11:30 PM. I remember because I checked my watch when paying the bill.",
//         timestamp: 40,
//         speaker: 'assistant'
//     }
// ];


const SingleGame = () => {
    const { socket, emitEvent, joinRoom } = useSocketContext();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { roomId } = useParams<{ roomId: string }>();
    const [gameState, setGameState] = useState<SingleGameState | null>(null);
    // const [interrogationTranscript, setInterrogationTranscript] = useState<ConversationItem[]>(testInterrogationTranscript);
    const [interrogationTranscript, setInterrogationTranscript] = useState<ConversationItem[]>([]);
    const nodeRef = useRef(null);
    const [roundTimer, setRoundTimer] = useState<number>(0);
    const [resultsLoading, setResultsLoading] = useState<boolean>(false);
    const [showGameOver, setShowGameOver] = useState<boolean>(false);
    const [audioTranscribing, setAudioTranscribing] = useState<boolean>(false);
    const [responseLoading, setResponseLoading] = useState<boolean>(false);
    const [killerVote, setKillerVote] = useState<string>();
    const [deductionSubmitted, setDeductionSubmitted] = useState<boolean>(false);
    const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false)
    const [showSidebar, setShowSidebar] = useState<boolean>(false);
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
        if(!gameState) return null;
        console.log("updating active round");
        const activeRound = gameState?.rounds?.find((round) => round.status === 'active')
        console.log(gameState);
        return activeRound;
        // return 'voting'
    }, [gameState]);

    const activeConversation = useMemo(() => {
        if(!gameState) return null;
        const activeConversation = gameState?.rounds?.find((round) => round?.type === "interrogation")
        ?.conversations.find((conversation) => conversation.active);
        return activeConversation;
    }, [gameState]);

    const activeSuspect = useMemo(() => {
        const activeSuspectId = gameState?.rounds?.find((round) => round?.type === "interrogation")
        ?.conversations.find((conversation) => conversation.active)?.suspect;
        return gameState?.suspects?.find((suspect) => suspect.id === activeSuspectId);
    }, [gameState]);


    // const currentSuspect: Suspect | null = useMemo(() => {
    //     if(!gameState) return null;
    //     console.log(gameState?.suspects?.find((suspect) => suspect.id === gameState?.rounds?.filter((round) => round.type == 'interrogation').slice().reverse().find((round) => ['active', 'completed'].includes(round.status))?.suspect) || null);
    //     return gameState?.suspects?.find((suspect) => suspect.id === gameState?.rounds?.filter((round) => round.type == 'interrogation').slice().reverse().find((round) => ['active', 'completed'].includes(round.status))?.suspect) || null;
    // }, [gameState]);


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
        console.log('Received audio transcript:', params);
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

    const handleStartNextRound = () => {
        if (!gameState || !socket || !roomId) {
            return;
        }
        emitEvent('start-next-round', {});
    }

    const handleCreateNewLead = (evidence: string) => {
        console.log('Creating new lead with evidence:', evidence);
        // log current suspect
        // console.log(currentSuspect);
        // if (!currentSuspect || !gameState || !roomId) {
        //     return;
        // }
        // console.log('Creating new lead with evidence:', evidence);

        // const newLead: Lead = {
        //     evidence: evidence,
        //     suspect: currentSuspect?.id || '',
        // }

        // roomsService.createNewLead(roomId, newLead).then(async (newGameState) => {
        //     setGameState(await decryptGameState(newGameState));
        // });

    }

    const handleStartInterrogation = (suspectId: string) => {
        if (!gameState || !socket || !roomId) {
            return;
        }
        console.log('Starting interrogation with suspect:', suspectId);
        emitEvent('realtime:start', suspectId );
    }



    useEffect(() => {
        if (socket) {
            socket.on('game:updated', (newState: SingleGameState) => {
                console.log('Received game state update:', newState);
                setGameState(newState);
                setInterrogationTranscript([]);
                setResultsLoading(false);
            });

            socket.on('game-state-updating', (roundEnd: boolean) => {
                if (roundEnd) setResultsLoading(true);
            });

            socket.on('deduction:completed', () => {
                setDeductionSubmitted(false);
            })

            socket.on('deduction:started', () => {  
                setDeductionSubmitted(true);
            })


            socket.on('game-over', () => {
                setShowGameOver(true);
            });

            socket.on('realtime:audio:delta:assistant', handleRealtimeAudioDeltaEvent);

            socket.on('realtime:transcript:delta:assistant', handleRealtimeAudioTranscriptEvent);

            socket.on('realtime:message', handleRealtimeAudioTranscriptEvent);

            socket.on('round:tick', (params: any) => {
                setRoundTimer(params.countdown);
            });

            socket.on('realtime:transcript:done:user', handleUserAudioTranscriptEvent);

            socket.on('leaderboard-stats-update', handleLeaderboardStatsUpdate);


            joinRoom(roomId);

        }

        return () => {
            if (socket) {
                console.log('Removing listeners');
                socket.off('game-state-update');
                socket.off('game-state-updating');
                socket.off('round:tick');
                socket.off('user-audio-transcript');
                socket.off('realtime:transcript:delta:assistant');
                socket.off('realtime:audio:delta:assistant');
                socket.off('realtime:message');
                socket.off('realtime:transcript:done:user');
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
        if (!roomId || !killerVote || !socket) {
            return;
        }

        roomsService.createCulpritVote(roomId, killerVote)
            .then(async (newGameState) => {
                setGameState(await decryptGameState(newGameState));
                setVoteSubmitted(true);
            })
            .catch((error) => {
                console.error('Error submitting vote:', error);
            });
    };

    const handleSubmitDeduction = () => {
        setDeductionSubmitted(true);
        emitEvent('submit-deduction', roomId);
    }

    const handleStartGame = () => {
        emitEvent('game:start', roomId);
    }

    const handleEndInterrogation = () => {
        console.log('Ending interrogation');
        if (!socket || !roomId) {
            return;
        }
        emitEvent('realtime:end', roomId);
    }

    const renderGameContent = (): JSX.Element | null => {


        if (!gameState || !socket) {
            return <></>;
        }

        if (gameState.status === 'setup') {
            return <OffenseReport offenseReport={gameState.crime?.offenseReport || null} handleStartGame={handleStartGame} />
        }

        if (gameIsOver) {
            if (showGameOver) {
                return <GameOver oldRating={playerElo.oldRating} newRating={playerElo.newRating} badges={playerBadges} gameState={gameState} />;
            } else {
                // shwo the most recently complted round
                const mostRecentRound = gameState.rounds.filter((round) => round.status === 'completed').slice().reverse()[0];
                if (mostRecentRound) {
                    if (mostRecentRound.type === 'interrogation') {
                        return (
                            <Interrogation
                                wavStreamPlayerRef={wavStreamPlayerRef}
                                gameState={gameState}
                                roundTimer={roundTimer}
                                currentSuspect={activeSuspect}
                                interrogationTranscript={interrogationTranscript}
                                responseLoading={responseLoading}
                                audioTranscribing={audioTranscribing}
                                socket={socket}
                                emitEvent={emitEvent}
                                handleEndInterrogation={handleEndInterrogation}
                                handleAudioRecorded={handleAudioRecorded}
                                handleCreateNewLead={handleCreateNewLead}
                            />
                        );
                    } else if (mostRecentRound.type === 'voting') {
                        return (
                            <VotingRound
                                roundTimer={roundTimer}
                                gameState={gameState}
                                handleShowGameOver={() => setShowGameOver(true)}
                                deductionSubmitted={deductionSubmitted}
                                handleCreateNewLead={handleCreateNewLead}
                                handleStartNextRound={handleStartNextRound}
                                handleVoteSubmission={handleVoteSubmission}
                                killerVote={killerVote}
                                setKillerVote={setKillerVote}
                                handleSubmitDeduction={handleSubmitDeduction}
                                voteSubmitted={voteSubmitted}
                            />
                        );
                    }
                }
            }
        }

        if (resultsLoading) {
            return <ChangingRounds gameState={gameState} />;
        }


        if (activeRound?.type === 'voting') {
            return (
                <VotingRound
                    roundTimer={roundTimer}
                    gameState={gameState}
                    handleShowGameOver={() => setShowGameOver(true)}
                    deductionSubmitted={deductionSubmitted}
                    handleCreateNewLead={handleCreateNewLead}
                    handleStartNextRound={handleStartNextRound}
                    handleVoteSubmission={handleVoteSubmission}
                    killerVote={killerVote}
                    setKillerVote={setKillerVote}
                    handleSubmitDeduction={handleSubmitDeduction}
                    voteSubmitted={voteSubmitted}
                />
            );
        }

        if (activeRound?.type === 'interrogation') {
            if(activeRound?.conversations.find((conversation) => {
                return conversation.active
            })) {
                return (
                    <Interrogation
                        wavStreamPlayerRef={wavStreamPlayerRef}
                        gameState={gameState}
                        roundTimer={roundTimer}
                        currentSuspect={activeSuspect}
                        interrogationTranscript={interrogationTranscript}
                        handleEndInterrogation={handleEndInterrogation}
                        responseLoading={responseLoading}
                        audioTranscribing={audioTranscribing}
                        socket={socket}
                        emitEvent={emitEvent}
                        handleAudioRecorded={handleAudioRecorded}
                        handleCreateNewLead={handleCreateNewLead}
                    />
                );
            } else {
                return (
                    <ChooseInterrogation gameState={gameState} handleStartInterrogation={handleStartInterrogation} />
                );
            }


        }
        console.log('No active round found');
        return <></>;
    };


    const determineKeyBasedOnState = () => {
        if (!gameIsOver && !showGameOver) {
            if (!resultsLoading) {
                if (
                    (user && activeRound?.type === 'voting')
                ) {
                    return 'voting';
                } else if (
                    (activeRound?.type === 'interrogation')
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
        console.log('No game state');
        return <></>
    }


    return (

        <>
            <Box className=" flex w-full">
                <AllowAutoplayDialog open={autoplayDialogOpen} onClose={closeAutoplayDialog} onAllow={connectWaveStreamPlayer} />
                {!showSidebar && (
                <Button  variant="surface"size="4" onClick={() => setShowSidebar(!showSidebar)} className="fixed top-30 m-4">Open Case Files</Button>
                )}
                {gameState.status === 'active' && showSidebar && (<Box className="fixed top-30 m-4" >
                    <Flex px={'2'} py={'5'} >
                        <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '500px', height: '100%' }}>
                            {/* Round Timer */}
                            <IconButton
                                aria-label="Toggle Sidebar"
                                variant='ghost'
                                onClick={() => setShowSidebar(!showSidebar)}
                                style={{
                                    position: 'fixed',
                                    top: '16px',
                                    right: '16px',
                                    zIndex: 1000,
                                }}
                            >
                                <FiSidebar size={24} />
                            </IconButton>
                            {/* Accordion for Identity, Evidence, and Guilt Scores */}
                            <Tabs.Root defaultValue="crime">
                                <Heading size="6" className="mb-4">Case Files</Heading>
                                <Separator size={'4'} />
                                <Tabs.List className="flex space-x-4 mb-4">
                                    <Tabs.Trigger value="crime">Crime Information</Tabs.Trigger>
                                    <Tabs.Trigger value="evidence">Evidence</Tabs.Trigger>
                                    <Tabs.Trigger value="suspects">Suspects</Tabs.Trigger>
                                </Tabs.List>
                                <Tabs.Content value="crime">
                                    {gameState.crime && (
                                        <Flex gap="3" direction="column" mb={'6'}>
                                            <Text size="4">
                                                A <Strong>{gameState.crime.type}</Strong> occurred at <Strong>{gameState.crime.location}</Strong> around <Strong>{gameState.crime.time}</Strong>. Witnesses reported {gameState.crime.time}
                                            </Text>
                                        </Flex>
                                    )}
                                </Tabs.Content>
                                <Tabs.Content value="evidence">
                                    <h3 className="text-2xl font-bold mb-2">Evidence</h3>
                                    <Grid columns="2" gap="4">
                                        {gameState?.allEvidence?.map((item, index) => (
                                            <Card key={index} variant="surface" className="p-4">
                                                <Flex gap="2" align="center">
                                                    <Box>
                                                        <Text>{item.description}</Text>
                                                    </Box>
                                                </Flex>
                                            </Card>
                                        )) || (
                                            <Card variant="surface" className="p-4">
                                                <Text>No evidence available</Text>
                                            </Card>
                                        )}
                                    </Grid>
                                </Tabs.Content>
                                <Tabs.Content value="suspects">
                                    <Flex p={'2'} mt={'4'} direction={'column'} gap={'4'}>
                                        <Heading size='7'>Suspects</Heading>
                                        {gameState.suspects.map(suspect => (
                                            <SuspectCard suspect={suspect} key={suspect.id} variant='surface' />
                                        ))}
                                    </Flex>
                                </Tabs.Content>
                            </Tabs.Root>
                        </Card>
                    </Flex>
                </Box>)}

                <Box className="w-full flex-col h-full">
                    {/* Main game area */}
                    {gameState.status == 'active' && <RoundTimer roundTimer={roundTimer} activeRoundType={activeRound?.type || 'interrogation'}/>}
                    <Flex px={'2'} py={'5'} gap={'4'} className='w-full' justify={'center'} align={'center'}>
                        {/* Left panel: Crime and Evidence */}

                        <Box style={{ width: '100%', maxWidth: '1400px' }}>

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
                        </Box>
                    </Flex>
                </Box>
            </Box>
        </>
    );
}


export default SingleGame;