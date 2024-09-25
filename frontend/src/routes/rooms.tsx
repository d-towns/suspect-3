import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsService } from '../services/rooms.service';
import { supabase } from '../db/supabase-client';
interface Room {
  id: string;
  players: string[];
}

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
    fetchRooms();

    const roomsSubscription = supabase
      .channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    return () => {
      supabase.removeChannel(roomsSubscription);
    };
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user.email) {
      navigate('/');
      return;
    }

    setUserId(session.user.id);
    setUserEmail(session.user.email);
  };

  const fetchRooms = async () => {
    try {
      const fetchedRooms = await roomsService.fetchRooms();
      setRooms(fetchedRooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const createRoom = async () => {
    if (!userId) return;
    try {
      const roomId = await roomsService.createRoom(userId);
      joinRoom(roomId);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!userId) return;
    try {
      await roomsService.joinRoom(roomId, userId);
      alert(`You've joined room ${roomId}`);
      navigate(`/lobby/${roomId}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room: ' + (error as Error).message);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div>
      <nav>
        <a href="/rooms">Game Rooms</a>
        <a href="/">Sign Up</a>
        <button onClick={logout}>Logout</button>
        <span id="userInfo">Logged in as: {userEmail}</span>
      </nav>
      <h1>Game Rooms</h1>
      <button onClick={createRoom}>Create New Room</button>
      <ul>
        {rooms.map(room => (
          <li key={room.id}>
            Room {room.id} - Players: {room.players.length}
            <button onClick={() => joinRoom(room.id)}>Join</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Rooms;