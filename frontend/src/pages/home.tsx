import React from 'react';
import { Link } from 'react-router-dom';
import {  Button, Card, Flex, Heading, Text, Inset, Separator } from '@radix-ui/themes';
import './home.css'
import AnimatedText from '../components/animatedText';



const Home: React.FC = () => {
    return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      style={{ minHeight: '100vh' }}
      px="4"
    >
      <AnimatedText className='text-9xl main-header mb-5'  message="Suspect" />
      <Flex direction="row" gap="4" mb="6">
        <Link to='/play'> <Text size={'8'} as='span' className='main-link'>Play</Text></Link>
        <Separator orientation="vertical" size={'4'} />
        <Link to='/faq'> <Text size={'8'} as='span' className='main-link'>How To Play</Text></Link>
        <Separator orientation="vertical" size={'4'} />
        <Link to='/leaderboard'> <Text size={'8'} as='span' className='main-link'>Leaderboard </Text></Link>
      </Flex>
      </Flex>
    );
};

export default Home;