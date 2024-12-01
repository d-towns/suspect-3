import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { FaUserCircle } from "react-icons/fa"; // Profile icon

interface ProfileDropdownProps {
    logout: () => void;
    email: string;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ logout, email }) => {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
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
                    aria-label="Profile options"
                >
                    <FaUserCircle className='text-gray-300' size={24} />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="min-w-[220px] rounded-md p-[5px] bg-white shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade data-[side=right]:animate-slideLeftAndFade data-[side=top]:animate-slideDownAndFade"
                    sideOffset={5}
                >
                    <DropdownMenu.Label className="px-5 py-2 text-sm text-gray-700">
                        {email}
                    </DropdownMenu.Label>
                    <DropdownMenu.Separator className="my-2 h-px bg-violet6" />
                    <DropdownMenu.Item
                        className={`
                            group relative flex h-[25px] select-none items-center 
                            rounded-[3px] pl-[25px] pr-[5px] text-[13px] 
                            leading-none text-black outline-none 
                            data-[disabled]:pointer-events-none 
                            data-[highlighted]:bg-violet9 
                            data-[disabled]:text-mauve8 
                            data-[highlighted]:text-violet1
                        `}
                        onSelect={() => {
                            // Handle Profile click, e.g., navigate to profile page
                            // Example:
                            // navigate('/profile');
                        }}
                    >
                        Profile
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        className={`
                            group relative flex h-[25px] select-none items-center 
                            rounded-[3px] pl-[25px] pr-[5px] text-[13px] 
                            leading-none text-black outline-none 
                            data-[disabled]:pointer-events-none 
                            data-[highlighted]:bg-violet9 
                            data-[disabled]:text-mauve8 
                            data-[highlighted]:text-violet1
                        `}
                        onSelect={() => {
                            // Handle Settings click, e.g., navigate to settings page
                            // Example:
                            // navigate('/settings');
                        }}
                    >
                        Settings
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="m-[5px] h-px bg-violet6" />
                    <DropdownMenu.Item
                        className={`
                            group relative flex h-[25px] select-none items-center 
                            rounded-[3px] pl-[25px] pr-[5px] text-[13px] 
                            leading-none text-black outline-none 
                            data-[disabled]:pointer-events-none 
                            data-[highlighted]:bg-violet9 
                            data-[disabled]:text-mauve8 
                            data-[highlighted]:text-violet1
                        `}
                        onSelect={() => {
                            logout();
                        }}
                    >
                        Logout
                    </DropdownMenu.Item>
                    <DropdownMenu.Arrow className="fill-white" />
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
};

export default ProfileDropdown;