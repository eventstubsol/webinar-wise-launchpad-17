
import React from 'react';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';

const AstronautIllustration = () => (
  <div className="relative flex flex-col items-center mb-16 sm:mb-20 md:mb-24">
    <img 
      src="/lovable-uploads/1f1a1d3b-0ac5-44b8-b98b-e82cdd5325e6.png" 
      alt="Astronaut saying Houston we have a problem"
      className="w-32 sm:w-48 md:w-64 lg:w-80 h-auto"
    />
  </div>
);

const ConnectionVisualization = () => (
  <div className="flex flex-col sm:flex-row items-center justify-center space-y-8 sm:space-y-0 sm:space-x-8 md:space-x-16 lg:space-x-32 mb-24 sm:mb-28 md:mb-32">
    {/* Zoom Logo */}
    <div className="flex flex-col items-center">
      <img 
        src="/lovable-uploads/39a2694e-d98b-464b-bc05-52f9c1609776.png" 
        alt="Zoom logo"
        className="w-24 sm:w-32 md:w-36 lg:w-40 h-auto mb-4 sm:mb-5 md:mb-6"
      />
    </div>
    
    {/* Disconnected Connection */}
    <div className="relative flex items-center order-last sm:order-none">
      <img 
        src="/lovable-uploads/624470d7-5a5e-4917-bba9-b266ea6deba4.png" 
        alt="Disconnected plugs with sparks"
        className="w-48 sm:w-64 md:w-96 lg:w-[40rem] h-auto"
      />
    </div>
    
    {/* WebinarWise Logo */}
    <div className="flex flex-col items-center">
      <img 
        src="/lovable-uploads/61077c71-dae2-4984-902e-fb5dbcc02a17.png" 
        alt="WebinarWise logo"
        className="w-24 sm:w-32 md:w-36 lg:w-40 h-auto mb-4 sm:mb-5 md:mb-6"
      />
    </div>
  </div>
);

export function ZoomConnectionPlaceholder() {
  return (
    <div className="w-full max-w-4xl sm:max-w-5xl md:max-w-6xl lg:max-w-7xl mx-auto py-24 sm:py-28 md:py-32 px-4 sm:px-6">
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
            className="px-12 sm:px-14 md:px-16 py-4 sm:py-5 md:py-6 text-lg sm:text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0"
          />
        </div>
      </div>
    </div>
  );
}
