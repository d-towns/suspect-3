import { ScrollArea } from '@radix-ui/themes';
import React, { useState, useEffect, useCallback } from 'react';

interface AnimatedChatBubbleProps {
  message: string;
  tailPosition: 'topLeft' | 'topRight';
  backgroundColor?: string;
  textColor?: string;
  maxWidth?: string;
  animationSpeed?: number;
}

const AnimatedChatBubble: React.FC<AnimatedChatBubbleProps> = ({
  message,
  tailPosition,
  backgroundColor = 'bg-blue-500',
  textColor = 'text-white',
  maxWidth = 'max-w-xs',
  animationSpeed = 100,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  const animateText = useCallback(() => {
    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex < message.length) {
        setDisplayedText(message.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(intervalId);
        setIsAnimationComplete(true);
      }
    }, animationSpeed);

    return () => clearInterval(intervalId);
  }, [message, animationSpeed]);

  useEffect(() => {
    const cleanup = animateText();
    return cleanup;
  }, [animateText]);

  const tailClasses = {
    topLeft: 'left-0 top-0',
    topRight: 'right-0 top-0',
  };

  const tailBorderColor = {
    topLeft: `border-l-${backgroundColor.replace('bg-', '')}`,
    topRight: `border-r-${backgroundColor.replace('bg-', '')}`,
  };

  return (
    <div className={`relative ${maxWidth} mt-2`}>

        <div className={`${backgroundColor} rounded-lg p-4 ${textColor}`}>
          {displayedText}
          {!isAnimationComplete && (
            <span className="animate-pulse">|</span>
          )}
        </div>

    </div>
  );
};

export default AnimatedChatBubble;

