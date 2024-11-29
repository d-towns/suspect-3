import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { useAuth } from '../context/auth.context';

type Mode = 'single' | 'multi' | null;

interface ChooseGameProps {
  createRoom: () => void;
  roomToJoinId: string;
  setRoomToJoinId: React.Dispatch<React.SetStateAction<string>>;
  navigateToRoom: (roomId: string) => void;
}

const ChooseGame: React.FC<ChooseGameProps> = ({
  createRoom,
  roomToJoinId,
  setRoomToJoinId,
  navigateToRoom,
}: ChooseGameProps) => {
  return (
    <div className="z-20 bg-gray-100 p-6 rounded-lg shadow-lg w-2/3 max-w-md">
      <div className="flex flex-col justify-evenly h-full items-center gap-6">
        <div className="mb-6 h-full">
          <div
            onClick={createRoom}
            className="w-full h-full flex flex-col gap-12 justify-center p-9 bg-gray-200 transition ease-in-out duration-200 border-gray-400 shadow-lg transition ease-in-out border border-transparent rounded-md shadow-sm text-sm font-medium text-black hover:bg-focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <p className=' text-center text-3xl'> Create New Game Room</p>
            
          </div>
        </div>
        <div className="overflow-hidden sm:rounded-md">

          <div className="mb-6">
            <div
              className="w-full h-full flex flex-col justify-center p-9 bg-gray-200 transition ease-in-out duration-200  border-gray-400 shadow-lg transition ease-in-out border border-transparent rounded-md shadow-sm text-sm font-medium text-black hover:bg-focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <p className='pb-4 text-center text-3xl'> Join Room</p>

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
  );
};

interface ModeCardProps {
  setMode: (mode: Mode) => void;
  mode: Mode;
  chooseGameProps: ChooseGameProps;
}

const SinglePlayerCard: React.FC<ModeCardProps> = ({ setMode, mode, chooseGameProps }) => {
  return (
    <div
      className="relative w-1/2 h-screen flex-shrink-0 cursor-pointer"
      onClick={() => setMode('single')}
    >
      <img
        src="single-player-splash-2.webp"
        alt="Single Player"
        className={`absolute top-0 left-0 w-full h-full object-cover hover:opacity-100 opacity-60 ${mode === 'single' && 'opacity-100'}`}
      />
      {mode === 'single' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ChooseGame {...chooseGameProps} />
        </div>
      )}
    </div>
  );
};

const MultiplayerCard: React.FC<ModeCardProps> = ({ setMode, mode, chooseGameProps }) => {
  return (
    <div
      className="relative w-1/2 h-screen flex-shrink-0 cursor-pointer"
      onClick={() => setMode('multi')}
    >
      <img
        src="multi-player-splash.webp"
        alt="Multiplayer"
        className={`absolute top-0 left-0 w-full h-full object-cover hover:opacity-100 opacity-60 ${mode === 'multi' && 'opacity-100'} `}
      />
      {mode === 'multi' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ChooseGame {...chooseGameProps} />
        </div>
      )}
    </div>
  );
};

const PlayMenu: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomToJoinId, setRoomToJoinId] = useState<string>('');
  const [mode, setMode] = useState<Mode>(null);

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
    if (room) navigate(`/lobby/${roomId}`);
    else {
      alert('Room not found');
    }
  };

  const cardProps = {
    roomToJoinId,
    setRoomToJoinId,
    navigateToRoom,
    createRoom,
  };

  return (
    <section className="flex h-screen">
      <SinglePlayerCard setMode={setMode} mode={mode} chooseGameProps={cardProps} />
      <MultiplayerCard setMode={setMode} mode={mode} chooseGameProps={cardProps} />
    </section>
  );
};

export default PlayMenu;
