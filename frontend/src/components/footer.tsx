import React from 'react';
import { Text, Separator} from '@radix-ui/themes';
import './footer.css';
import { Link } from 'react-router-dom';
import { FaXTwitter } from "react-icons/fa6";
import { FaEnvelope, FaLinkedin } from "react-icons/fa";
const Footer: React.FC = () => {
    return (
        <footer className='text-center my-5 flex justify-center items-center'>
            <Text size={'3'} color='gray' className='' as='p'> <a href='https://x.com/dennis_exe_'><FaXTwitter/></a></Text>
            <Separator orientation='vertical' className='mx-3' />
            <Text size={'3'} color='gray' className='' as='p'> <a href='https://www.linkedin.com/in/dennis-towns-0817a8131/'><FaLinkedin/></a></Text>
            <Separator orientation='vertical' className='mx-3' />
            <Text size={'3'} color='gray' className='' as='p'> <a href='mailto:dennis@dennistowns.com'><FaEnvelope/></a></Text>
            <Separator orientation='vertical' className='mx-3' />
            <Text size={'3'} color='gray' className='' as='p'> <Link to='/terms'> Legal</Link></Text>
            <Separator orientation='vertical' className='mx-3' />
            <Text size={'3'} color='gray' className='' as='p'><Link to='/changelog'> Changelog</Link></Text>
        </footer>
    );
};

export default Footer;