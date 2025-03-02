import React from 'react';
import { Card, Flex, Text, Heading, Button, Badge, Separator, Box } from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';
import { MdCheck, MdStar } from 'react-icons/md';
import stripe from '../lib/stripe/client';
import { useAuth } from '../context/auth.context';

interface SubscriptionCardProps {
  title: string;
  price: number;
  period?: string;
  features: string[];
  buttonText: string;
  buttonLink: string;
  isBestValue?: boolean;
  buttonVariant?: 'solid' | 'soft' | 'outline' | 'ghost';
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  title,
  price,
  period = '/month',
  features,
  buttonText,
  isBestValue = false,
  buttonVariant = 'soft'
}) => {
  const navigate = useNavigate();
  const {user } = useAuth();
  const createCheckoutSession = async () => {

    if (!user) {
      navigate('/login');
      return;
    }

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      line_items: [
        {
          price: 'price_1QxwngJZ71LDJbxgtWhXuzey',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${import.meta.env.VITE_NODE_ENV === 'dev' ? 'http://localhost:5173' : 'https://www.playsuspect.com'}/play`,
      cancel_url: `${import.meta.env.VITE_NODE_ENV === 'dev' ? 'http://localhost:5173' : 'https://www.playsuspect.com'}/play`,
    });

    if (session.url) {
      window.location.href = session.url;
    }
  }
  return (
    <Box position="relative" className="w-full md:w-1/2 max-w-md">
      {isBestValue && (
        <Box 
          style={{ 
            position: 'absolute', 
            top: '-12px', 
            right: '20px',
            zIndex: 10
          }}
        >
          <Badge size="2" color="orange" variant="solid" radius="full">
            <Flex gap="1" align="center">
              <MdStar size={16} />
              Best Value
            </Flex>
          </Badge>
        </Box>
      )}
      
      <Card 
        size="3" 
        className="w-full transition duration-300" 
        style={{ 
          height: '400px', 
          display: 'flex', 
          flexDirection: 'column',
          ...(isBestValue && {
            border: '2px solid var(--accent-9)',
            position: 'relative',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)'
          })
        }}
      >
        <Flex direction="column" gap="4" style={{ height: '100%' }}>
          <Heading size="6" align="center">{title}</Heading>
          <Separator size="4" />
          
          <Flex justify="center" align="baseline" gap="2">
            <Text size="8" weight="bold">${price}</Text>
            <Text size="3" color="gray">{period}</Text>
          </Flex>
          
          <Flex direction="column" gap="3" style={{ flexGrow: 1 }}>
            {features.map((feature, index) => (
              <Flex key={index} gap="2" align="center">
                <MdCheck className="text-green-500" size={20} />
                <Text dangerouslySetInnerHTML={{ __html: feature }} />
              </Flex>
            ))}
          </Flex>
          
          <Box mt="auto" pt="4">
            <Button size="3" variant={buttonVariant} onClick={createCheckoutSession} className="w-full" asChild>
              <Text>{buttonText}</Text>
            </Button>
          </Box>
        </Flex>
      </Card>
    </Box>
  );
};

export default SubscriptionCard; 