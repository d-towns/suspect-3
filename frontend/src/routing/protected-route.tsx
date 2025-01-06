import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { Box, Card, Inset, Text } from '@radix-ui/themes';
import AnimatedText from '../components/animatedText';

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 640);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <h3 className="text-xl font-semibold">Loading...</h3>
      </div>
    );
  }

  if (isMobile) {
    return (
      <Box className='flex justify-center h-[80vh] p-4 items-center'>
        <Card variant='surface' className=" p-4 text-center h-[450px] flex flex-col items-center">
          <Inset>
            <img src="/single-player-splash.webp" alt="Single Player Splash" />
          </Inset>
          <Text size="3" align="center" mt="6">
              <AnimatedText message="Suspect is a desktop only experience detective!" animationSpeed={100}  />
            </Text>
        </Card>
        </Box>
    );
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;