import React from 'react';
import { Box, Heading, Text, Card, Grid, Tabs } from '@radix-ui/themes';
import './faq.css';

const FAQ: React.FC = () => {

    return (
        <Box as="div" className="max-w-7xl mx-auto">
            <Box className=" p-6 rounded-lg shadow-lg game-heading">
                <Heading as="h2" size="8" mb="4" className='game-heading'>
                    Game Overview
                </Heading>
                <Text mb="4" size={'8'}>
                    Suspect is a mystery game about deception and deduction. We use LLM's to create unique crime scenarios that the players take part in via real-time voice communication either as a detective or a suspect.
                </Text>
            </Box>
            <Box className=" p-6 rounded-lg shadow-lg mt-6 w-full">
                <Heading as="h2" size="6" mb="4">
                    How to Play
                </Heading>
                <Tabs.Root defaultValue="single" aria-label="Game Mode Tabs">
                    <Tabs.List>
                        <Tabs.Trigger value="single">Single Player</Tabs.Trigger>
                        <Tabs.Trigger value="multi">Multiplayer</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="single">
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
                                <Text>Use the evidence to interrogate each Ai suspect that enters the room.</Text>
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
                                <Text>If your choice is correct, you win! If you don't...hand in your badge detective!</Text>
                            </Card>
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
                    </Tabs.Content>
                </Tabs.Root >

            </Box>
        </Box>
    );
};

export default FAQ;