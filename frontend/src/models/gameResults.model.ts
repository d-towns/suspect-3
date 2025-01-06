export interface Badge{
    badge: string;
    explanation: string;
}

export interface GameResult {
    game_room_id: string;
    user_id: string;
    old_rating: number;
    new_rating: number;
    won: boolean;
    badges: Badge[];
}