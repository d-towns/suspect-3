import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/navbar';
import { AuthProvider } from './context/auth.context';
import { ToastProvider } from './context/ToastContext/toast.context';
import { SocketProvider } from './context/SocketContext/socket.context';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

const ThemedApp: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Theme accentColor="purple" grayColor="sand" radius="large" scaling="95%" appearance={theme}>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Outlet />
        </main>
      </div>
    </Theme>
  );
};

export default App;
