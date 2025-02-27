import React from 'react';
import AnimatedText from './animatedText';

interface MiniAnimatedTextProps {
  message: string;
}

const MiniAnimatedText: React.FC<MiniAnimatedTextProps> = ({ message }) => {
  return (
    <div className="mx-4 min-w-[150px]">
      <AnimatedText 
        message={message} 
        animationSpeed={100} 
        className="text-sm md:text-lg" 
      />
    </div>
  );
};

export default MiniAnimatedText; 