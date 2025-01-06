import React, { useState, useEffect, useCallback } from 'react';

interface AnimatedTextProps {
  message: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animationSpeed?: number;
  className?: string;
}

const AnimatedText: React.FC<AnimatedTextProps> = ({
  message,
  size = 'md',
  animationSpeed = 100,
  className = '',
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

  return (
    <span className={`text-left ${className} text-${size}`}>
      {displayedText}
      {!isAnimationComplete && <span className={`animate-pulse`}>|</span>}
    </span>
  );
};

export default AnimatedText;