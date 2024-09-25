class GameRoomService {
    static async createGameRoom(userId) {
        const roomId = this.generateRoomId();
        const roomData = {
            room_id: roomId,
            host_id: userId,
            players: [userId],
            created_at: new Date()
        }

        const { data, error } = await supabase
            .from('game_rooms')
            .insert([roomData]);

        if (error) {
            throw new Error("Error creating game room");
        }

        io.emit('join-room', roomId);
        return roomId;
    }

    static generateRoomId() {
        return Math.random().toString(36).substring(2, 7);
    }

    static async getGameRoom(roomId) {
        const { data, error } = await supabase
            .from('game_rooms')
            .select()
            .eq('room_id', roomId);

        if (error) {
            throw new Error("Error getting game room");
        }

        return data[0];
    }

    static async joinGameRoom(roomId, userId) {
        const room = await this.getGameRoom(roomId);
        if (!room) {
            throw new Error("Room does not exist");
        }

        const players = room.players;
        players.push(userId);

        const { data, error } = await supabase
            .from('game_rooms')
            .update({ players })
            .eq('room_id', roomId);

        if (error) {
            throw new Error("Error joining game room");
        }

        io.emit('join-room', roomId);
        return roomId;
    }
} 