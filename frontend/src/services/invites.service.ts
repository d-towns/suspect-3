// invites.service.ts
import axiosInstance from '../utils/axios-instance';
import { Invite } from '../models';

export const invitesService = {
  /**
   * Creates a new game invite.
   * @param senderUserId - ID of the user sending the invite.
   * @param recipentUserEmail - ID of the user receiving the invite.
   * @param GameId - ID of the game the invite is for.
   * @returns The ID of the created invite.
   */
  createInvite: async (senderUserId: string, recipentUserEmail: string, GameId: string): Promise<string> => {
    try {
      // check if invite email is valid
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipentUserEmail)) {
  throw new Error('Invalid email address');
}
      const response = await axiosInstance.post('/invites/create-invite', {
        sender_user_id: senderUserId,
        recipient_user_email: recipentUserEmail,
        game_id: GameId,
        
      });
      if (response.data.success) {
        return response.data.inviteId;
      }
      throw new Error('Failed to create invite');
    } catch (error) {
      console.error('Error creating invite:', error);
      throw error;
    }
  },

  /**
   * Retrieves invites for the authenticated user.
   * @param userEmail - The email of the authenticated user.
   * @returns An array of invites.
   */
  getInvites: async (userEmail: string): Promise<Invite[]> => {
    try {
      const response = await axiosInstance.get('/invites/get-invites', {
        params: { recipient_user_email: userEmail },
      });
      if (response.data.success) {
        return response.data.invites;
      }
      throw new Error('Failed to fetch invites');
    } catch (error) {
      console.error('Error fetching invites:', error);
      throw error;
    }
  },

  /**
   * Retrieves a specific invite by its ID.
   * @param inviteId - The ID of the invite to retrieve.
   * @returns The invite details.
   */
  getInvite: async (inviteId: string): Promise<Invite> => {
    try {
      const response = await axiosInstance.get(`/invites/get-invite/${inviteId}`);
      if (response.data.success) {
        return response.data.invite;
      }
      throw new Error('Failed to fetch invite');
    } catch (error) {
      console.error('Error fetching invite:', error);
      throw error;
    }
  },
};