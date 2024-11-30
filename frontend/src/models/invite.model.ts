export interface Invite {
    id: string;
    sender_user_id: string;
    recipient_user_email: string;
    game_id: string;
    accepted: boolean;
    invite_code: string;
    expires_at: string;
}