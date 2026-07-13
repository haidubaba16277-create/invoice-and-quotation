import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function QuoteFlowLogo({ className = "h-10 w-10", size = 40 }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
      >
        <defs>
          {/* Gradients to match the premium blue and sky blue tone in the logo */}
          <linearGradient id="logoBgGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" /> {/* blue-500 */}
            <stop offset="50%" stopColor="#2563eb" /> {/* blue-600 */}
            <stop offset="100%" stopColor="#1d4ed8" /> {/* blue-700 */}
          </linearGradient>
          <linearGradient id="waveArrowGrad" x1="40" y1="80" x2="110" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" /> {/* blue-400 */}
            <stop offset="50%" stopColor="#3b82f6" /> {/* blue-500 */}
            <stop offset="100%" stopColor="#1d4ed8" /> {/* blue-700 */}
          </linearGradient>
        </defs>

        {/* Circular Speech Bubble Body (Q shape) */}
        {/* A circular path with a tail at the bottom-left */}
        <path 
          d="M 60 15 C 35.15 15, 15 35.15, 15 60 C 15 71.8, 19.55 82.5, 27.05 90.5 L 21.5 107.5 L 39.5 102 C 45.65 104.55, 52.55 106, 60 106 C 84.85 106, 105 85.85, 105 60 C 105 35.15, 84.85 15, 60 15 Z" 
          fill="url(#logoBgGrad)" 
          stroke="#ffffff"
          strokeWidth="1.5"
          className="transition-all duration-300"
        />

        {/* Internal Quotation Marks (White, elegant, positioned perfectly in the upper-middle center) */}
        {/* First quotation mark */}
        <path 
          d="M 44 42 C 40 42, 38 45, 38 49 L 38 56 L 44 56 L 44 49 L 41 49 C 41 46, 42 45, 44 45 Z" 
          fill="white" 
        />
        {/* Second quotation mark */}
        <path 
          d="M 54 42 C 50 42, 48 45, 48 49 L 48 56 L 54 56 L 54 49 L 51 49 C 51 46, 52 45, 54 45 Z" 
          fill="white" 
        />

        {/* Swooping Growth Wave (Starting inside, weaving down-right, and swooping up-right) */}
        <path 
          d="M 52 74 C 62 74, 68 62, 78 60 C 88 58, 93 68, 101 64 C 105 62, 107 58, 109 52" 
          stroke="#ffffff" 
          strokeWidth="8" 
          strokeLinecap="round" 
        />
        <path 
          d="M 52 74 C 62 74, 68 62, 78 60 C 88 58, 93 68, 101 64 C 105 62, 107 58, 109 52" 
          stroke="url(#waveArrowGrad)" 
          strokeWidth="4" 
          strokeLinecap="round" 
        />

        {/* Arrowhead pointing up-right at the end of the wave */}
        <path 
          d="M 102 43 L 115 50 L 105 61 Z" 
          fill="url(#waveArrowGrad)" 
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
