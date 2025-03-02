import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase-client';
import { createStripeCustomer } from '../lib/stripe/createCustomer';

const TokenPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuth = async () => {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const tokenHash = params.get('token_hash');
            if (tokenHash) {
                console.log('tokenHash', tokenHash);
                const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
                console.log('data', data);
                if (data.user?.email) {
                   await createStripeCustomer(data.user?.email, data.user?.id);
                }
                console.log('error', error);
                if (error) {
                    console.error('Error verifying OTP:', error);
                } else {
                    console.log('OTP verified successfully');
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
                    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
                    const { data: user } = await supabase.auth.getUser();
                    if (user.user?.email) {
                        await createStripeCustomer(user.user?.email, user.user?.id);
                    }
                    console.log('user', user);
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