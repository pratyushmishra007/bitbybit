/**
 * Analytics Component
 * Client-side analytics tracking for page views and events
 */

"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view
    const trackPageView = async () => {
      try {
        await fetch(`/api/analytics?page=${encodeURIComponent(pathname)}`);
        
        // Google Analytics (if GA_MEASUREMENT_ID is set)
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
            page_path: pathname,
          });
        }
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}

// Helper function to track custom events
export const trackEvent = async (event: string, metadata?: Record<string, any>) => {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        page: window.location.pathname,
        metadata,
      }),
    });

    // Google Analytics event tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, metadata);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};
