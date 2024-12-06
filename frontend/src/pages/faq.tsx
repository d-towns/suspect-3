import React from 'react';
import { Box, Heading, Text, Card, Grid, Tabs} from '@radix-ui/themes';

const FAQ: React.FC = () => {

    return (
                <Box as="div" className="max-w-7xl mx-auto">
                    <Box className=" p-6 rounded-lg shadow-lg">
                        <Heading as="h2" size="8" mb="4">
                            Game Overview
                        </Heading>
                        <Text mb="4">
                            Suspect 3 is a web-based game where each player is assigned an identity and 3 out of the 6 pieces of evidence related to their case. Players have 5 minutes to convince the interrogator (a ChatGPT assistant) that they are not the one who committed the crime.
                        </Text>
                        <Text mb="4">
                            Each player enters the room one at a time and does not know what the other players have said. However, the interrogator knows all the stories and can point out inconsistencies.
                        </Text>
                        <Text mb="4">
                            The interrogator uses an algorithm that moves a float from 0.01 (innocent) to 1.00 (guilty). The game is won if the average score of the team is less than 0.30.
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
                                <Grid columns={{ sm: '2'}} gap="4" mt={'5'}>
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
                                <Grid columns={{ sm: '2'}} gap="4" mt={'5'}>
                                    <Card variant="surface" className="p-4 rounded-lg">
                                        <Heading as="h3" size="3" mb="2">
                                            Step 1
                                        </Heading>
                                        <Text>Join a multiplayer game room and invite other players.</Text>
                                    </Card>
                                    <Card variant="surface" className="p-4 rounded-lg">
                                        <Heading as="h3" size="3" mb="2">
                                            Step 2
                                        </Heading>
                                        <Text>Each player is assigned an identity and 3 pieces of evidence.</Text>
                                    </Card>
                                    <Card variant="surface" className="p-4 rounded-lg">
                                        <Heading as="h3" size="3" mb="2">
                                            Step 3
                                        </Heading>
                                        <Text>Players take turns entering the room to interact with the interrogator.</Text>
                                    </Card>
                                    <Card variant="surface" className="p-4 rounded-lg">
                                        <Heading as="h3" size="3" mb="2">
                                            Step 4
                                        </Heading>
                                        <Text>Use your evidence and identity to convince the interrogator of your innocence.</Text>
                                    </Card>
                                    <Card variant="surface" className="p-4 rounded-lg">
                                        <Heading as="h3" size="3" mb="2">
                                            Step 5
                                        </Heading>
                                        <Text>After all players have been interrogated, the results will be calculated.</Text>
                                    </Card>
                                    <Card variant="surface" className="p-4 rounded-lg">
                                        <Heading as="h3" size="3" mb="2">
                                            Step 6
                                        </Heading>
                                        <Text>The game is won if the average guilt score of the team is less than 0.30.</Text>
                                    </Card>
                                </Grid>
                            </Tabs.Content>
                        </Tabs.Root >
                        
                    </Box>
                </Box>
    );
};

export default FAQ;