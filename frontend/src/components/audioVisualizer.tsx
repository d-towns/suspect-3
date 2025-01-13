import React from 'react';

interface CircleVisualizerProps {
    amplitudeData: Float32Array;
    color?: string;
    size?: number;
    minRadius?: number;
    maxRadius?: number;
}

const CircleVisualizer: React.FC<CircleVisualizerProps> = ({ 
  amplitudeData,
  color = '#4a90e2',
  size = 500,
  minRadius = 160,
  maxRadius = 340
}) => {
  const centerX = size / 2;
  const centerY = size / 2;

  const averageAmplitude = amplitudeData.length
    ? amplitudeData.reduce((a, b) => a + b, 0) / amplitudeData.length
    : 0;

  const radius = minRadius + averageAmplitude * (maxRadius - minRadius);

  return (
    <div className=" flex items-center justify-center w-full h-[500px] absolute inline top-200 right-400 z-[-1]">
      <svg 
        width={size} 
        height={size} 
        className="transform-gpu"
        viewBox={`0 0 ${size} ${size}`}
      >
          <defs>
        <radialGradient
          cx={centerX}
          cy={centerY}
          r={radius}
            fx={centerX}
            fy={centerY}
            id='radial-gradient'
          gradientUnits='userSpaceOnUse'
          fill={'#4a90e2'}
          stroke={color}
          strokeWidth="2"
        >
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        </defs>
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill='url(#radial-gradient)'
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export default CircleVisualizer;
