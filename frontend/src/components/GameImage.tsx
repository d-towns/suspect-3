import React from 'react';
import { getSupabaseImageURL } from '../utils/helpers';

interface GameImageProps {
    src: string;
    alt: string;
    className?: string;
}
const GameImage: React.FC<GameImageProps> = ({ src, alt, className }: GameImageProps ) => {
    return (
        <img
            src={getSupabaseImageURL(src)}
            alt={alt}
            className={className}
        />
    );
}

export default GameImage;
