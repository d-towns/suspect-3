import React from 'react';
import {
  DropdownMenu,
  Button,
  Avatar,
  Text,
  Separator,
} from '@radix-ui/themes';
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface ProfileDropdownProps {
  logout: () => void;
  username: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ logout, username: email }) => {
  const { theme, toggleTheme } = useTheme();


  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          variant="ghost"
          size="2"
          style={{ borderRadius: '30%' }}
          aria-label="Profile options"
          className='transition transform duration-200 ease-in-out'
        >
          <Avatar size={'2'} fallback={email.charAt(0).toUpperCase()}>
          </Avatar>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="start" style={{ width: '200px' }}>
        <DropdownMenu.Label className='my-2' >
          <Text as="div" size="2" color="gray" my={"3"}>
            {email}
          </Text>
        </DropdownMenu.Label>

        <DropdownMenu.Group className='md:hidden my-2'>
          <Separator size={'4'} />
          <RouterLink to="/play" color="gray">
            <DropdownMenu.Item>
              Play
            </DropdownMenu.Item>
          </RouterLink>
          <DropdownMenu.Item>
            <RouterLink to="/faq" color="gray">
              How To Play
            </RouterLink>
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <RouterLink to="/subscriptions" color="gray">
              Subscriptions
            </RouterLink>
          </DropdownMenu.Item>
          <RouterLink to="/leaderboard" color="gray">
            <DropdownMenu.Item>
              Leaderboard
            </DropdownMenu.Item>
          </RouterLink>
          <RouterLink to="https://donate.stripe.com/eVa16xbg7be93egaEE" color="gray">
            <DropdownMenu.Item>
              Support
            </DropdownMenu.Item>
          </RouterLink>
        </DropdownMenu.Group>
        <DropdownMenu.Group className='my-2'>
          <Separator size={'4'} />
          <DropdownMenu.Item shortcut={`${theme == 'light' ? '☀️' : '🌙'}`} onClick={() => toggleTheme()} className='my-2'>
            Theme
          </DropdownMenu.Item>
          <RouterLink  to="/profile" color="gray">
            <DropdownMenu.Item>
              Profile
            </DropdownMenu.Item>
          </RouterLink>
        </DropdownMenu.Group>

        <Separator size={'4'} />
        <DropdownMenu.Item onSelect={logout} className='my-2'>Logout</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default ProfileDropdown;