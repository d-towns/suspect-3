// invites.service.ts
import axiosInstance from '../utils/axios-instance';
import { Invite } from '../models';
import { supabase } from '../utils/supabase-client';
import moment from 'moment';

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

      const createInviteCode = () => {
        // create a random 6 character alphanumeric string
        return Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      const inviteData = {
        sender_user_id: senderUserId,
        recipient_user_email: recipentUserEmail,
        game_id: GameId,
        accepted: false,
        created_at: moment.utc().toISOString(), // Use moment.utc()
        invite_code: createInviteCode(),
        // expires in 15 minutes
        expires_at: moment.utc().add(15, 'minutes').toISOString(), // Use moment.utc().add()
      };
      console.log('Created at:', inviteData.created_at);
      console.log('Expires at:', inviteData.expires_at);

      const { data, error } = await supabase
        .from('invites')
        .insert([inviteData])
        .select()
        .single();

      if (error) {
        throw new Error('Failed to create invite');
      }
      return data.id;
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
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('recipient_user_email', userEmail);

      if (error) {
        throw new Error('Failed to fetch invites');
      }
      return data;
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