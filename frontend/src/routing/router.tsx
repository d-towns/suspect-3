import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Login from '../routes/login';
import Rooms from '../routes/rooms';
import Lobby from '../routes/lobby';
import Game from '../routes/game';

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
      // Add other routes as needed
    ],
  },
]);

export default router;