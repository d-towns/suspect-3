import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';

const PlayMenu: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [roomToJoinId, setRoomToJoinId] = useState<string>('');

  const createRoom = async () => {
    if (!user) return;
    try {
      const roomId = await roomsService.createRoom(user.id);
      navigate(`/lobby/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error creating room: ' + (error as Error).message);
    }
  };

  const navigateToRoom = async (roomId: string) => {
    const room = await roomsService.getRoom(roomId);
    if(room) navigate(`/lobby/${roomId}`);
    else {
      alert('Room not found');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl min-h-screen  mx-auto">
        <h1 className="text-center text-3xl font-extrabold text-gray-900 mb-8">Play</h1>
        <div className="flex justify-evenly h-full items-center gap-6">
          <div className="mb-6 h-full">
            <div
              onClick={createRoom}
              className="w-full h-full flex flex-col gap-12 justify-center p-9 bg-gray-100 border-gray-400 shadow-lg transition ease-in-out border border-transparent rounded-md shadow-sm text-sm font-medium text-black hover:bg-focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <p className='pb-4 text-center text-3xl'> Create Game Room</p>
              <p className='pb-24 text-center'> Create a new game with a unique scenario and player identies!</p>
            </div>
          </div>
          <p className='font-bold'> OR </p>
          <div className="overflow-hidden sm:rounded-md">

            <div className="mb-6">
            <div
              className="w-full h-full flex flex-col justify-center p-9 bg-gray-100 border-gray-400 shadow-lg transition ease-in-out border border-transparent rounded-md shadow-sm text-sm font-medium text-black hover:bg-focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                            <p className='pb-4 text-center text-3xl'> Join Room</p>
                            <p className='pb-12 text-center'>Enter the Game room ID and join your friends for a game</p>
              <input
                type="text"
                placeholder="Enter Room ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={roomToJoinId}
                onChange={(e) => setRoomToJoinId(e.target.value)}
              />
              <button
                onClick={() => navigateToRoom(roomToJoinId)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-2"
              >
                Join Room
              </button>
            </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayMenu;