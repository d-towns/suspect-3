import React from 'react';
import { Text } from '@radix-ui/themes';
import './footer.css';
const Footer: React.FC = () => {
    return (
        <footer className='text-center my-5'>
            <Text size={'3'} color='gray' className='' as='p'> <a href='https://x.com/dennis_exe_'>@dennis_exe_</a></Text>
        </footer>
    );
};

export default Footer;