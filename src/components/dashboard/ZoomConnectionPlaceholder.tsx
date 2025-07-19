
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
      <img 
        src="/lovable-uploads/624470d7-5a5e-4917-bba9-b266ea6deba4.png" 
        alt="Disconnected plugs with sparks"
        className="w-80 h-auto"
      />
    </div>
    
    {/* WebinarWise Logo */}
    <div className="flex flex-col items-center">
      <img 
        src="/lovable-uploads/61077c71-dae2-4984-902e-fb5dbcc02a17.png" 
        alt="WebinarWise logo"
        className="w-20 h-auto mb-3"
      />
      
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
