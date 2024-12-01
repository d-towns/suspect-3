import React, { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FaEnvelope } from "react-icons/fa";
import { Invite } from '../models/invite.model';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext/socket.context';

interface InvitesDropdownProps {
  invites: Invite[];
}

const InvitesDropdown: React.FC<InvitesDropdownProps> = ({ invites }) => {
    const navigate = useNavigate();
    const { socket } = useSocketContext(); // Destructure socket from useSocket
    const [newInvites, setNewInvites] = useState<number>(0);

    useEffect(() => {
        if (socket) {
            const handleInviteReceived = () => {
                setNewInvites(prev => prev + 1);
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
      <DropdownMenu.Trigger asChild>
        <div className="relative"> {/* Wrap button in a relative container */}
          {/* Removed Badge component */}
          <button
            className="
              inline-flex 
              items-center 
              justify-center 
              rounded-full 
              text-violet11 
              shadow-[0_2px_10px] 
              shadow-blackA4 
              outline-none 
              transition 
              transform 
              duration-200 
              ease-in-out 
              hover:scale-110 
              focus:shadow-[0_0_0_2px] 
              focus:shadow-black
            "
            aria-label="Invites"
          >
              <FaEnvelope className='text-gray-300' size={24} />
          </button>
          {newInvites > 0 && ( // Conditionally render the badge
            <span className="
              absolute 
              top-[0px]
              left-[10px]
              inline-flex 
              items-center 
              justify-center 
              px-2 
              py-1 
              text-xs 
              font-bold 
              leading-none 
              text-white 
              bg-red-600 
              rounded-full 
              transform 
              translate-x-1/2 
              -translate-y-1/2 
              transition-transform 
              duration-200 
              ease-in-out
            ">
              {newInvites}
            </span>
          )}
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[220px] rounded-md p-[5px] bg-white shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] 
                     will-change-[opacity,transform] 
                     data-[side=bottom]:animate-slideUpAndFade 
                     data-[side=left]:animate-slideRightAndFade 
                     data-[side=right]:animate-slideLeftAndFade 
                     data-[side=top]:animate-slideDownAndFade"
          sideOffset={5}
        >
          {invites.length > 0 ? (
            invites.map(invite => {
              const isExpired = moment.utc(invite.expires_at).isBefore(moment.utc());
              return (
                <DropdownMenu.Item
                  key={invite.id}
                  className={`
                    group relative flex h-[25px] select-none items-center 
                    rounded-[3px] pl-[25px] pr-[5px] text-[13px] 
                    leading-none text-black outline-none 
                    data-[disabled]:pointer-events-none 
                    data-[disabled]:text-mauve8 
                    ${isExpired ? 'text-gray-500 cursor-not-allowed' : 'data-[highlighted]:bg-violet9 data-[highlighted]:text-violet1'}
                  `}
                  onSelect={() => {
                    if (!isExpired) {
                      navigate(`/game/${invite.game_id}`);
                    }
                  }}
                  disabled={isExpired}
                >
                  Invite #{invite.invite_code} {isExpired && '(Expired)'}
                </DropdownMenu.Item>
              );
            })
          ) : (
            <DropdownMenu.Item
              className="group relative flex h-[25px] select-none items-center rounded-[3px] pl-[25px] pr-[5px] 
                         text-[13px] leading-none text-gray-500 outline-none"
            >
              No invites
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Arrow className="fill-white" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default InvitesDropdown;