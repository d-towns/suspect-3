import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { invitesService } from '../services/invites.service';
import { Invite } from '../models/invite.model';
import moment from 'moment';
import InvitesDropdown from './InvitesDropdown';
import ProfileDropdown from './ProfileDropdown';
import { Box, Flex, Heading, Link } from '@radix-ui/themes';
import { Switch } from '@radix-ui/react-switch';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchInvites = async () => {
      if (user) {
        const userInvites = await invitesService.getInvites(user.email);
        setInvites(userInvites);
        // Log expired invites
        userInvites.forEach((invite) => {
          const inviteExpiration = moment.utc(invite.expires_at);
          const currentTime = moment.utc();
          const isExpired = inviteExpiration.isBefore(currentTime);
          if (isExpired) {
            console.log(`Invite ${invite.id} is expired`);
          }
        });
      }
    };
    fetchInvites();
  }, [user]);

  return (
    <Box as="div" px="4" py="3" style={{ backgroundColor: 'var(--color-panel)' }}>
      <Flex align="center" justify="between">
        <RouterLink to="/home" style={{ textDecoration: 'none' }}>
          <Heading size="8">
            Suspect 3
          </Heading>
        </RouterLink>
        <Flex align="center" gap="6">
          <RouterLink  to="/play" color="gray">
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
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Navbar;