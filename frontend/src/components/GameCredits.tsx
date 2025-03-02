import { useEffect, useState } from 'react';
import { Text } from '@radix-ui/themes';
import { useAuth } from '../context/auth.context';
import { subscriptionsService } from '../services/subscriptions.service';

const GameCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    const fetchCredits = async () => {
      if (user?.id) {
        try {
            console.log('Fetching game credits for user:', user.id);
          const gameCredits = await subscriptionsService.getGameCredits(user.id);
          setCredits(gameCredits);
        } catch (error) {
          console.error('Error fetching game credits:', error);
        }
      }
    };

    fetchCredits();
  }, [user]);

  return (
    <Text>
      Game Credits: {credits}
    </Text>
  );
};

export default GameCredits;
