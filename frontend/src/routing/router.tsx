import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import PlayMenu from '../pages/playMenu';
import Lobby from '../pages/lobby';
import RenderGame from '../pages/renderGame';
import ProtectedRoute from './protected-route';
import FAQ from '../pages/faq';
import Leaderboard from '../pages/leaderboard';
import Terms from '../pages/terms';
import Home from '../pages/home';
import Profile from '../pages/profile';
import TokenPage from '../pages/token';
import ErrorBoundary from '../pages/errorBoundary';
import { ThemeProvider } from '../context/ThemeContext';
import Changelog from '../pages/changelog';
import Subscriptions from '../pages/Subscriptions';

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
        path: 'faq',
        element: <FAQ />,
      },
      {
        path: 'changelog',
        element: <Changelog />
      },
      {
        path: 'terms',
        element: <Terms />,
      },
      {path: 'token', element: <TokenPage />},
      {
        path: 'subscriptions',
        element: <Subscriptions />,
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
          {
            path: 'profile',
            element: <Profile/>
          }
        ],
      },
    ],
    errorElement:<ThemeProvider><ErrorBoundary /></ThemeProvider> 
  },
]);

export default router;