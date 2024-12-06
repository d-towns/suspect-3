import React from 'react';
import { Link } from 'react-router-dom';
import {  Button, Card, Flex, Heading, Text, Inset } from '@radix-ui/themes';

const Home: React.FC = () => {
    return (
        <Flex justify="center" align="center" style={{ height: '100vh', width: '100%' }}>
            <Card size="3" variant="classic" style={{ width: '100%', maxWidth: '800px', padding: '50px'}} >
                <Inset clip="padding-box" side="top" pb="current">
                    <img
                        src="home-splash.webp"
                        alt="Suspect 3"
                        style={{
                            display: 'block',
                            objectFit: 'cover',
                            width: '100%',
                            height: 400,
                            backgroundColor: 'var(--gray-5)',
                        }}
                    />
                    </Inset>
                <Flex direction="column" gap="4" align="center" style={{maxWidth:'400px', margin:'auto'}}>
                <Heading size="9" weight="bold" mb="4" align={'center'}>Suspect 3</Heading>
                <Text size="4" mb={'3'} align={'center'}>A multiplayer game of deception and deduction</Text>
                 <Link to="/play" style={{width: '100%'}}><Button size="2" style={{width: '100%'}}> Play</Button> </Link>
                    <Link to="/faq" style={{width: '100%'}}><Button size="2" color='blue' style={{width: '100%'}}>How To Play</Button> </Link>
                    <Link to="/leaderboard" style={{width: '100%'}}><Button size="2" color='orange' style={{width: '100%'}}>Leaderboard</Button> </Link>
                </Flex>
            </Card>
        </Flex>
    );
};

export default Home;