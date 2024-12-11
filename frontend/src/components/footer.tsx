import React from 'react';
import { Text } from '@radix-ui/themes';
const Footer: React.FC = () => {
    return (
        <footer className='text-center mb-5'  >
            <Text as='p'>&copy; {new Date().getFullYear()} Towns Capital, LLC. All rights reserved.</Text>
        </footer>
    );
};

export default Footer;