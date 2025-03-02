import React, { useState } from 'react';
import { Box, Heading, Text, Card, Grid, Tabs, Flex, Button } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import LoginDialog from './login';
import './faq.css';

const FAQ: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loginDialogOpen, setLoginDialogOpen] = useState(false);

    const handlePlayClick = () => {
        if (user) {
            navigate('/play');
        } else {
            setLoginDialogOpen(true);
        }
    };

    return (
        <Box as="div" className="max-w-7xl mx-auto faq-container">
            <Box className=" p-6 rounded-lg shadow-lg game-heading">
                <Heading as="h2" size="8" mb="4" className='game-heading'>
                    Game Overview
                </Heading>
                <Text mb="4" size={{initial: '5', sm: '6', md: '7'}}>
                    Suspect is a true crime detective game. <br/> <br/>  We use AI to create unique crime scenarios that the players try to solve via real-time voice communication.

                    <br/> <br/>
                    In the single player mode, you play as a detective. You have 10 minutes to interrogate the AI suspects in a voice chat and make a deduction.
                    <br/> <br/>
                    In the multiplayer mode, you play as a suspect trying to deceive the AI detective and avoid being convicted.
                    
                </Text>
            </Box>
            <Box className=" p-6 rounded-lg shadow-lg mt-6 w-full">

                <Tabs.Root defaultValue="single" aria-label="Game Mode Tabs">
                    <Heading as="h2" size="8" mb="4" className='game-heading'>Rules</Heading>
                    <Tabs.List className='w-full flex justify-center'>
                        <Tabs.Trigger value="single" className='text-xl game-heading'>Single Player</Tabs.Trigger>
                        <Tabs.Trigger value="multi" className='text-xl game-heading'>Multiplayer</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="single">
                        <Grid columns={{ sm: '1' }} gap="9" mt={'5'}>
                            <Flex direction={{ initial: 'column', md: 'row' }} gap="4" justify={'center'} >
                                <Box>
                                <Heading as="h3" size="6" mb="2">
                                    Step 1
                                </Heading>
                                <Text size={'5'}>Once the game is started, you will be shown an offense report. This is what the authorities currently know about the crime</Text>
                                </Box>
                                <img src="/offense-report.gif" alt="Single Player" className="md:w-1/2 sm:w-full" />
                                
                            </Flex>
                            <Flex direction={{ initial: 'column', md: 'row' }} gap="4" justify={'center'} >
                                <Box >
                                <Heading as="h3" size="6" mb="2">
                                    Step 2
                                </Heading>
                                <Text size={'5'}>You will then have 10 minutes to interrogate any suspects you want, one at a time. Ask them about the crime and their involvement in it</Text>
                                </Box>
                                <img src="/interrogation.gif" alt="Single Player" className="md:w-1/2 sm:w-full" />
                                
                            </Flex>
                            <Flex direction={{ initial: 'column', md: 'row' }} gap="4" justify={'center'}>

                                <Box>
                                <Heading as="h3" size="6" mb="2">
                                    Step 3
                                </Heading>
                                <Flex direction={'column'} gap={'6'}>
                                <Text as='p' size={'5'} >
                                    All of the evidence, suspects, and pieces of the offense report will be available to you, as well as all the transcripts of all suspect interrogations.
                                </Text>
                                <Text as='p' size={'5'} >
                                    Connect these pieces of information to form a deduction: who you think is the suspect, and why.
                                </Text>
                                <Text as='p' size={'5'} >
                                    Use the warmth meter and your partner, Jr. Detective Gordon to help you make your deduction.
                                </Text>
                                </Flex>
                                </Box>
                                <img src="/deduction.gif" alt="Single Player" className="md:w-1/2 sm:w-full" />
                                
                            </Flex>
                            <Flex direction={{ initial: 'column', md: 'row' }} gap="4" justify={'center'} align={'center'}>

                                <Box >
                                <Heading as="h3" size="6" mb="2">
                                    Step 4
                                </Heading>
                                <Flex direction={'column'} gap={'6'}>
                                <Text size={'5'}>Submit Your deduction and find out if you solved the crime!</Text>
                                <Text size={'5'}>If you are correct, you win! If you are incorrect, you lose.</Text>
                                <Text size={'5'}>You will get a updated leaderboard rating as well as custom badges that describe how you play</Text>
                                </Flex>
                                </Box>
                                <img src="/results.gif" alt="Single Player" className="md:w-1/2 sm:w-full" />
                                
                            </Flex>
                            <Flex direction="column" align="center" gap="4" className="">
                                <Text size={'5'}>Good Luck, Detective!</Text>
                                <Button
                                    variant='surface'
                                    size="4" 
                                    className="px-8 py-4 text-xl hover:scale-105 transition-transform"
                                    onClick={handlePlayClick}
                                >
                                    Play Now
                                </Button>
                            </Flex>
                        </Grid>
                    </Tabs.Content>
                    <Tabs.Content value="multi" mt={'5'}>
                        <Grid columns={{ sm: '2' }} gap="4" mt={'5'}>
                            <Card variant="surface" className="p-4 rounded-lg">
                                <Heading as="h3" size="3" mb="2">
                                    Step 1
                                </Heading>
                                <Text>Join a game room and wait for the game to start.</Text>
                            </Card>
                            <Card variant="surface" className="p-4 rounded-lg">
                                <Heading as="h3" size="3" mb="2">
                                    Step 2
                                </Heading>
                                <Text>Once the game starts, you will be assigned an identity and 3 pieces of evidence.</Text>
                            </Card>
                            <Card variant="surface" className="p-4 rounded-lg">
                                <Heading as="h3" size="3" mb="2">
                                    Step 3
                                </Heading>
                                <Text>When it's your turn, enter the room and interact with the interrogator.</Text>
                            </Card>
                            <Card variant="surface" className="p-4 rounded-lg">
                                <Heading as="h3" size="3" mb="2">
                                    Step 4
                                </Heading>
                                <Text>Once the interrogation ends and the voting begins, try to convince the other players that you are innocent and vote for the right culprit.</Text>

                            </Card>
                            <Card variant="surface" className="p-4 rounded-lg">
                                <Heading as="h3" size="3" mb="2">
                                    Step 5
                                </Heading>
                                <Text>After all players have been interrogated, make your final guess as to who the culprit is</Text>
                            </Card>
                            <Card variant="surface" className="p-4 rounded-lg">
                                <Heading as="h3" size="3" mb="2">
                                    Step 6
                                </Heading>
                                <Text>If the players vote for the wrong person, the culprit wins. If the players vote for the right person, the innocents win.</Text>

                            </Card>
                        </Grid>
                        <Flex justify="center" mt="8">
                            <Button 
                                variant='ghost'
                                size="4" 
                                className="px-8 py-4 text-xl hover:scale-105 transition-transform"
                                onClick={handlePlayClick}
                            >
                                Click here to play
                            </Button>
                        </Flex>
                    </Tabs.Content>
                </Tabs.Root>
            </Box>
            
            {!user && <LoginDialog open={loginDialogOpen} onOpenChange={() => setLoginDialogOpen(false)} />}
        </Box>
    );
};

export default FAQ;