import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase-client';

const TokenPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuth = async () => {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const tokenHash = params.get('token_hash');
            if (tokenHash) {
                const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
                if (error) {
                    console.error('Error verifying OTP:', error);
                } else {
                    navigate('/play');
                }
            } else {
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    // Set the secure cookie named 'token'
                    localStorage.setItem('access_token', accessToken);
                    localStorage.setItem('refresh_token', refreshToken);
                    
                    document.cookie = `token=${accessToken}; Secure; Path=/; Domain=${import.meta.env.VITE_NODE_ENV === 'dev' ? import.meta.env.VITE_DEV_FRONTNED_URL : import.meta.env.VITE_PROD_FRONTNED_URL };`;
                    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
                    // Redirect to /play
                    navigate('/play');
                }
            }
        };

        handleAuth();
    }, [navigate]);

    return null;
};

export default TokenPage;