import React from 'react';

export const PhotoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    fill="currentColor" 
    viewBox="0 0 16 16"
    {...props}
  >
    <path d="M15 2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h14zM1 3v10h14V3H1z"/>
    <path d="M5 12.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-2.553a.5.5 0 0 1 .708 0l1.293 1.293a.5.5 0 0 1-.708.708L4.5 10.707l-1.004 1.003a.5.5 0 0 1-.708-.707l1.293-1.293z"/>
    <circle cx="10.5" cy="6.5" r="1.5"/>
  </svg>
);