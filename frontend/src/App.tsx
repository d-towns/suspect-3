import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/navbar';
import { AuthProvider } from './context/auth.context';

const App: React.FC = () => {
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
