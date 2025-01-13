import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { Box, Card, Inset, Text, Dialog, Button } from '@radix-ui/themes';
import AnimatedText from '../components/animatedText';
import Loading from '../components/loading';
import { useSocketContext } from '../context/SocketContext/socket.context';

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const {isConnected, connectSocket } = useSocketContext();
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 640);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <Loading />
    );
  }

  if (!isConnected) {
    return (
      <Dialog.Root open={!isConnected}>
        <Dialog.Content className='flex flex-col items-center justify-center'>
          <Dialog.Title className="mb-4">
            <AnimatedText message="Disconnected from server" className='dialogHeader' animationSpeed={80} />
          </Dialog.Title>
          <Dialog.Description className="mb-4">
            <Text size="3" align="center">
              Reconnect to server to continue playing
            </Text>

          </Dialog.Description>
          <Button
            className="mt-4"
            onClick={connectSocket}
            >
            Reconnect
            </Button>
        </Dialog.Content>
      </Dialog.Root>
    )
    }


  if (isMobile) {
    return (
      <Box className='flex justify-center h-[80vh] p-4 items-center'>
        <Card variant='surface' className=" p-4 text-center h-[450px] flex flex-col items-center">
          <Inset>
            <img src="/single-player-splash.webp" alt="Single Player Splash" />
          </Inset>
          <Text size="3" align="center" mt="6">
            <AnimatedText message="Suspect is a desktop only experience detective!" animationSpeed={100} />
          </Text>
        </Card>
      </Box>
    );
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;