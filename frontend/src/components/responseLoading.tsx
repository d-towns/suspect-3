import React from 'react';
import 'tailwindcss/tailwind.css';

interface ResponseLoadingProps {
    label: string;
}

const ResponseLoading: React.FC<ResponseLoadingProps> = ({label}: ResponseLoadingProps) => {
    return (
        <div className="flex justify-start items-center space-x-1 ml-4 mt-4">
            <p className='text-gray-400'> {label} </p>
            <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
            <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-400"></div>
            <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-600"></div>
        </div>
    );
};

export default ResponseLoading;