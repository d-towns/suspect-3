import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Login from '../pages/login';
import PlayMenu from '../pages/playMenu';
import Lobby from '../pages/lobby';
import RenderGame from '../pages/renderGame';
import ProtectedRoute from './protected-route';
import FAQ from '../pages/faq';
import Leaderboard from '../pages/leaderboard';
import Terms from '../pages/terms';
import Home from '../pages/home';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '',
        element: <Home />,
      },
      {
        path: 'login',
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
            element: <RenderGame />,

          },
        ],
      },
    ],
  },
]);

export default router;