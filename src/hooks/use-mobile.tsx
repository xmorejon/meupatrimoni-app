"use client";

import { useState, useEffect } from 'react';

const useMobile = (maxWidth = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Ensure window is defined (for server-side rendering)
    if (typeof window === 'undefined') {
      return;
    }

    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < maxWidth);
    };

    // Check on initial mount
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [maxWidth]);

  return isMobile;
};

export default useMobile;
