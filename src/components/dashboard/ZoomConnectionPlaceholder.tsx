
import React from 'react';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';

const AstronautIllustration = () => (
  <div className="relative flex flex-col items-center mb-12">
    {/* Speech Bubble */}
    <div className="relative bg-white rounded-2xl px-6 py-3 shadow-md border border-gray-200 mb-6">
      <p className="text-gray-800 font-bold text-sm whitespace-nowrap">
        HOUSTON WE HAVE A PROBLEM
      </p>
      {/* Speech bubble tail */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-gray-200"></div>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-[-2px] w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"></div>
    </div>
    
    {/* Astronaut SVG */}
    <svg width="140" height="160" viewBox="0 0 140 160" fill="none">
      {/* Body */}
      <ellipse cx="70" cy="110" rx="40" ry="45" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
      
      {/* Helmet */}
      <circle cx="70" cy="55" r="40" fill="#6366F1" opacity="0.9"/>
      <circle cx="70" cy="55" r="35" fill="#8B5CF6" opacity="0.8"/>
      <circle cx="70" cy="55" r="30" fill="rgba(255,255,255,0.2)"/>
      
      {/* Helmet reflection */}
      <ellipse cx="63" cy="48" rx="10" ry="15" fill="rgba(255,255,255,0.4)"/>
      
      {/* Face inside helmet */}
      <circle cx="63" cy="57" r="2.5" fill="#374151"/>
      <circle cx="77" cy="57" r="2.5" fill="#374151"/>
      <ellipse cx="70" cy="65" rx="4" ry="2.5" fill="#374151"/>
      
      {/* Arms */}
      <ellipse cx="40" cy="95" rx="10" ry="18" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
      <ellipse cx="100" cy="95" rx="10" ry="18" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
      
      {/* Gloves */}
      <circle cx="40" cy="115" r="8" fill="white" stroke="#D1D5DB" strokeWidth="1"/>
      <circle cx="100" cy="115" r="8" fill="white" stroke="#D1D5DB" strokeWidth="1"/>
      
      {/* Chest panel */}
      <rect x="58" y="90" width="24" height="18" rx="3" fill="white" stroke="#D1D5DB" strokeWidth="1"/>
      <circle cx="64" cy="99" r="2.5" fill="#EF4444"/>
      <circle cx="76" cy="99" r="2.5" fill="#10B981"/>
      
      {/* Legs */}
      <ellipse cx="58" cy="140" rx="10" ry="18" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
      <ellipse cx="82" cy="140" rx="10" ry="18" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2"/>
      
      {/* Boots */}
      <ellipse cx="58" cy="152" rx="12" ry="6" fill="#374151"/>
      <ellipse cx="82" cy="152" rx="12" ry="6" fill="#374151"/>
    </svg>
  </div>
);

const ConnectionVisualization = () => (
  <div className="flex items-center justify-center space-x-16 mb-16">
    {/* Zoom Logo */}
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 5C11.715 5 5 11.715 5 20s6.715 15 15 15 15-6.715 15-15S28.285 5 20 5zm8 23H12v-6h16v6zm0-8H12v-6h16v6z" fill="white"/>
        </svg>
      </div>
      <span className="text-sm font-semibold text-blue-600">Zoom</span>
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
      <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M10 10h20v4H10v-4zm0 6h20v4H10v-4zm0 6h15v4H10v-4z" fill="white"/>
          <circle cx="28" cy="26" r="4" fill="white"/>
        </svg>
      </div>
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
