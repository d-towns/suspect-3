import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { invitesService } from '../services/invites.service';
import { Invite } from '../models/invite.model';
import moment from 'moment';
import InvitesDropdown from './InvitesDropdown';
import ProfileDropdown from './ProfileDropdown';
import { Box, Flex, Text } from '@radix-ui/themes';
import { Switch } from '@radix-ui/react-switch';
import { MdMusicNote, MdMusicOff } from "react-icons/md";
import './navbar.css';


const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [ playing, setPlaying ] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const fetchInvites = async () => {
      if (user) {
        const userInvites = await invitesService.getInvites(user.email);
        setInvites(userInvites);
        userInvites.forEach((invite) => {
          const inviteExpiration = moment.utc(invite.expires_at);
          const currentTime = moment.utc();
          if (inviteExpiration.isBefore(currentTime)) {
            console.log(`Invite ${invite.id} is expired`);
          }
        });
      }
    };
    fetchInvites();
  }, [user]);

  useEffect(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.play().catch(error => console.log("Audio playback failed:", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [playing]);

  const toggleMusic = () => {
    setPlaying(!playing);
  };

  return (
    <Box as="div" px="4" py="3" style={{ backgroundColor: 'var(--color-panel)' }} className=''>
      <Flex align="center" justify="between" >
        <RouterLink to="/">
          <Text className="hover:scale-110 transition ease-in-out main-header md:text-2xl xs:text-xl"size="8">
            Suspect
          </Text>
        </RouterLink>
        <Flex align="center" justify={'center'} gap="6" className='md:text-2xl xs:text-xl'>
          <RouterLink className='hover:scale-110 transition ease-in-out duration-200 main-header'  to="/play" color="gray">
           <Text>Play</Text> 
          </RouterLink>
          <RouterLink className='hover:scale-110 transition duration-200  ease-in-out main-header'  to="/faq" color="gray">
            How To Play
          </RouterLink>
          <RouterLink className='hover:scale-110 transition duration-200  ease-in-out main-header'  to="/leaderboard" color="gray">
            Leaderboard
          </RouterLink>
          {user && (
            <>
              <InvitesDropdown invites={invites} />
              <ProfileDropdown logout={handleLogout} username={user.username || user.email} />
              <Switch  className='hover:scale-110 transition ease-in-out' checked={playing} onCheckedChange={toggleMusic} aria-label="Toggle Music">
                {playing ? <MdMusicNote size={24} /> : <MdMusicOff size={24}/>}
              </Switch>
            </>
          )}
        </Flex>
        <audio ref={audioRef} id="background-music" src="/ominous-tension-157906.mp3" loop />
      </Flex>
    </Box>
  );
};

export default Navbar;