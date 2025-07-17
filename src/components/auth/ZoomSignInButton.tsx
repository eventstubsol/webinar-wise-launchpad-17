import React from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ZoomSignInButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  text?: string;
}

export function ZoomSignInButton({ 
  onClick, 
  isLoading = false, 
  variant = 'default',
  size = 'default',
  className = '',
  text = 'Sign in with Zoom'
}: ZoomSignInButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={`w-full bg-[#2D8CFF] hover:bg-[#0066CC] text-white ${className}`}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          Connecting...
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4.616 19.384a1.12 1.12 0 01-1.12-1.12v-7.147a1.12 1.12 0 011.12-1.12h7.147a1.12 1.12 0 011.12 1.12v7.147a1.12 1.12 0 01-1.12 1.12H4.616zm14.767 0a1.12 1.12 0 01-1.12-1.12v-4.48a1.12 1.12 0 011.12-1.12h1.12a2.24 2.24 0 002.24-2.24v-1.12a1.12 1.12 0 011.12-1.12 1.12 1.12 0 011.12 1.12v1.12a4.48 4.48 0 01-4.48 4.48h-1.12v3.36a1.12 1.12 0 01-1.12 1.12z" />
            <path d="M4.616 13.882V7.854a1.12 1.12 0 011.12-1.12h7.147a1.12 1.12 0 011.12 1.12v1.344h1.12a4.48 4.48 0 014.48-4.48h1.12a1.12 1.12 0 011.12 1.12 1.12 1.12 0 01-1.12 1.12h-1.12a2.24 2.24 0 00-2.24 2.24v1.12a1.12 1.12 0 01-1.12 1.12h-2.24v2.464a1.12 1.12 0 01-1.12 1.12H4.616z" />
          </svg>
          {text}
        </>
      )}
    </Button>
  );
}
