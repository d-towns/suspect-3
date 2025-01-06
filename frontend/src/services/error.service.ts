import { supabase } from "../utils/supabase-client";



export const errorService = {
    /**
     * Logs an error to the console and sends it to the server.
     * @param error - The error to log.
     */
    logError: async (error: Error): Promise<void> => {
        console.error(error);
        console.error('Logging error:', await supabase.auth.getUser());
        try {
        const { data, error: supabaseError } = await supabase
            .from('errors')
            .insert([{ message: error.message }])
            .select();
        if (supabaseError) {
            console.error('Failed to log error:', supabaseError);
        }
        console.log('Logged error:', data);
        } catch (error) {
        console.error('Failed to log error:', error);
        }
    },
    };
