import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';
import { GameRoom } from '../models';
import { useSocket } from '../hooks/useSocket';

const Rooms: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const initializeComponent = async () => {
      if (!loading) {
        if (!user) {
          navigate('/login');
        } else {
          try {
            console.log('Fetching rooms');
            const fetchedRooms = await roomsService.fetchRooms();
            setRooms(fetchedRooms);
            console.log('Rooms fetched:', fetchedRooms);
          } catch (error) {
            console.error('Error initializing component:', error);
          }
        }
      }
    };

    initializeComponent();
  }, [user, loading, navigate]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('room-created', (newRoom: GameRoom) => {
        setRooms(prevRooms => [...prevRooms, newRoom]);
      });

      socket.on('room-updated', (updatedRoom: GameRoom) => {
        setRooms(prevRooms =>
          prevRooms.map(room => (room.id === updatedRoom.id ? updatedRoom : room))
        );
      });

      socket.on('room-deleted', (deletedRoomId: string) => {
        setRooms(prevRooms => prevRooms.filter(room => room.id !== deletedRoomId));
      });

      return () => {
        socket.off('room-created');
        socket.off('room-updated');
        socket.off('room-deleted');
      };
    }
  }, [socket, isConnected]);

  const createRoom = async () => {
    if (!user) return;
    try {
      const roomId = await roomsService.createRoom(user.id);
      joinRoom(roomId);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error creating room: ' + (error as Error).message);
    }
  };

  const joinRoom = async (roomId: string) => {
    console.log('Joining room:', roomId);
    console.log('User:', user);
    if (!user || !socket) return;
    try {
      socket.emit('join-room', { roomId, userId: user.id, userEmail: user.email }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          console.log('Joined room:', roomId);
          navigate(`/lobby/${roomId}`);
        } else {
          console.error('Failed to join room:', response.error);
          alert('Failed to join room: ' + response.error);
        }
      });
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-8">Game Rooms</h1>
        <div className="mb-6">
          <button
            onClick={createRoom}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create New Room
          </button>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {rooms.map(room => (
              <li key={room.id}>
                <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-indigo-600 truncate">Room {room.id}</div>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Players: {room.players?.length || 0}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <button
                      onClick={() => joinRoom(room.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition ease-in-out duration-150"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {rooms.length === 0 && (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                No rooms available. Create one!
              </li>
            )}
          </ul>
        </div>
        {/* Optionally, display connection status */}
        {!isConnected && (
          <div className="mt-4 text-center text-red-500">
            Socket not connected. Please refresh the page.
          </div>
        )}
      </div>
    </div>
  );
};

export default Rooms;