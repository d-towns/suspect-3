import React from 'react';
import {
  DropdownMenu,
  Button,
  Avatar,
  Text,
  Separator,
} from '@radix-ui/themes';
import { useNavigate } from 'react-router-dom';

interface ProfileDropdownProps {
  logout: () => void;
  email: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ logout, email }) => {
  const navigate = useNavigate();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          variant="ghost"
          size="2"
          style={{ borderRadius: '30%'  }}
          aria-label="Profile options"
          className='transition transform duration-200 ease-in-out hover:scale-110'
        >
          <Avatar size={'2'} fallback={email.charAt(0).toUpperCase()}>
          </Avatar>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end">
        <DropdownMenu.Label className='my-2'>
        <Text as="div" size="2" color="gray" my={"3"}>
          {email}
        </Text>
        </DropdownMenu.Label>
        <Separator size={'4'} />
        <DropdownMenu.Item onSelect={() => navigate('/profile')} className='my-2'>
          Profile
        </DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => navigate('/settings')} className='mb-2'>
          Settings
        </DropdownMenu.Item>
        <Separator size={'4'} />
        <DropdownMenu.Item onSelect={logout} className='my-2'>Logout</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default ProfileDropdown;