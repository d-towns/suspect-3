import React from 'react';
import { Box, Flex, Text, Heading } from '@radix-ui/themes';
import AnimatedText from '../components/animatedText';
import SubscriptionCard from '../components/SubscriptionCard';

const Subscriptions: React.FC = () => {
  const cadetFeatures = [
    '5 game credits per month',
    'Standard detective experience',
    'Access to single player mode'
  ];

  const detectiveFeatures = [
    '<strong>10 game credits</strong> per month',
    'Access to <strong>multiplayer mode</strong>',
    'Invite free users to your multiplayer games',
    'Premium detective features'
  ];

  return (
    <Box className="max-w-7xl mx-auto p-4">
      <Flex direction="column" gap="6" align="center" mb="6">
        <Heading size="9" className="game-heading text-center">
          <AnimatedText message="Choose Your Plan" animationSpeed={100} />
        </Heading>
        <Text size="5" className="text-center max-w-2xl">
          Subscribe to get more game credits and unlock advanced features to enhance your detective experience.
        </Text>
      </Flex>

      <Flex 
        direction={{ initial: 'column', md: 'row' }} 
        gap="6" 
        justify="center" 
        align="stretch"
        className="w-full"
        style={{ minHeight: '500px' }}
      >
        <SubscriptionCard 
          title="Cadet Plan"
          price={10}
          features={cadetFeatures}
          buttonText="Subscribe Now"
          priceId={import.meta.env.VITE_STRIPE_CADET_PRICE_ID}
        />

        <SubscriptionCard 
          title="Detective Plan"
          price={20}
          features={detectiveFeatures}
          buttonText="Upgrade Now"
          priceId={import.meta.env.VITE_STRIPE_DETECTIVE_PRICE_ID}
          isBestValue={true}
          buttonVariant="solid"
        />
      </Flex>
      
      <Box className=" p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-surface-dim)' }}>
        <Text size="3" align="center">
          Game credits refresh monthly. Unused credits will roll over.
          <br />
          Cancel your subscription anytime.
        </Text>
      </Box>
    </Box>
  );
};

export default Subscriptions; 