import React, { createContext, useContext } from 'react';
import { useSocket } from '../../hooks/useSocket';

const SocketContext = createContext<ReturnType<typeof useSocket> | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socket = useSocket();
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};