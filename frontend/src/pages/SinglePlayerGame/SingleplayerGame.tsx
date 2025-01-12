import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocketContext } from '../../context/SocketContext/socket.context';
import { ConversationItem, SingleGameState, Suspect, Deduction, OffenseReportItem, Conversation, DeductionNode, EdgeType } from '../../models/game-state.model';
import { Badge as GameResultBadge } from '../../models/gameResults.model';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsService } from '../../services/rooms.service';
import { leaderboardService } from '../../services/leaderboard.service';
import { useAuth } from '../../context/auth.context';
import { FiChevronUp, FiChevronDown, FiChevronsDown, FiChevronsUp, FiSidebar, FiInfo } from 'react-icons/fi';
import AudioRecorder from '../../components/audioRecorder';
import ResponseLoading from '../../components/responseLoading';
import { Card, Flex, SegmentedControl, AlertDialog, Box, Text, Grid, Button, RadioCards, Tooltip, Avatar, Separator, HoverCard, Heading, ScrollArea, Badge, Strong, CardProps, Tabs, Spinner, IconButton, Callout, Progress } from '@radix-ui/themes';
import './game.css';
import { Socket } from 'socket.io-client';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { WavStreamPlayer } from 'wavtools';
import { decryptGameState } from '../../utils/decrypt';
import AnimatedText from '../../components/animatedText';
import { ReactFlow, Edge, Node, Background, Controls, applyEdgeChanges, applyNodeChanges, Handle, Position, addEdge, Panel } from '@xyflow/react';
import { OffenseReportCard } from '../../components/OffenseCard';
import Dagre from '@dagrejs/dagre';
import { findImplicatedSuspect, getSupabaseImageURL} from '../../utils/helpers';
import '@xyflow/react/dist/style.css';
import CircleVisualizer from '../../components/audioVisualizer';

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
        <SwitchTransition mode="out-in">
            <CSSTransition
                key={currentIndex}
                nodeRef={nodeRef}
                classNames="fade"
                timeout={500}
                unmountOnExit
            >
                <Flex direction="column" align="center" justify="center" gap="4" className='offenseReport h-full'>
                    <div onClick={handleNext} style={{ cursor: 'pointer' }} className='h-full flex justify-center items-center'>
                        <SwitchTransition mode="out-in">
                            <CSSTransition
                                key={currentIndex}
                                nodeRef={nodeRef}
                                classNames="fade"
                                timeout={500}
                                unmountOnExit
                            >
                                <div ref={nodeRef} className='h-full'>
                                    <OffenseReportCard offenseReport={currentItem} index={currentIndex} size='xl' handleNext={handleNext} />
                                </div>
                            </CSSTransition>
                        </SwitchTransition>
                    </div>
                </Flex>
            </CSSTransition>
        </SwitchTransition>
    );
};


interface ChiefCardProps {
    gameState: SingleGameState;
    messages: string[];
    defaultMessage: string;
    deduction?: Deduction;
}

const ChiefCard: React.FC<ChiefCardProps> = ({ defaultMessage, messages = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(messages.length);
    const [openMessage, setOpenMessage] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
        }
    }, [isOpen]);

    const handleMessageClick = (index: number) => {
        setOpenMessage(index);
    };

    const handleBackClick = () => {
        setOpenMessage(null);
    };

    return (
        <Card
            variant='ghost'
            className={`w-[200px] text-center h-fit border-gray-700 border p-1`}
        >
            <Flex gap="4" direction="column" align="center">
                <Box className="relative">
                    <Avatar
                        src="https://i.ibb.co/GJWMFtf/chief-1.webp"
                        fallback="C"
                        size="4"
                    />
                    {unreadCount > 0 && (
                        <Box
                            className="absolute top-3 right-0 w-4 h-4 rounded-full"

                        >
                            <Text size="3" align="center" mb={'4'} style={{ backgroundColor: 'darkred' }} className='rounded-xl py-1 px-2'>
                                {unreadCount}
                            </Text>
                        </Box>
                    )}
                    <Text size="2" as="p" align="center" mt={'3'}>
                        Jr. Detective Gordon
                    </Text>
                </Box>
                {isOpen && openMessage === null && (
                    <ScrollArea style={{ height: 'fit', width: '100%' }}>
                        <Flex direction="column" gap="2">
                            {messages.length > 0 ? (
                                messages.map((_, index) => (
                                    <Box
                                        key={index}
                                        onClick={() => handleMessageClick(index)}
                                        className="w-full p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors cursor-pointer"
                                    >
                                        <Text size="3">Message {index + 1}</Text>
                                    </Box>
                                ))
                            ) : (
                                <Text size='3'>
                                    {defaultMessage}
                                </Text>
                            )}
                        </Flex>
                    </ScrollArea>
                )}
                {isOpen && openMessage !== null && (
                    <Box style={{ width: '100%' }}>
                        <Button
                            variant="ghost"
                            onClick={handleBackClick}
                            className="mb-2"
                        >
                            Back
                        </Button>
                        <Box className="w-full p-2 rounded">
                            <Text size="3">{messages[openMessage]}</Text>
                        </Box>
                    </Box>
                )}
                <Button
                    variant="ghost"
                    onClick={() => setIsOpen(!isOpen)}
                    className="mt-2"
                >
                    {isOpen ? <FiChevronDown /> : <FiChevronUp />}
                </Button>
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
                <AlertDialog.Title align={'center'}>Allow Autoplay</AlertDialog.Title>
                <AlertDialog.Description>
                    <Text as="span" size="3" align="center" className='w-full'>
                        This game requires audio playback. Please allow autoplay to proceed.
                    </Text>
                </AlertDialog.Description>
                <Flex justify="center" mt="6" gap={'6'}>
                    <AlertDialog.Cancel onClick={() => onClose()}>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action onClick={() => onAllow()}>
                        <Button variant="soft">Allow</Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
};

interface PlayerCardProps {
    suspect: Suspect | undefined;
    variant: CardProps['variant'];
    onClick?: () => void;
    disabled?: boolean;
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
            <Card variant={variant} onClick={onClick} className='cursor-pointer' >
                <Box key={suspect.id}>
                    <Flex gap="4" align="center">
                        <Avatar fallback={suspect.name.charAt(0)} src={getSupabaseImageURL(suspect.imgSrc)} />
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

        >
            <Avatar fallback={suspect?.name.charAt(0)} src={getSupabaseImageURL(suspect.imgSrc)} size="6" radius='full' className='min-w-[300px] min-h-[300px]' />
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


function ClueNode({ data }: any) {
    return (
        <>
            {data.type === 'suspect' ? <Handle type="target" id="implicates" position={Position.Left} style={{ height: '20px', width: '20px', zIndex: 10, top: 75, backgroundColor: 'darkred' }} /> : (
                <>
                    <Handle type="target" id="supports" position={Position.Left} style={{ height: '20px', width: '20px', zIndex: 10, top: 50, backgroundColor: 'cyan' }} />
                    <Handle type="target" id="contradicts" position={Position.Left} style={{ height: '20px', width: '20px', zIndex: 10, top: 100, backgroundColor: 'gold' }} />
                </>
            )}
            <Card variant="surface" className={`p-2 w-[400px] h-full flex flex-col gap-4`}>
                <Text size="2" as='p' weight="bold" className=''>
                    #{data.id} - {data.type}
                </Text>
                <Flex direction="row" gap="2" justify={'center'} align={'center'}>
                    {data.type !== 'statement' &&
                        <Avatar className='w-24 h-24' fallback={data.identity?.charAt(0)} src={data.imgSrc || '/backdoor.webp'} size="4" />
                    }
                    <Flex direction="column" gap="2" px={'4'}>
                        <Text size="2" weight="bold">{data.speaker}</Text>
                        <Text size="3">{data.description || data.identity || data.message}</Text>
                    </Flex>
                </Flex>

            </Card>
            <Handle type="source" position={Position.Right} id="a" style={{ height: '20px', width: '20px' }} />
        </>
    )
}






// VotingRound Component
interface DeductionFlowProps {
    gameState: SingleGameState;
    handleCreateNewLead?: (sourceNode: DeductionNode, targetNode: DeductionNode, type: EdgeType) => void;
    handleRemoveLead?: (id: string) => void;
    handleSubmitDeduction?: () => void;

    deductionLoading?: boolean;
}

const getLayoutedElements = (
    nodes: Node[],
    edges: Edge[],
    options: { direction: string },
) => {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: options.direction, ranksep: 250, nodesep: 150 });

    edges.forEach((edge) => g.setEdge(edge.source, edge.target));
    nodes.forEach((node) =>
        g.setNode(node.id, {
            ...node,
            width: node.measured?.width ?? 0,
            height: node.measured?.height ?? 0,
        }),
    );

    Dagre.layout(g);

    return {
        nodes: nodes.map((node) => {
            const pos = g.node(node.id);
            const x = pos.x - (node.measured?.width ?? 0) / 2;
            const y = pos.y - (node.measured?.height ?? 0) / 2;
            return { ...node, position: { x, y }, id: node.id };
        }),
        edges,
    };
};

const DeductionFlow: React.FC<DeductionFlowProps> = ({
    gameState,
    handleCreateNewLead,
    handleRemoveLead,
    handleSubmitDeduction,
    deductionLoading = false,
}) => {
    const nodeTypes = useMemo(() => ({ clue: ClueNode }), []);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    useEffect(() => {
        const initialNodes: Node[] = (gameState.deduction?.nodes || []).map((node, i) => ({
            id: node.id,
            position: { x: 100 * i, y: 100 * i },
            data: { label: node.data?.message, id: node.id, type: node.type, ...node.data, },
            type: 'clue',
        }));
        setNodes(initialNodes);

        const initialEdges: Edge[] = (gameState.deduction?.edges || []).map((edge) => ({
            id: `${edge.source_node.id}_${edge.target_node.id}`,
            source: edge.source_node.id,
            target: edge.target_node.id,
            label: edge.type,
        }));
        setEdges(initialEdges);
        console.log('Initial nodes', initialNodes);
        console.log('Initial edges', initialEdges);
    }, []);

    const onNodesChange = useCallback(
        (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: any) => {
            console.log("Edge changes", changes);
            const change = changes[0];
            console.log("Change", change);
            if (change.type === 'remove' && handleRemoveLead) {
                handleRemoveLead(change.id);
            }
            setEdges((eds) => applyEdgeChanges(changes, eds));

        },
        [],
    );

    const onLayout = useCallback(
        (direction: string) => {
            const layouted = getLayoutedElements(nodes, edges, { direction });
            setNodes([...layouted.nodes]);
            setEdges([...layouted.edges]);
        },
        [nodes, edges],
    );

    const suspectIsImplicated = useMemo(() => {
        return gameState.deduction.edges.some((edge) => edge.type === 'implicates');
    }, [gameState.deduction]);

    const implcatedSuspect = useMemo(() => {
        return gameState.suspects.find((suspect) => suspect.id === findImplicatedSuspect(gameState));
    }, [gameState.deduction]);



    const warmthBarColor = useMemo(() => {
        if (gameState.deduction.warmth >= 75) return 'red';
        if (gameState.deduction.warmth >= 50) return 'yellow';
        if (gameState.deduction.warmth >= 25) return 'green';
        return 'blue';
    }, [gameState.deduction.warmth]);

    const warmthMessage = useMemo(() => {
        if (gameState.deduction.warmth >= 75) return 'Hot';
        if (gameState.deduction.warmth >= 50) return 'Warm';
        if (gameState.deduction.warmth >= 25) return 'Cool';
        return 'Cold';
    }, [gameState.deduction.warmth]);

    const onConnect = useCallback(
        (params: any) => {
            console.log('Connect params', params);
            setEdges((eds) => addEdge({ ...params, id:`${params.source}_${params.target}`, label: params.targetHandle }, eds));
            const sourceNode = gameState.deduction.nodes.find((n) => n.id === params.source);
            const targetNode = gameState.deduction.nodes.find((n) => n.id === params.target);
            if (sourceNode && targetNode && handleCreateNewLead) handleCreateNewLead(sourceNode, targetNode, params.targetHandle);
        },
        [gameState, handleCreateNewLead],
    );

    return (
        <ReactFlow
            colorMode='dark'
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
        >
            <Background />
            <Controls position='top-right' style={{ flexDirection: 'row', position: 'absolute', top: '80px', width: '130px' }} />
            <Panel position="top-right" className="flex flex-col gap-4">
                <Heading size="3" className='w-full text-center'>Layout Controls</Heading>
                <Flex gap={'4'}>
                    <Button variant='outline' onClick={() => onLayout('TB')}>Vertical</Button>
                    <Button variant='outline' onClick={() => onLayout('LR')}>Horizontal</Button>
                </Flex>
            </Panel>
            <Panel position="bottom-right" className="flex flex-col gap-4">
                {!suspectIsImplicated ? <Callout.Root size="1" style={{ width: '200px' }}>
                    <Callout.Icon>
                        <FiInfo />
                    </Callout.Icon>
                    <Callout.Text>
                        Implicate a suspect by linking a statement or evidence to them.
                    </Callout.Text>
                </Callout.Root> :
                    <>
                        <Text size="3" weight="bold">Implicated Suspect</Text>
                        {implcatedSuspect && <SuspectCard suspect={implcatedSuspect} key={implcatedSuspect.id} variant='surface' />}
                    </>
                }
                {handleSubmitDeduction &&
                    <Button aria-disabled={!suspectIsImplicated || deductionLoading} disabled={!suspectIsImplicated || deductionLoading} onClick={() => handleSubmitDeduction()} variant='classic' size={'4'} > {deductionLoading ? <Spinner /> : 'Submit Deduction'}</Button>}
            </Panel>
            <Panel>
                <Box className='relative w-[200px] '>
                    <Tooltip className='z-10' content="The warmth meter indicates how close you are to solving the crime.">
                        <Heading size="3" className='text-center mb-3'>
                            Warmth Meter

                            <FiInfo className='ml-1 cursor-pointer inline' />
                        </Heading>
                    </Tooltip>
                    {!deductionLoading ? <Text size="5" weight="bold" className='absolute top-[55%] z-10 left-[40%]'>{warmthMessage}</Text> :
                        <Spinner className='absolute top-[40%] z-10 left-[45%]' />}
                    <Progress size={'3'} max={100} duration="10s" value={gameState.deduction.warmth} color={warmthBarColor} className='h-32 w-32 rotate-[270deg] m-auto' />
                    <Tooltip content="Your partner will provide feedback on your deductions here." className='z-10'>
                        <Box className='absolute top-48 left-6 w-full h-full m-auto'>

                            <ChiefCard gameState={gameState} defaultMessage="Implicate a suspect by linking a statement or evidence to them." messages={gameState.deduction.feedback} />
                        </Box>
                    </Tooltip>
                </Box>
            </Panel>

            <Panel position="top-center" className="legend-panel p-4">
                <Card variant="surface" className="legend-card">
                    <Flex direction="row" gap="2">
                        <Flex align="center" gap="2">
                            <Box style={{ backgroundColor: '#8B0000', width: '16px', height: '16px' }} />
                            <Text size="2">Implicates</Text>
                        </Flex>
                        <Flex align="center" gap="2">
                            <Box style={{ backgroundColor: '#00FFFF', width: '16px', height: '16px' }} />
                            <Text size="2">Supports</Text>
                        </Flex>
                        <Flex align="center" gap="2">
                            <Box style={{ backgroundColor: '#FFD700', width: '16px', height: '16px' }} />
                            <Text size="2">Contradicts</Text>
                        </Flex>
                    </Flex>
                </Card>
            </Panel>
        </ReactFlow>
    );
};

interface VotingRoundProps {
    gameState: SingleGameState;
    killerVote: string | undefined;
    deductionSubmitted: boolean;
    handleCreateNewLead: (sourceNode: DeductionNode, targetNode: DeductionNode, type: EdgeType) => void;
    handleRemoveLead: (id: string) => void;
    handleCreateNewdeductionNode: (node: DeductionNode) => void;
    setKillerVote: React.Dispatch<React.SetStateAction<string | undefined>>;
    handleSubmitDeduction: () => void;
    handleShowGameOver: () => void;
    handleVoteSubmission: () => void;
    voteSubmitted: boolean;
    deductionLoading: boolean;
}

const VotingRound: React.FC<VotingRoundProps> = ({
    gameState,
    deductionLoading,
    handleCreateNewLead,
    handleRemoveLead,
    handleCreateNewdeductionNode,
    handleSubmitDeduction,
}) => {
    const [activeConversation, setActiveConversation] = useState<Conversation | undefined>(undefined);

    return (
        <Flex direction="row" gap="4" className="h-full">
            <Tabs.Root defaultValue="deduction" className="w-full h-full">
                <Tabs.List className="w-full text-center justify-center mb-2 text-xl">
                    <Tabs.Trigger value="deduction">Deduction</Tabs.Trigger>
                    <Tabs.Trigger value="interrogations">Interrogations</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="interrogations" className="h-full">
                    <Flex gap="4">
                        <Box className="w-1/4 p-2 border-r flex flex-col gap-4">
                            {gameState.rounds
                                .find((round) => round.type === "interrogation")
                                ?.conversations.map((conversation, index) => (
                                    <Flex direction="column" gap="4" key={conversation.suspect + index}>
                                        <Card
                                            variant="surface"
                                            className="p-4 hover:border-green-300 hover:border rounded-lg transition-all duration-100 hover:cursor-pointer"
                                            onClick={() => setActiveConversation(conversation)}
                                        >
                                            <Text size="2" weight="bold">
                                                {gameState.suspects.find((suspect) => suspect.id === conversation.suspect)?.name}
                                            </Text>
                                            <Text size="1" weight="light" ml="4">
                                                #{conversation.suspect}
                                            </Text>
                                        </Card>
                                        {index <
                                            (gameState?.rounds
                                                ?.find((round) => round.type === "interrogation")
                                                ?.conversations.length || 1) -
                                            1 && <Separator orientation="horizontal" size="4" />}
                                    </Flex>
                                ))}
                        </Box>
                        <Box className="w-3/4 p-2">
                            {activeConversation && (
                                <Box className="interrogationChat w-full overflow-y-auto p-4 rounded-lg h-full">
                                    {activeConversation.responses.map((response, index) => (
                                        <Tooltip
                                            key={index}
                                            content={<Text size="2">Create a new lead from this statement</Text>}
                                            className="p-1"
                                        >
                                            <Flex
                                                className="gap-5 py-3 hover:border-green-300 hover:border rounded-lg transition-all duration-100 hover:cursor-pointer"
                                                onClick={() => {
                                                    handleCreateNewdeductionNode({
                                                        id: `statement-${index}`,
                                                        type: "statement",
                                                        data: {
                                                            speaker: response.speaker,
                                                            message: response.message,
                                                        },
                                                    });
                                                }}
                                            >
                                                <Box ml="2" mb="2">
                                                    <Text as="p" weight="bold" size="3">
                                                        {response.speaker}
                                                    </Text>
                                                </Box>
                                                <Box className="col-span-7">
                                                    <Text align="left" as="span">
                                                        {response.message}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        </Tooltip>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Flex>
                </Tabs.Content>

                <Tabs.Content value="deduction" className="w-full h-full" style={{ width: '100%', height: '70vh' }}>
                    <DeductionFlow
                        gameState={gameState}
                        handleRemoveLead={handleRemoveLead}
                        handleCreateNewLead={handleCreateNewLead}
                        handleSubmitDeduction={handleSubmitDeduction}
                        deductionLoading={deductionLoading}
                    />
                </Tabs.Content>
            </Tabs.Root>
        </Flex>
    );
};


interface ChooseInterrogationProps {
    gameState: SingleGameState;
    handleStartInterrogation: (suspectId: string) => void;
    interrogationLoading: boolean;
}

const ChooseInterrogation: React.FC<ChooseInterrogationProps> = ({ gameState, handleStartInterrogation, interrogationLoading }) => {
    const [selectedSuspectId, setSelectedSuspectId] = useState<string>(gameState.suspects[0].id);

    const handleStart = () => {
        if (selectedSuspectId) {
            handleStartInterrogation(selectedSuspectId);
        }
    };

    return (
        <Flex direction="column" align="center" justify="center" gap="4">
            <Heading size="7">Choose a Suspect to Interrogate</Heading>
            <RadioCards.Root value={selectedSuspectId} onValueChange={setSelectedSuspectId} disabled={interrogationLoading}>
                <Grid columns="3" gap="4">
                    {gameState.suspects.map((suspect) => (
                        <RadioCards.Item key={suspect.id} value={suspect.id} disabled={interrogationLoading}>
                            <SuspectCard suspect={suspect} variant="ghost" size='large' />
                        </RadioCards.Item>
                    ))}
                </Grid>
            </RadioCards.Root>
            <Button onClick={handleStart} size={'3'} disabled={!selectedSuspectId || interrogationLoading} mt={'9'}>
                {interrogationLoading ? <Spinner /> : 'Start Interrogation'}
            </Button>
        </Flex>
    );
}

// Interrogation Component
interface InterrogationProps {
    gameState: SingleGameState;
    currentSuspect: Suspect | undefined;
    userInterrogationTranscript: ConversationItem[];
    suspectInterrogationTranscript: ConversationItem[];
    wavStreamPlayerRef: React.MutableRefObject<WavStreamPlayer | null>;
    responseLoading: boolean;
    audioTranscribing: boolean;
    loadingSessionEnd: boolean;
    socket: Socket; // Adjust this type based on your socket implementation
    emitEvent: (event: string, data: any) => void;
    handleAudioRecorded: (arrayBuffer: ArrayBuffer) => void;
    handleEndInterrogation: () => void
    audioAmplitudeData: Float32Array
}

/**
 * I need to be able to know if there is an active conversation, and use an eventually consistent approach to update the conversation
 * if there an active conversation, then I should show the interrogation transcript UI along with the suspect card
 * if there is no active conversation, then I should show the choose a suspect UI
 * @param param0 
 * @returns 
 */

const Interrogation: React.FC<InterrogationProps> = ({
    userInterrogationTranscript,
    suspectInterrogationTranscript,
    responseLoading,
    audioTranscribing,
    socket,
    currentSuspect,
    emitEvent,
    handleAudioRecorded,
    handleEndInterrogation,
    loadingSessionEnd,
    audioAmplitudeData,
}) => {

    const interrogationTranscript: ConversationItem[] = [];
    let i = 0;
    while (i < userInterrogationTranscript.length || i < suspectInterrogationTranscript.length) {
        if (userInterrogationTranscript[i]) interrogationTranscript.push(userInterrogationTranscript[i]);
        if (suspectInterrogationTranscript[i]) interrogationTranscript.push(suspectInterrogationTranscript[i]);
        i++;
    }


    return (
        <>
            <div className='grid grid-cols-1 grid-rows-[auto_1fr] gap-4'>
                <h2 className="text-2xl font-bold w-full text-center h-fit">Interrogation</h2>
                <Box
                    as="div"
                    className="interrogationChat w-full overflow-y-auto p-4 rounded-lg h-[550px]"
                >
                    <Flex className='h-full'>
                        <Flex className='min-w-[600px] min-h-full' justify={'center'} align={'center'} direction={'column'}>
                            <CircleVisualizer amplitudeData={audioAmplitudeData} />
                            <Avatar fallback={currentSuspect?.name.charAt(0) || 'E'} src={getSupabaseImageURL(currentSuspect?.imgSrc || '')} size="6" className='min-w-[300px] min-h-[300px]' />
                        </Flex>
                        <Box>

                            <Flex className='w-full' justify={'start'} direction={'column'}>
                                <ScrollArea className='h-[400px] w-full'>
                                    <Flex className='w-full' justify={'center'} align={'center'} direction={'column'}>
                                        {/* <SuspectCard suspect={currentSuspect} variant='surface' size='small' /> */}
                                        <AnimatedText animationSpeed={50} size='xs' message='The suspect enters the room for interrogation. Begin the interrogation. ask them about the crime, and their involvement in it.' />
                                    </Flex>
                                    {interrogationTranscript.map((conversationItem, index) => (
                                            <Flex key={index} className='col-span-8 gap-5 py-3'>
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
                                    ))}
                                    <Flex direction={'column'} className='w-full'>
                                        {responseLoading && (
                                            <ResponseLoading label={`${currentSuspect?.name}...`} />
                                        )}
                                        {audioTranscribing && (
                                            <ResponseLoading label="Transcribing your response..." />
                                        )}
                                    </Flex>
                                </ScrollArea>

                            </Flex>
                        </Box>
                    </Flex>

                </Box>
                <div className="flex gap-4 justify-center">
                    {socket && (
                        <AudioRecorder
                            socket={socket}
                            emitEvent={emitEvent}
                            onAudioRecorded={handleAudioRecorded}
                            loadingSessionEnd={loadingSessionEnd}
                            handleEndInterrogation={handleEndInterrogation}
                        />
                    )}
                    {/* <Button
                        size="4"
                        variant='outline'
                        radius='small'
                        mt={'5'}
                        className='py-6'
                        disabled={loadingSessionEnd}
                        onClick={() => handleEndInterrogation()}
                    >
                        {loadingSessionEnd ? <Spinner /> : 'End Interrogation'}
                    </Button> */}
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
    badges: GameResultBadge[];
    leaderboardUpdating: boolean;
}

const ResultsSummary: React.FC<ResultsSummaryProps> = ({ elo, newElo, badges, leaderboardUpdating }) => {
    const eloDiff = newElo == 0 ? 0 : newElo - elo;
    return (
        <Flex direction={'column'} className='w-full' justify={'center'} align={'center'}>

            <Heading> Rating </Heading>
            <Flex gap={'5'} mt='3' direction={'column'} align={'center'} justify={'center'}>
                <Flex gap={'3'} >
                    {leaderboardUpdating ? (
                        <Flex gap={'2'} align={'center'}>
                            <AnimatedText animationSpeed={150} className='text-5xl winnerHeader' message='Updating...' />
                        </Flex>
                    ) : (
                        <>
                            <Text weight='bold' className='text-8xl'>{newElo || elo}<Text className='text-2xl' as='p'> New Rank</Text></Text>

                            <Text as='span'>
                                {eloDiff > 0 ? (
                                    eloDiff > 15 ? (
                                        <>
                                            <FiChevronsUp className='inline text-green-500' /> <Text className='text-3xl inline text-green-500' as='span'>{eloDiff}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <FiChevronUp /> <Text className='text-3xl inline text-green-500' as='span'>{eloDiff}</Text>
                                        </>
                                    )
                                ) : eloDiff < 0 ? (
                                    eloDiff < -15 ? (
                                        <>
                                            <FiChevronsDown className='inline text-red-500' size={'30'} /> <Text className='text-3xl inline text-red-500' as='span'>{eloDiff}</Text>
                                        </>
                                    ) : (
                                        <>
                                            <FiChevronDown /> <Text className='text-3xl inline text-red-500' as='span'>{eloDiff}</Text>
                                        </>
                                    )
                                ) : (
                                    '----'
                                )}
                            </Text>
                        </>
                    )}
                </Flex>
                <Separator size="4" />
                <Text className='text-2xl' weight={'bold'}>Badges</Text>
                <Flex gap={'2'}>

                    {badges.map((badge, index) => (
                        <HoverCard.Root key={index}>
                            <HoverCard.Trigger>
                                <Badge key={index} size='2' variant='surface' className="cursor-pointer">
                                    <Text className='text-xl'>{badge.badge}</Text>
                                </Badge>
                            </HoverCard.Trigger>
                            <HoverCard.Content asChild side="top" align="center">
                                <Box className="p-2 rounded">
                                    <Text> {badge.explanation} </Text>
                                </Box>
                            </HoverCard.Content>
                        </HoverCard.Root>
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
    newRating: number | 0;
    badges: GameResultBadge[];
    leaderboardUpdating: boolean;
}

const GameOver: React.FC<GameOverProps> = ({ gameState, oldRating: elo, newRating: newElo, badges, leaderboardUpdating }) => {
    return (
        <Flex direction="column" gap="4">
            <Flex direction={{ sm: 'column', md: 'row' }} align="center" justify="between" width={'60%'} gap="9" className='m-auto'>
                <Flex direction="column" gap="2">
                    {gameState.outcome === 'win' ? (
                        <>
                            <AnimatedText animationSpeed={150} className='text-8xl winnerHeader' message='You win!' />
                            <AnimatedText animationSpeed={150} className='text-3xl winnerHeader' message='Case Closed' />
                        </>
                    ) : (
                        <>
                            <AnimatedText animationSpeed={150} className='text-8xl winnerHeader' message='You lose...' />
                            <AnimatedText animationSpeed={150} className='text-3xl winnerHeader' message='Case Closed' />
                        </>
                    )}
                </Flex>
                <Flex direction={'column'} gap={'4'} align={'center'}>
                    <Text size="2" weight="bold" className='text-3xl'>The Culprit</Text>
                    {gameState.suspects
                        .filter((suspect) => suspect.isCulprit)
                        .map((suspect) => (
                            <SuspectCard
                                key={suspect.id}
                                suspect={suspect}
                                variant="surface"
                                size="small"
                            />
                        ))}
                </Flex>
            </Flex>

            <Tabs.Root defaultValue="results" className="w-full">
                <Tabs.List className="flex justify-center  mb-4">
                    <Tabs.Trigger value="results" className="mr-4 px-4 py-2 text-lg">
                        Results Summary
                    </Tabs.Trigger>
                    <Tabs.Trigger value="real-story" className="mr-4 px-4 py-2 text-lg">
                        Real Story
                    </Tabs.Trigger>
                    <Tabs.Trigger value="deduction" className="px-4 py-2 text-lg">
                        Your Deduction
                    </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="results" className="mt-4">
                    <ResultsSummary elo={elo} newElo={newElo} badges={badges} leaderboardUpdating={leaderboardUpdating} />
                </Tabs.Content>

                <Tabs.Content value="real-story" className="mt-4">
                    <Flex direction="column" gap="4">
                        <Flex direction="row" gap="3" wrap="wrap" justify={'center'} align={'center'}>
                            {gameState.crime?.realStory.map((storyItem, index) => (
                                <OffenseReportCard key={index} offenseReport={storyItem} index={index} />
                            ))}
                        </Flex>
                    </Flex>
                </Tabs.Content>

                <Tabs.Content value="deduction" className="mt-4">
                    <Flex direction="column" gap="4" className="h-[70vh] w-full" justify={'center'} align={'center'}>
                        <DeductionFlow
                            gameState={gameState}
                        />
                    </Flex>
                </Tabs.Content>
            </Tabs.Root>
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




    const [userInterrogationTranscript, setUserInterrogationTranscript] = useState<ConversationItem[]>([]);
    const [suspectInterrogationTranscript, setSuspectInterrogationTranscript] = useState<ConversationItem[]>([]);
    const nodeRef = useRef(null);
    const [roundTimer, setRoundTimer] = useState<number>(0);

    const [leaderboardUpdating, setLeaderboardUpdating] = useState<boolean>(true);
    const [showGameOver, setShowGameOver] = useState<boolean>(false);
    const [audioTranscribing, setAudioTranscribing] = useState<boolean>(false);
    const [responseLoading, setResponseLoading] = useState<boolean>(false);
    const [deductionSubmitted, setDeductionSubmitted] = useState<boolean>(false);
    const [deductionLoading, setDeductionLoading] = useState<boolean>(false);
    const [interrogationLoading, setInterrogationLoading] = useState<boolean>(false);
    const [resultsLoading, setResultsLoading] = useState<boolean>(false);

    const [killerVote, setKillerVote] = useState<string>();

    const [voteSubmitted, setVoteSubmitted] = useState<boolean>(false)
    const [showSidebar, setShowSidebar] = useState<boolean>(false);
    const [autoplayDialogOpen, setAutoplayDialogOpen] = useState<boolean>(true);
    const [loadingSessionEnd, setLoadingSessionEnd] = useState<boolean>(false);
    const [playerElo, setPlayerElo] = useState<{ oldRating: number, newRating: number }>({ oldRating: 0, newRating: 0 });
    const [playerBadges, setPlayerBadges] = useState<GameResultBadge[]>([]);
    const [audioAmplitudeData, setAudioAmplitudeData] = useState<Float32Array>(new Float32Array(0));

    const wavStreamPlayerRef = useRef<WavStreamPlayer>(
        new WavStreamPlayer({ sampleRate: 24000 })
    );

    const gameIsOver = useMemo(() => {
        return gameState?.status == 'finished';
        // return false;
    }, [gameState])

    const activeRound = useMemo(() => {
        if (!gameState) return null;
        console.log("updating active round");
        const activeRound = gameState?.rounds?.find((round) => round.status === 'active')
        console.log(gameState);
        return activeRound;
        // return {type: 'interrogation'}
    }, [gameState]);

    // const activeConversation = useMemo(() => {
    //     if (!gameState) return null;
    //     const activeConversation = gameState?.rounds?.find((round) => round?.type === "interrogation")
    //         ?.conversations.find((conversation) => conversation.active);
    //     return activeConversation;
    // }, [gameState]);

    const activeSuspect = useMemo(() => {
        const activeSuspectId = gameState?.rounds?.find((round) => round?.type === "interrogation")
            ?.conversations.find((conversation) => conversation.active)?.suspect;
        return gameState?.suspects?.find((suspect) => suspect.id === activeSuspectId);
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
        const { speaker, transcript, responseId, currentRoundTime } = params;
        setUserInterrogationTranscript(prev => [...prev, { audioTranscript: transcript, timestamp: currentRoundTime, speaker, responseId }]);
        setAudioTranscribing(false);
    }, []);

    const handleRealtimeAudioTranscriptEvent = (params: any) => {
        const { speaker, transcript, currentRoundTime, responseId } = params;
        console.log('Received audio transcript:', params);
        setSuspectInterrogationTranscript(prev => {
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
            // const analysis = wavStreamPlayer.getFrequencies('voice');
            // audioAmplitudeData.current = analysis.values;
        }
    }

    const handleLeaderboardStatsUpdate = (params: any) => {
        console.log('Leaderboard stats update:', params);
        const { oldRating, newRating, badges } = params;
        setPlayerElo({ oldRating, newRating });
        setPlayerBadges(badges);
    }

    const handleCreateNewLead = (sourceNode: DeductionNode, targetNode: DeductionNode, type: EdgeType) => {

        if (!gameState || !socket || !roomId || !sourceNode || !targetNode) {
            console.error('Invalid parameters when creating lead:', gameState, socket, roomId, sourceNode, targetNode);
            return;
        }
        setDeductionLoading(true);

        emitEvent('deduction:lead:created', { sourceNode, targetNode, type });

    }

    useEffect(() => {
        // set the amplitude dats in a callback function passed into requestAnimationFrame

        const updateAmplitudeData = () => {
            if (wavStreamPlayerRef.current && wavStreamPlayerRef.current?.analyser) {
                requestAnimationFrame(updateAmplitudeData);
                setAudioAmplitudeData(wavStreamPlayerRef.current?.getFrequencies('voice').values);
            }
        }
        updateAmplitudeData();
    }, [wavStreamPlayerRef.current , wavStreamPlayerRef.current.analyser]);


    useEffect(() => {
        if (socket) {
            socket.on('game:updated', (newState: SingleGameState) => {
                console.log('Received game state update:', newState);
                setGameState(newState);
                setUserInterrogationTranscript([]);
                setSuspectInterrogationTranscript([]);
                setDeductionLoading(false)
                setResultsLoading(false);
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

            socket.on('realtime:transcript:done:user', handleUserAudioTranscriptEvent);
            
            socket.on('realtime:audio:delta:assistant', handleRealtimeAudioDeltaEvent);

            socket.on('realtime:transcript:delta:assistant', handleRealtimeAudioTranscriptEvent);

            socket.on('realtime:message', handleRealtimeAudioTranscriptEvent);

            socket.on('realtime:ended', () => {
                setLoadingSessionEnd(false);
                setInterrogationLoading(false);
            });

            socket.on('realtime:started', () => {
                setInterrogationLoading(false);
            });

            socket.on('deduction:completed', () => {
                setDeductionLoading(false);
            });

            socket.on('round:tick', (params: any) => {
                setRoundTimer(params.countdown);
            });

            socket.on('leaderboard:started', () => {
                setLeaderboardUpdating(true);
            });

            socket.on('leaderboard:finished', (leaderboardData: any) => {
                console.log('Leaderboard data:', leaderboardData);
                setLeaderboardUpdating(false);

                setPlayerBadges(leaderboardData.badges);
                setPlayerElo({ oldRating: leaderboardData.oldRating, newRating: leaderboardData.newRating });

            });



            socket.on('leaderboard:updated', handleLeaderboardStatsUpdate);


            joinRoom(roomId);

        }

        return () => {
            if (socket) {
                console.log('Removing listeners');
                socket.off('game:updated');
                socket.off('round:tick');
                socket.off('user-audio-transcript');
                socket.off('realtime:transcript:delta:assistant');
                socket.off('realtime:audio:delta:assistant');
                socket.off('realtime:message');
                socket.off('realtime:transcript:done:user');
                socket.off('leaderboard:updated');
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
                    setGameState(room.game_state as SingleGameState);

                } else {
                    navigate(`/lobby/${roomId}`);
                }
            });

            leaderboardService.getGameResultsForUser(roomId, user?.id || '').then((response) => {
                const result = response.results[0];
                setPlayerBadges(result.badges);
                setLeaderboardUpdating(false);
                setPlayerElo({ oldRating: result.old_rating, newRating: result.new_rating });
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
        console.log('Submitting deduction');
        setDeductionSubmitted(true);
        setDeductionLoading(true);
        emitEvent('deduction:submit', roomId);
    }

    const handleStartInterrogation = (suspectId: string) => {
        if (!gameState || !socket || !roomId) {
            return;
        }
        console.log('Starting interrogation with suspect:', suspectId);
        setLoadingSessionEnd(false);
        setInterrogationLoading(true);
        emitEvent('realtime:start', suspectId);
    }


    const handleCreateNewdeductionNode = (node: DeductionNode) => {
        if (!gameState || !socket || !roomId) {
            console.error('Invalid parameters when creating deduction node:', gameState, socket, roomId);
            return;
        }

        emitEvent('deduction:node:created', node);
    }

    const handleStartGame = () => {
        emitEvent('game:start', roomId);
    }

    const handleRemoveLead = (id: string) => {
        setDeductionLoading(true);
        console.log('Removing lead:', id);
        emitEvent('deduction:lead:removed', id);
    }

    const handleEndInterrogation = () => {
        console.log('Ending interrogation');
        if (!socket || !roomId) {
            return;
        }
        setLoadingSessionEnd(true);
        emitEvent('realtime:end', roomId);
    }

    // const updateLeaderboard = () => {
    //     if (!socket) {
    //         return;
    //     }
    //     emitEvent('leaderboard:update', {});
    // }

    const renderGameContent = (): JSX.Element | null => {


        if (!gameState || !socket) {
            return <></>;
        }

        if (gameState.status === 'setup') {
            return <OffenseReport offenseReport={gameState.crime?.offenseReport || null} handleStartGame={handleStartGame} />
        }

        if (gameIsOver) {
            return <GameOver gameState={gameState} oldRating={playerElo.oldRating} newRating={playerElo.newRating} badges={playerBadges} leaderboardUpdating={leaderboardUpdating} />
        }

        if (resultsLoading) {
            return <ChangingRounds gameState={gameState} />;
        }


        if (activeRound?.type === 'voting') {
            return (
                <VotingRound
                    // roundTimer={roundTimer}
                    gameState={gameState}
                    handleShowGameOver={() => setShowGameOver(true)}
                    deductionSubmitted={deductionSubmitted}
                    deductionLoading={deductionLoading}
                    handleCreateNewLead={handleCreateNewLead}
                    handleRemoveLead={handleRemoveLead}
                    handleCreateNewdeductionNode={handleCreateNewdeductionNode}
                    handleVoteSubmission={handleVoteSubmission}
                    killerVote={killerVote}
                    setKillerVote={setKillerVote}
                    handleSubmitDeduction={handleSubmitDeduction}
                    voteSubmitted={voteSubmitted}
                />
            );
        }

        if (activeRound?.type === 'interrogation') {
            if (activeRound?.conversations?.find((conversation) => {
                return conversation.active
            })) {
                return (

                    <Interrogation
                        wavStreamPlayerRef={wavStreamPlayerRef}
                        loadingSessionEnd={loadingSessionEnd}
                        gameState={gameState}
                        currentSuspect={activeSuspect}
                        userInterrogationTranscript={userInterrogationTranscript}
                        suspectInterrogationTranscript={suspectInterrogationTranscript}
                        handleEndInterrogation={handleEndInterrogation}
                        responseLoading={responseLoading}
                        audioTranscribing={audioTranscribing}
                        socket={socket}
                        emitEvent={emitEvent}
                        handleAudioRecorded={handleAudioRecorded}
                        audioAmplitudeData={audioAmplitudeData}
                    />
                );
            } else {
                return (

                    <ChooseInterrogation gameState={gameState} interrogationLoading={interrogationLoading} handleStartInterrogation={handleStartInterrogation} />
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
                {!showSidebar && gameState.status === 'active' && (
                    <Button variant="surface" size="4" onClick={() => setShowSidebar(!showSidebar)} className="absolute top-20 m-4">Open Case Files</Button>
                )}
                {gameState.status === 'active' && showSidebar && (<Box className="fixed top-30 m-4 z-10" >
                    <Flex px={'2'} py={'5'} >
                        <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '500px', height: '100%', zIndex: 30 }}>
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
                            <Tabs.Root defaultValue="crime" className='z-30'>
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
                                                A <Strong>{gameState.crime.type}</Strong> occurred at <Strong>{gameState.crime.location}</Strong> around <Strong>{gameState.crime.time}</Strong>. Witnesses reported the following:
                                            </Text>
                                            <Flex direction="column" gap="4">
                                                {gameState.crime.offenseReport?.map((item, index) => (
                                                    <Card key={index} className="flex items-center p-4 gap-4">
                                                        <Avatar size="6" fallback={item.time.charAt(0)} src={getSupabaseImageURL(item.imgSrc)} className='w-32 h-32' />
                                                        <Flex direction="column">
                                                            <Text size="2" weight="bold">{item.time} @ {item.location}</Text>
                                                            <Text size="3">{item.description}</Text>

                                                        </Flex>
                                                    </Card>
                                                )) || <Text>No event reports available.</Text>}
                                            </Flex>
                                        </Flex>
                                    )}
                                </Tabs.Content>
                                <Tabs.Content value="evidence">
                                    <h3 className="text-2xl font-bold mb-2">Evidence</h3>
                                    <Flex gap="4" direction="column">
                                        {gameState?.allEvidence?.map((item, index) => (
                                            <Card key={index} variant="surface" className="p-4">
                                                <Flex gap="2" align="center">
                                                <Avatar size="6" fallback={item.description.charAt(0)} src={getSupabaseImageURL(item.imgSrc)} className='w-32 h-32' />
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
                                    </Flex>
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
                    {gameState.status == 'active' && <RoundTimer roundTimer={roundTimer} activeRoundType={activeRound?.type || 'interrogation'} />}
                    <Flex px={'2'} py={'5'} gap={'4'} className='w-full h-full' justify={'center'} align={'center'}>
                        {/* Left panel: Crime and Evidence */}

                        <Box style={{ width: '100%', maxWidth: '1600px', height: '100%' }}>

                            <SwitchTransition mode="out-in">
                                <CSSTransition
                                    key={determineKeyBasedOnState()}
                                    classNames="fade"
                                    timeout={1000}
                                    unmountOnExit
                                    nodeRef={nodeRef}
                                >

                                    <div ref={nodeRef} className='h-full'>
                                        {/* <Button onClick={updateLeaderboard}> Updated Leaderboard</Button> */}
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