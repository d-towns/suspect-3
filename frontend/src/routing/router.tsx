import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Login from '../pages/login';
import PlayMenu from '../pages/playMenu';
import Lobby from '../pages/lobby';
import Game from '../pages/game';
import SingleGame from '../pages/singleGame';
import ProtectedRoute from './protected-route';
import FAQ from '../pages/faq';
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
        path: 'terms',
        element: <Terms />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'play',
            element: <PlayMenu />,
          },
          {
            path: 'leaderboard',
            element: <Leaderboard />,
          },
          {
            path: 'lobby/:roomId',
            element: <Lobby />,
          },
          {
            path: 'game/:roomId',
            element: <SingleGame />,
          },
        ],
      },
    ],
  },
]);

export default router;