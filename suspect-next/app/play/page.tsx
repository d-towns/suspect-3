
import Waitlist from '@/components/waitlist';
import { Flex, Box, Text, Separator, Card, Inset, Strong } from '@radix-ui/themes';
import { createGameRoomAction } from '../actions';
import { createClient } from '@/utils/supabase/server';
import Image from 'next/image';
import { ModeCard } from './_components/ModeCard';





export default async function Page() {
    const supabase = await createClient();
    const {data: {user}} =  await supabase.auth.getUser();
    return (
        <Flex justify="center" align="center" className=' mt-[5%] w-full'>
        <div className="flex md:flex-row flex-col items-center gap-4">
          <ModeCard
            createRoom={createGameRoomAction}
            imgSrc="/single-player-splash-2.webp"
            altText="Single Player"
            description="Enter the interrogation room as a detective! Interview the suspects in a real-time chat and use their testimonies along with the evidence to solve the case."
            mode="single"
            userId={user?.id || ''}

          />
          <ModeCard
            createRoom={createGameRoomAction}
            imgSrc="/multi-player-splash.webp"
            description='Clear your name as a suspect against the detective! The culprit is among you, but who? Invite your friends and use your wits to deceive the detective and avoid being framed...or found out.'
            altText="Multiplayer"
            mode="multi"
            userId={user?.id || ''}
          />
        </div>
      </Flex>
    );
    }