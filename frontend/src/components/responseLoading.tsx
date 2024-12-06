import React from 'react';
import 'tailwindcss/tailwind.css';
import { Spinner, Text } from '@radix-ui/themes';

interface ResponseLoadingProps {
    label: string;
}

const ResponseLoading: React.FC<ResponseLoadingProps> = ({label}: ResponseLoadingProps) => {
    return (
        <div className="flex justify-start items-center space-x-1 ml-4 mt-4">
            <Text size={'2'} as={'p'} className='text-gray-400'> {label} </Text>
            <Spinner />
        </div>
    );
};

export default ResponseLoading;