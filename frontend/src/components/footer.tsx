import React from 'react';
import { Text } from '@radix-ui/themes';
const Footer: React.FC = () => {
    return (
        <footer className='text-center my-5 lg:fixed lg:bottom-0 lg:left-1/2 lg:transform lg:-translate-x-1/2'>
            <Text className='text-xs' as='p'>&copy; {new Date().getFullYear()} Towns Capital, LLC. All rights reserved.</Text>
        </footer>
    );
};

export default Footer;