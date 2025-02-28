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
// import MiniOffenseCard from '../components/MiniOffenseCard';
import StockTicker from '../components/StockTicker';

//   location: string;
  // time: string;
  // description: string;
  // imgSrc: string;
const sampleOffenses : OffenseReportItem[] = [
  {
    location: 'The Office',
    time: '9:00 AM',
    description: 'The suspects in case #1E9Z were brought into HQ for questioning. None claimed to have seen the victim.',
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
  'Unearth the Truth',
];


const Home: React.FC = () => {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [cardsRendered, setCardsRendered] = useState(sampleOffenses.map((_, index) => {return {index: index, rendered: false}}));
  const [animatedTextsState, setAnimatedTextsState] = useState(
    sampleAnimatedTexts.map((_, i) => ({ index: i, rendered: false }))
  );
  const {user} = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
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
    }
  }, [isMobile]);





  
    return (
      <>
    {/* Mobile Stock Ticker at the top */}
    
    <Flex
      direction="column"
      align="center"
      justify="center"
      px="4"
      className='h-full rounded-lg p-9 m-auto bg-[#111110] xl:w-[600px] md:w-[500px] bg-opacity-50 backdrop-blur-sm'
    >
      <AnimatedText className='text-7xl md:text-9xl main-header ' animationSpeed={200}  message="Suspect" />
      <AnimatedText className='text-sm main-link mb-9' animationSpeed={300} message="v0.93-alpha" />
      <AnimatedText className='text-sm md:text-lg text-center main-link mb-5' animationSpeed={50} message="Solve crimes through AI voice conversation" />
      <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}

      >
      <Flex direction="row" gap="4" my="6" className='h-full z-10'>
        {user ? <Link to='/play' className='hover:scale-105 transition ease-in-out duration-200'> <Text size={{initial: '6', md: '8'}} as='span' className='main-link z-10'>Play</Text></Link> :  <Text onClick={() => setLoginDialogOpen(true)} size={{initial: '6', md: '8'}} as='span' className='main-link'>Login</Text> }
       {!user && <LoginDialog open={loginDialogOpen} onOpenChange={() => setLoginDialogOpen(false)}/>}
        {/* <Link to='/login'> <Text size={'8'} as='span' className='main-link'>Play</Text></Link> */}
        <Separator orientation="vertical" size={'2'} />
        <Link to='/faq' className='hover:scale-105 transition ease-in-out duration-200'> <Text size={{initial: '6', md: '8'}} as='span' className='main-link z-10'>How To Play</Text></Link>
      
      </Flex>
      </motion.div>
      </Flex>


            {/* Desktop random animated background - existing code */}
              
              <>
      <div className="fixed bottom-[100px] left-0 w-full z-[-5] opacity-30">
        <StockTicker direction="left" speed={30}>
          {sampleOffenses.map((offense, index) => (
            <div key={`top-${index}`} className='w-full mx-4 '>
            <OffenseReportCard key={`top-${index}`} offenseReport={offense}  />
            </div>
          ))}
          {sampleOffenses.map((offense, index) => (
            <div key={`top-${index}`} className='w-full mx-4'>
            <OffenseReportCard key={`top-${index}`} offenseReport={offense}  />
            </div>
          ))}
        </StockTicker>
      </div>

      <div className="fixed top-[100px] left-0 w-full z-[-5] opacity-30">
                <StockTicker direction="left" speed={25}>
                  {sampleAnimatedTexts.map((text, index) => (
                    <p 
                      key={`bottom-${index}`} 
                      className="mx-4 min-w-[150px] text-sm whitespace-nowrap"
                      style={{ fontFamily: 'Special Elite' }}
                    >
                      {text}
                    </p>
                  ))}
                  {sampleAnimatedTexts.map((text, index) => (
                    <p 
                      key={`bottom-repeat-${index}`} 
                      className="mx-4 min-w-[150px] text-sm whitespace-nowrap" 
                      style={{ fontFamily: 'Special Elite' }}
                    >
                      {text}
                    </p>
                  ))}
                </StockTicker>
              </div>


            </>
      </>

    );
};


export default Home;