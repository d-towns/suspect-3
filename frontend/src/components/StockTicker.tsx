import React, { useRef, useEffect, useState, ReactNode } from 'react';

interface StockTickerProps {
  children: ReactNode[];
  direction?: 'left' | 'right';
  speed?: number;
}

const StockTicker: React.FC<StockTickerProps> = ({ 
  children, 
  direction = 'left', 
  speed = 20 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [initialized, setInitialized] = useState(false);
  
  // Calculate required number of copies for seamless scrolling
  useEffect(() => {
    if (!containerRef.current || !innerRef.current) return;
    
    const calculateWidths = () => {
      const containerWidth = containerRef.current?.offsetWidth || 0;
      const contentWidth = innerRef.current?.scrollWidth || 0;
      
      setContainerWidth(containerWidth);
      setContentWidth(contentWidth);
      setInitialized(true);
    };
    
    calculateWidths();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateWidths);
    return () => window.removeEventListener('resize', calculateWidths);
  }, [children]);
  
  // Animation logic
  useEffect(() => {
    if (!initialized || !containerRef.current) return;
    
    let animationFrameId: number;
    let position = 0;
    const scrollSpeed = direction === 'left' ? -1 : 1;
    const pixelsPerFrame = speed / 200; // Adjust this factor to control speed
    
    const scroll = () => {
      position += scrollSpeed * pixelsPerFrame;
      
      // Reset position for seamless loop when scrolled one full item width
      if (direction === 'left' && position <= -contentWidth) {
        position += contentWidth;
      } else if (direction === 'right' && position >= contentWidth) {
        position -= contentWidth;
      }
      
      if (innerRef.current) {
        innerRef.current.style.transform = `translateX(${position}px)`;
      }
      
      animationFrameId = requestAnimationFrame(scroll);
    };
    
    scroll();
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [initialized, contentWidth, direction, speed]);
  
  // Create enough copies to cover the container twice (for seamless looping)
  const calculateCopiesNeeded = () => {
    if (!containerWidth || !contentWidth) return 1;
    // We need at least 2 sets of content to create a seamless loop
    return Math.max(3, Math.ceil((containerWidth * 2) / contentWidth));
  };
  
  const copiesNeeded = calculateCopiesNeeded();
  const contentArray = Array.from({ length: copiesNeeded }, (_, index) => (
    <div key={`copy-${index}`} className="inline-flex">
      {children}
    </div>
  ));
  
  return (
    <div 
      ref={containerRef}
      className="stock-ticker overflow-hidden w-full"
    >
      <div 
        ref={innerRef}
        className="inline-flex whitespace-nowrap" 
      >
        {contentArray}
      </div>
    </div>
  );
};

export default StockTicker; 