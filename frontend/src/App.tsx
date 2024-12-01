import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './components/navbar';
import { AuthProvider, useAuth } from './context/auth.context';
import {ToastProvider} from './context/ToastContext/toast.context';
import { SocketProvider } from './context/SocketContext/socket.context';


const App: React.FC = () => {
  return (
    <ToastProvider>
    <AuthProvider>
      <SocketProvider>
      
        
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Outlet />
        </main>
      </div>
      </SocketProvider>
    </AuthProvider>
    </ToastProvider>
  );
};

export default App;
