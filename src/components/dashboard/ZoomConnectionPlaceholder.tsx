
import React from 'react';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';

const AstronautIllustration = () => (
  <div className="relative flex flex-col items-center mb-12">
    <img 
      src="/lovable-uploads/1f1a1d3b-0ac5-44b8-b98b-e82cdd5325e6.png" 
      alt="Astronaut saying Houston we have a problem"
      className="w-40 h-auto"
    />
  </div>
);

const ConnectionVisualization = () => (
  <div className="flex items-center justify-center space-x-16 mb-16">
    {/* Zoom Logo */}
    <div className="flex flex-col items-center">
      <img 
        src="/lovable-uploads/39a2694e-d98b-464b-bc05-52f9c1609776.png" 
        alt="Zoom logo"
        className="w-20 h-auto mb-3"
      />
      
    </div>
    
    {/* Disconnected Connection */}
    <div className="relative flex items-center">
      {/* Left Plug */}
      <div className="relative">
        <svg width="70" height="45" viewBox="0 0 70 45" fill="none">
          <rect x="5" y="17" width="45" height="12" rx="6" fill="#3B82F6" stroke="#2563EB" strokeWidth="2"/>
          <circle cx="52" cy="20" r="2.5" fill="#2563EB"/>
          <circle cx="52" cy="26" r="2.5" fill="#2563EB"/>
          <rect x="45" y="19" width="10" height="8" fill="#2563EB"/>
        </svg>
        
        {/* Sparks from left plug */}
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping"></div>
          <div className="w-1 h-1 bg-orange-400 rounded-full animate-ping delay-100 absolute top-3 left-1"></div>
          <div className="w-1 h-1 bg-red-400 rounded-full animate-ping delay-200 absolute -top-2 left-2"></div>
        </div>
      </div>
      
      {/* Gap with electricity */}
      <div className="mx-6 relative">
        <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-teal-400 opacity-60"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Right Plug */}
      <div className="relative">
        <svg width="70" height="45" viewBox="0 0 70 45" fill="none" transform="scale(-1, 1)">
          <rect x="5" y="17" width="45" height="12" rx="6" fill="#14B8A6" stroke="#0D9488" strokeWidth="2"/>
          <circle cx="52" cy="20" r="2.5" fill="#0D9488"/>
          <circle cx="52" cy="26" r="2.5" fill="#0D9488"/>
          <rect x="45" y="19" width="10" height="8" fill="#0D9488"/>
        </svg>
        
        {/* Sparks from right plug */}
        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2">
          <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping"></div>
          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping delay-150 absolute top-3 right-1"></div>
          <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping delay-300 absolute -top-2 right-2"></div>
        </div>
      </div>
    </div>
    
    {/* WebinarWise Logo */}
    <div className="flex flex-col items-center">
      <img 
        src="/lovable-uploads/61077c71-dae2-4984-902e-fb5dbcc02a17.png" 
        alt="WebinarWise logo"
        className="w-20 h-auto mb-3"
      />
      <span className="text-sm font-semibold text-teal-600">WebinarWise</span>
    </div>
  </div>
);

export function ZoomConnectionPlaceholder() {
  return (
    <div className="w-full max-w-5xl mx-auto py-20">
      <div className="flex flex-col items-center">
        {/* Astronaut at the top */}
        <AstronautIllustration />
        
        {/* Connection visualization in the middle */}
        <ConnectionVisualization />
        
        {/* Connect button at the bottom */}
        <div className="flex justify-center">
          <ZoomConnectButton 
            variant="default"
            size="lg"
            className="px-12 py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0"
          />
        </div>
      </div>
    </div>
  );
}
