
import { useState, useEffect } from 'react';

const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function useSidebarState(defaultOpen: boolean = true) {
  const [open, setOpen] = useState(() => {
    // Read from cookie on initialization
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const sidebarCookie = cookies.find(cookie => 
        cookie.trim().startsWith(`${SIDEBAR_COOKIE_NAME}=`)
      );
      
      if (sidebarCookie) {
        const value = sidebarCookie.split('=')[1];
        return value === 'true';
      }
    }
    return defaultOpen;
  });

  const setOpenWithPersistence = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(open) : value;
    setOpen(newValue);
    
    // Save to cookie
    if (typeof document !== 'undefined') {
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${newValue}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  };

  return [open, setOpenWithPersistence] as const;
}
