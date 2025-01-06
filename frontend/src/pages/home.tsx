import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flex, Text, Separator } from '@radix-ui/themes';
import './home.css'
import AnimatedText from '../components/animatedText';
import { AnimatePresence, motion } from "motion/react"
import { OffenseReportCard } from '../components/OffenseCard';
import { OffenseReportItem } from '../models/game-state.model';
import { useAuth } from '../context/auth.context';
import LoginDialog from './login';

//   location: string;
  // time: string;
  // description: string;
  // imgSrc: string;
const sampleOffenses : OffenseReportItem[] = [
  {
    location: 'The Office',
    time: '9:00 AM',
    description: 'The suspects in case #1E9Z were brought into HQ for questioning. None of them claimed to have seen the victim.',
    imgSrc: '/multi-player-splash.webp'
  },
  {
    location: 'The Interrogation Room',
    time: '9:00 AM',
    description: 'Suspect #UK3 was brought in for questioning. Their alibi was loose and they were seen near the crime scene.',
    imgSrc: '/single-player-splash.webp'
  },
  {
    location: 'The Bozeman Hotel',
    time: '9:00 AM',
    description: 'The suspect entered the hotel at 9:00 AM and left at 9:30 AM. The victim was found dead at 9:15 AM.',
    imgSrc: '/backdoor.webp'
  }
];


const sampleAnimatedTexts = [
  'Unravel Clues',
  'Unmask Suspects',
  'Unearth the Truth'
];


const Home: React.FC = () => {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [cardsRendered, setCardsRendered] = useState(sampleOffenses.map((_, index) => {return {index: index, rendered: false}}));
  const [animatedTextsState, setAnimatedTextsState] = useState(
    sampleAnimatedTexts.map((_, i) => ({ index: i, rendered: false }))
  );
  const {user} = useAuth();

  useEffect(() => {
  let currentTextIndex = 0;
  const textIntervalId = setInterval(() => {
    const updated = animatedTextsState.map((item, index) => ({
      ...item,
      rendered: index === currentTextIndex
    }));
    setAnimatedTextsState(updated);
    currentTextIndex = (currentTextIndex + 1) % animatedTextsState.length;
  }, 4000);

  let currentCardIndex = 0;
  const cardsIntervalId = setInterval(() => {
    const newCardsRendered = cardsRendered.map((item, index) => ({
      ...item,
      rendered: index === currentCardIndex
    }));
    setCardsRendered(newCardsRendered);
    currentCardIndex = (currentCardIndex + 1) % cardsRendered.length;
  }, 4000);

  return () => {
    clearInterval(textIntervalId);
    clearInterval(cardsIntervalId);
  }
}, []);





  
    return (
      <>
    <Flex
      direction="column"
      align="center"
      justify="center"
      px="4"
    >

      <AnimatedText className='text-7xl md:text-9xl main-header mb-5' animationSpeed={200}  message="Suspect" />
      <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}

      >
      <Flex direction="row" gap="4" mb="6" className='h-full z-10'>
        {user ? <Link to='/play'> <Text size={{initial: '6', md: '8'}} as='span' className='main-link'>Play</Text></Link> :  <Text onClick={() => setLoginDialogOpen(true)} size={{initial: '6', md: '8'}} as='span' className='main-link'>Login</Text> }
       {!user && <LoginDialog open={loginDialogOpen} onOpenChange={() => setLoginDialogOpen(false)}/>}
        {/* <Link to='/login'> <Text size={'8'} as='span' className='main-link'>Play</Text></Link> */}
        <Separator orientation="vertical" size={'2'} />
        <Link to='/faq'> <Text size={{initial: '6', md: '8'}} as='span' className='main-link z-10'>How To Play</Text></Link>
        <Separator orientation="vertical" size={'2'} />
        <Link to='/leaderboard'> <Text size={{initial: '6', md: '8'}}as='span' className='main-link'>Leaderboard </Text></Link>
      </Flex>
      </motion.div>
      </Flex>

            {sampleOffenses.map((offense, index) => (
        <div className='absolute h-fit top-0 left-0 z-[-10]' key={index}>
          <AnimatePresence>
{cardsRendered[index].rendered &&
        <motion.div
          initial={{
            opacity: 0,
            ...(Math.random() > 0.5 ? { x: 100} : { y: Math.random() * 400 })
          }}
          
          animate={{ opacity: .20, x: 100, y: Math.random() * 400 }}
          exit={{
            opacity: 0,
            ...(Math.random() > 0.5 ? { x: -100 } : { y: -100 })
          }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        >
          <OffenseReportCard key={index} offenseReport={offense}  />
        </motion.div>
}
        </AnimatePresence>
        </div>
        ))}
                <>
        {sampleAnimatedTexts.map((text, i) => (
          <div className='absolute h-fit z-[-10]' key={i}>
          <AnimatePresence key={i}>
            {animatedTextsState[i].rendered && (
              <motion.div
                initial={{
                  opacity: 0,
                  ...(Math.random() > 0.5
                    ? { x: Math.random() * 100 }
                    : { y: Math.random() * 700 })
                }}
                animate={{
                  opacity: 0.2,
                  x: Math.random() * 100,
                  y: Math.random() * 700
                }}
                exit={{
                  opacity: 0,
                  ...(Math.random() > 0.5 ? { x: -100 } : { y: -100 })
                }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              >
                <AnimatedText
                  className='text-5xl main-link '
                  animationSpeed={200}
                  message={text}
                />
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        ))}
      </>
      </>

    );
};


export default Home;