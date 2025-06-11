
import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedGroupProps {
  children: React.ReactNode;
  className?: string;
  variants?: {
    container?: {
      visible?: {
        transition?: {
          staggerChildren?: number;
          delayChildren?: number;
        };
      };
    };
    item?: {
      hidden?: {
        opacity?: number;
        y?: number;
        filter?: string;
      };
      visible?: {
        opacity?: number;
        y?: number;
        filter?: string;
        transition?: {
          type?: string;
          bounce?: number;
          duration?: number;
        };
      };
    };
  };
}

export const AnimatedGroup: React.FC<AnimatedGroupProps> = ({ 
  children, 
  className,
  variants 
}) => {
  return (
    <div className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
};
