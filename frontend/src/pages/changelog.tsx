import React from 'react';

import { Box, Text, Card, Separator} from '@radix-ui/themes';

const changelogs = [
    {
        version: '0.91-beta',
        date: '01/10/2025',
        changes: {
            'Single Player': [
                'Image creation: Custom AI generated images for all offense reports, suspects, and evidence will be created for new games upon initial state creation.',
                'Image caching: All images will be cached on the client with a service worker to speed up rendering.',
            ],
            'Bug Fixes': [
                'Interrogation conversations are properly sorted with user messages and assistant messages in logical order.',
                'Audio recording will now end when End Interrogation button is pressed.',
                'UI Transition from offense report to interrogation phase is fixed.',
            ],
            Backend: [
                'LLMImageService: Class implementing a strategy pattern for using different services.',
                'ReplicateImageService: LLMImageService using Replicate API. Includes a map for different models. Currently using FLUX.',
            ],
        },
    },
    {
        version: '0.93-beta',
        date: '01/12/2025',
        changes: {
            'Single Player': [
                'ocilloscope audio visualizer for interrogations',
                'added active game check to stop endless game creation',
                'Male female voices',
                'Game creation loading bar',
            ],
            Backend: [
                'standardized socket events in a constant map',
                "added error handling to main services that didn't have it",
                'removed openai game service',
            ],
            Bugfixes: [
                'fixed newly created edge removal',
                'fixed proper elo calcuation by adding game outcome to game thread',
                'Fix socket disconnetion on game creation',
            ],
        },
    },
];

const Changelog: React.FC = () => {
    return (
        <Box my={'4'}>
            {changelogs.map((log) => (
                <Card key={log.version} className='p-4 mb-4'>
                    <Box className='flex justify-between items-center'>
                    <Text size="7" weight={'bold'} mb={'2'}> {log.version}</Text>
                    <Text size="4" color='gray'  weight='bold' ml='auto'> {log.date}</Text>
                    </Box>
                    <Separator size={'4'} my={'4'} />
                    {Object.entries(log.changes).map(([category, items]) => (
                        <Box key={category} mb="3">
                            <Text size="4" weight={'medium'} mb={'3'}>{category}</Text>
                            <ul className='ml-4'>
                                {items.map((item: string, index: number) => (
                                    <li key={index} className='mb-1'>- {item}</li>
                                ))}
                            </ul>
                        </Box> 
                    ))}
                </Card>
            ))}
        </Box>
    );
};

export default Changelog;