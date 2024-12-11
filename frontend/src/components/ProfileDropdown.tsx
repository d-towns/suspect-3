import React from 'react';
import {
  DropdownMenu,
  Button,
  Avatar,
  Text,
  Separator,
} from '@radix-ui/themes';
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
          style={{ borderRadius: '30%'  }}
          aria-label="Profile options"
          className='transition transform duration-200 ease-in-out'
        >
          <Avatar size={'2'} fallback={email.charAt(0).toUpperCase()}>
          </Avatar>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="start" style={{width: '200px'}}>
        <DropdownMenu.Label className='my-2' >
        <Text as="div"  size="2" color="gray" my={"3"}>
          {email}
        </Text>
        </DropdownMenu.Label>
        <Separator size={'4'} />
        <DropdownMenu.Item shortcut={`${theme == 'light' ? '☀️' :'🌙' }`} onClick={() => toggleTheme()} className='my-2'>
          Theme
          </DropdownMenu.Item>
        <DropdownMenu.Item  className='my-2'>
          Profile
        </DropdownMenu.Item>
        <DropdownMenu.Item className='mb-2'>
          Settings
        </DropdownMenu.Item>
        <Separator size={'4'} />
        <DropdownMenu.Item onSelect={logout} className='my-2'>Logout</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default ProfileDropdown;