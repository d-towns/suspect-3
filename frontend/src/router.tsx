import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Login from './pages/login';
import PlayMenu from './pages/playMenu';
import Lobby from './pages/lobby';
import Game from './pages/game';
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
            element: <PlayMenu />,
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