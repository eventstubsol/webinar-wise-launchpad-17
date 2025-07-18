import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { sanitizeAuthInput } from '@/lib/auth-security';
import { cn } from '@/lib/utils';

interface SecuredInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  sanitize?: boolean;
  maxLength?: number;
  allowedChars?: RegExp;
  onSecureChange?: (value: string, isValid: boolean) => void;
}

export const SecuredInput = React.forwardRef<HTMLInputElement, SecuredInputProps>(
  ({ 
    sanitize = true, 
    maxLength = 1000, 
    allowedChars, 
    onSecureChange, 
    onChange,
    className,
    ...props 
  }, ref) => {
    const [isValid, setIsValid] = useState(true);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      let valid = true;

      // Apply character restrictions
      if (allowedChars && !allowedChars.test(value)) {
        valid = false;
      }

      // Apply length restrictions
      if (maxLength && value.length > maxLength) {
        value = value.substring(0, maxLength);
        valid = false;
      }

      // Apply sanitization
      if (sanitize) {
        const sanitized = sanitizeAuthInput(value);
        if (sanitized !== value) {
          value = sanitized;
          valid = false;
        }
      }

      setIsValid(valid);
      
      // Update the event target value
      e.target.value = value;
      
      // Call custom secure change handler
      if (onSecureChange) {
        onSecureChange(value, valid);
      }
      
      // Call original onChange
      if (onChange) {
        onChange(e);
      }
    }, [sanitize, maxLength, allowedChars, onSecureChange, onChange]);

    return (
      <Input
        ref={ref}
        onChange={handleChange}
        className={cn(
          className,
          !isValid && 'border-yellow-500 focus:border-yellow-500'
        )}
        {...props}
      />
    );
  }
);

SecuredInput.displayName = 'SecuredInput';