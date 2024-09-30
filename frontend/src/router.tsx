import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './routes/login';
import Rooms from './routes/rooms';
import Lobby from './routes/lobby';
import Game from './routes/game';
import ProtectedRoute from './routing/protected-route';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'rooms',
            element: <Rooms />,
          },
          {
            path: 'lobby/:roomId',
            element: <Lobby />,
          },
          {
            path: 'game/:roomId',
            element: <Game />,
          },
        ],
      },
    ],
  },
]);

export default router;