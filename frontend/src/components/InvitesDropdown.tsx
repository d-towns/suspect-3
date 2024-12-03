import React, { useEffect, useState } from 'react';
import {
  DropdownMenu,
  Button,
  Badge,
  Text,
  Separator,
} from '@radix-ui/themes';
import { FaEnvelope } from 'react-icons/fa';
import { Invite } from '../models/invite.model';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext/socket.context';

interface InvitesDropdownProps {
  invites: Invite[];
}

const InvitesDropdown: React.FC<InvitesDropdownProps> = ({ invites }) => {
  const navigate = useNavigate();
  const { socket } = useSocketContext();
  const [newInvites, setNewInvites] = useState<number>(0);

  useEffect(() => {
    if (socket) {
      const handleInviteReceived = () => {
        setNewInvites((prev) => prev + 1);
      };

      socket.on('invite-received', handleInviteReceived);

      return () => {
        socket.off('invite-received', handleInviteReceived);
      };
    }
  }, [socket]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setNewInvites(0);
    }
  };

  return (
    <DropdownMenu.Root onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger>
        <Button variant="ghost" size="2" aria-label="Invites">
          <FaEnvelope size={20} />
          {newInvites > 0 && (
            <Badge color="red" size="1" style={{ marginLeft: '4px' }}>
              {newInvites}
            </Badge>
          )}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end">
        <DropdownMenu.Label>
          Invitations
        </DropdownMenu.Label>
        <Separator size={'4'} />
        {invites.length > 0 ? (
          invites.map((invite) => {
            const isExpired = moment.utc(invite.expires_at).isBefore(moment.utc());
            return (
              <DropdownMenu.Item
                key={invite.id}
                disabled={isExpired}
                onSelect={() => {
                  if (!isExpired) {
                    navigate(`/lobby/${invite.game_id}`);
                  }
                }}
              >
                Invite #{invite.invite_code} {isExpired && '(Expired)'}
              </DropdownMenu.Item>
            );
          })
        ) : (
          <DropdownMenu.Item disabled>No invites</DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default InvitesDropdown;