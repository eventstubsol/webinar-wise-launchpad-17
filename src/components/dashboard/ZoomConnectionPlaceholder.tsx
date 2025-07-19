
import React from 'react';
import { ZoomConnectButton } from '@/components/zoom/ZoomConnectButton';

const AstronautIllustration = () => (
  <div className="relative flex flex-col items-center">
    {/* Speech Bubble */}
    <div className="relative bg-white rounded-2xl px-6 py-3 shadow-lg border-2 border-purple-200 mb-4">
      <p className="text-purple-800 font-bold text-sm whitespace-nowrap">
        HOUSTON WE HAVE A PROBLEM
      </p>
      {/* Speech bubble tail */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-purple-200"></div>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-[-2px] w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-white"></div>
    </div>
    
    {/* Astronaut SVG */}
    <svg width="120" height="140" viewBox="0 0 120 140" fill="none" className="animate-pulse">
      {/* Body */}
      <ellipse cx="60" cy="100" rx="35" ry="40" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"/>
      
      {/* Helmet */}
      <circle cx="60" cy="50" r="35" fill="#8B5CF6" opacity="0.9"/>
      <circle cx="60" cy="50" r="30" fill="#A855F7" opacity="0.7"/>
      <circle cx="60" cy="50" r="25" fill="rgba(255,255,255,0.3)"/>
      
      {/* Helmet reflection */}
      <ellipse cx="55" cy="45" rx="8" ry="12" fill="rgba(255,255,255,0.5)"/>
      
      {/* Face inside helmet */}
      <circle cx="55" cy="52" r="2" fill="#374151"/>
      <circle cx="65" cy="52" r="2" fill="#374151"/>
      <ellipse cx="60" cy="58" rx="3" ry="2" fill="#374151"/>
      
      {/* Arms */}
      <ellipse cx="35" cy="85" rx="8" ry="15" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"/>
      <ellipse cx="85" cy="85" rx="8" ry="15" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"/>
      
      {/* Gloves */}
      <circle cx="35" cy="100" r="6" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1"/>
      <circle cx="85" cy="100" r="6" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1"/>
      
      {/* Chest panel */}
      <rect x="50" y="80" width="20" height="15" rx="2" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="1"/>
      <circle cx="55" cy="87" r="2" fill="#EF4444"/>
      <circle cx="65" cy="87" r="2" fill="#10B981"/>
      
      {/* Legs */}
      <ellipse cx="50" cy="125" rx="8" ry="15" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"/>
      <ellipse cx="70" cy="125" rx="8" ry="15" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2"/>
      
      {/* Boots */}
      <ellipse cx="50" cy="135" rx="10" ry="5" fill="#374151"/>
      <ellipse cx="70" cy="135" rx="10" ry="5" fill="#374151"/>
    </svg>
  </div>
);

const DisconnectedPlugs = () => (
  <div className="relative flex items-center justify-center">
    {/* Left Plug (Zoom side) */}
    <div className="relative">
      <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
        <rect x="0" y="15" width="40" height="10" rx="5" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2"/>
        <circle cx="45" cy="18" r="2" fill="#1D4ED8"/>
        <circle cx="45" cy="22" r="2" fill="#1D4ED8"/>
        <rect x="35" y="17" width="8" height="6" fill="#1D4ED8"/>
      </svg>
      {/* Sparks */}
      <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
        <div className="w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
        <div className="w-0.5 h-0.5 bg-orange-400 rounded-full animate-ping delay-100 absolute top-2 left-1"></div>
        <div className="w-0.5 h-0.5 bg-red-400 rounded-full animate-ping delay-200 absolute -top-1 left-2"></div>
      </div>
    </div>
    
    {/* Gap with sparks */}
    <div className="mx-4 relative">
      <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 opacity-50"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-1 h-1 bg-yellow-300 rounded-full animate-pulse"></div>
      </div>
    </div>
    
    {/* Right Plug (WebinarWise side) */}
    <div className="relative">
      <svg width="60" height="40" viewBox="0 0 60 40" fill="none" transform="scale(-1, 1)">
        <rect x="0" y="15" width="40" height="10" rx="5" fill="#8B5CF6" stroke="#7C3AED" strokeWidth="2"/>
        <circle cx="45" cy="18" r="2" fill="#7C3AED"/>
        <circle cx="45" cy="22" r="2" fill="#7C3AED"/>
        <rect x="35" y="17" width="8" height="6" fill="#7C3AED"/>
      </svg>
      {/* Sparks */}
      <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
        <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping"></div>
        <div className="w-0.5 h-0.5 bg-pink-400 rounded-full animate-ping delay-150 absolute top-2 right-1"></div>
        <div className="w-0.5 h-0.5 bg-purple-600 rounded-full animate-ping delay-300 absolute -top-1 right-2"></div>
      </div>
    </div>
  </div>
);

const ZoomLogo = () => (
  <div className="flex flex-col items-center space-y-2">
    <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 4C9.372 4 4 9.372 4 16s5.372 12 12 12 12-5.372 12-12S22.628 4 16 4zm6.4 18.4H8.8V17.6h13.6v4.8zm0-6.4H8.8V11.2h13.6V16z" fill="white"/>
      </svg>
    </div>
    <span className="text-sm font-medium text-blue-600">Zoom</span>
  </div>
);

const WebinarWiseLogo = () => (
  <div className="flex flex-col items-center space-y-2">
    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M8 8h16v3H8V8zm0 5h16v3H8v-3zm0 5h12v3H8v-3z" fill="white"/>
        <circle cx="22" cy="21" r="3" fill="white"/>
      </svg>
    </div>
    <span className="text-sm font-medium text-purple-600">WebinarWise</span>
  </div>
);

export function ZoomConnectionPlaceholder() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 shadow-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Your Zoom Account
          </h2>
          <p className="text-gray-600">
            Link your Zoom account to unlock powerful webinar analytics and insights
          </p>
        </div>
        
        {/* Connection Visualization */}
        <div className="flex items-center justify-between mb-8 px-4">
          <ZoomLogo />
          <div className="flex-1 flex justify-center">
            <DisconnectedPlugs />
          </div>
          <WebinarWiseLogo />
        </div>
        
        {/* Astronaut Character */}
        <div className="flex justify-center mb-8">
          <AstronautIllustration />
        </div>
        
        {/* Connect Button */}
        <div className="flex justify-center">
          <ZoomConnectButton 
            variant="default"
            size="lg"
            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
          />
        </div>
        
        {/* Features List */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Analyze webinar performance</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Track attendee engagement</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>Generate AI insights</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
            <span>Create email campaigns</span>
          </div>
        </div>
      </div>
    </div>
  );
}
