import React from 'react';

export const SpeakerWaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    fill="currentColor" 
    viewBox="0 0 16 16"
    {...props}
  >
    <path d="M8.765 4.003a.5.5 0 0 0-.765-.424L4.528 6H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1.528l3.472 2.421a.5.5 0 0 0 .765-.424V4.003z"/>
    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
    <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.482 5.482 0 0 1 11.025 8a5.482 5.482 0 0 1-1.61 3.89l.706.706z"/>
  </svg>
);