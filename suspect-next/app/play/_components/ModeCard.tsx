'use client';
import { Box, Card, Inset, Separator, Strong, Text } from '@radix-ui/themes';
import Image from 'next/image';
import { createGameRoomAction } from '@/app/actions';
import Waitlist from '@/components/waitlist';

interface ModeCardProps {
    createRoom: (data: {userId: string, mode: string}) => Promise<any>;
    imgSrc: string;
    altText: string;
    description?: string;
    mode: 'single' | 'multi';
    userId: string;
  }


export function ModeCard( {
    createRoom,
    imgSrc,
    altText,
    description,
    mode,
    userId,
  }: ModeCardProps ) {
    return (
      <Box
        maxWidth="640px"
        style={{
          position: 'relative',
          flex: 1,
          cursor: mode === 'single' ? 'default' : 'pointer',
          margin: '0 16px',
        }}
      >
        
        <Card
          size="3"
          onClick={() => createGameRoomAction({userId, mode})}
          className={mode === 'multi' ? 'hover:scale-105 hover:border transition ease-in-out duration-200' : ''}
          style={{ opacity: mode === 'single' ? 0.5 : 1 }}
        >
          <Inset clip="padding-box" side="top" pb="current">
            <Image
              src={imgSrc}
              alt={altText}
              width={640}
                height={360}
              className="block object-cover w-full h-64 sm:h-80 md:h-96 bg-gray-200"
            />
          </Inset>
          <Text as="p" align='center' size={{ lg: '7', md: '5', sm: '4' }} >
            <Strong>{altText} Mode</Strong>
          </Text>
          <Separator my="3" size="4" />
          {description && <Text as="p" size={{ sm: '2', md: '3', lg: '4' }}>{description}</Text>}
          <Separator my="3" size="4" />
        </Card>
  
        {mode === 'single' && (
          <Card
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '60%',
              padding: '20px',
              borderRadius: '8px',
            }}
            variant='surface'
          >
            <Text as="p" align='center' size={{ lg: '5', md: '4', sm: '3' }} >
              <Strong>Coming Soon!</Strong>
  
            </Text>
            <Text as="p" size={{ lg: '5', md: '4', sm: '3' }} my='3' align={'center'}>Release Date: <Strong>Dec 15th</Strong></Text>
          </Card>
        )}
      </Box>
    );
  };