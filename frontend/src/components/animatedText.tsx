import React, { useState, useEffect, useCallback } from 'react';

interface AnimatedTextProps {
  message: string;
  animationSpeed?: number;
}

const AnimatedText: React.FC<AnimatedTextProps> = ({
  message,
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

  return (
    <span>
      {displayedText}
      {!isAnimationComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

export default AnimatedText;