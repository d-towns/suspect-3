import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './components/navbar';
import { AuthProvider, useAuth } from './context/auth.context';

const App: React.FC = () => {
  // const { user } = useAuth();
  // const navigate = useNavigate();
  // useEffect(() => {
  //   if (!user) {
  //     navigate('/login');
  //   }
  // }, [user]);
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;