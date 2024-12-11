import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Login from '../pages/login';
import PlayMenu from '../pages/playMenu';
import Lobby from '../pages/lobby';
import Game from '../pages/game';
import ProtectedRoute from './protected-route';
import FAQ from '../pages/faq';
import Home from '../pages/home';
import Leaderboard from '../pages/leaderboard';
import Terms from '../pages/terms';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <Login />,
      },
      {
        path: 'faq',
        element: <FAQ />,
      },
      {
        path: 'leaderboard',
        element: <Leaderboard />,
      },
      {
        path: 'terms',
        element: <Terms />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'home', 
            element: <Home />,
          },
          {
            path: 'play',
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