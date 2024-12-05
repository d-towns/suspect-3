import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { invitesService } from '../services/invites.service';
import { Invite } from '../models/invite.model';
import moment from 'moment';
import InvitesDropdown from './InvitesDropdown';
import ProfileDropdown from './ProfileDropdown';
import { Box, Flex, Heading, Link } from '@radix-ui/themes';
import { Switch } from '@radix-ui/react-switch';
import { FaSun, FaMoon, FaMusic } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { MdMusicNote, MdMusicOff } from "react-icons/md";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const { theme, toggleTheme } = useTheme();
  const [ playing, setPlaying ] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
    <Box as="div" px="4" py="3" style={{ backgroundColor: 'var(--color-panel)' }}>
      <Flex align="center" justify="between">
        <RouterLink to="/home" style={{ textDecoration: 'none' }}>
          <Heading size="8">
            Suspect 3
          </Heading>
        </RouterLink>
        <Flex align="center" gap="6">
          <RouterLink to="/play" color="gray">
            Play
          </RouterLink>
          <RouterLink to="/faq" color="gray">
            How To Play
          </RouterLink>
          {user && (
            <>
              <InvitesDropdown invites={invites} />
              <ProfileDropdown logout={handleLogout} email={user.email} />
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} aria-label="Toggle Theme">
                {theme === 'dark' ? <FaMoon /> : <FaSun />}
              </Switch>
              <Switch checked={playing} onCheckedChange={toggleMusic} aria-label="Toggle Music">
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