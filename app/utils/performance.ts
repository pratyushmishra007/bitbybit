/**
 * Performance Monitoring Utilities
 * Track and log performance metrics for optimization
 */

// Measure page load time
export const measurePageLoad = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.log('⚡ Performance Metrics:', {
      pageLoadTime: `${pageLoadTime}ms`,
      connectTime: `${connectTime}ms`,
      renderTime: `${renderTime}ms`,
    });

    // Send to analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name: 'page_load',
        value: pageLoadTime,
        event_category: 'Performance',
      });
    }
  });
};

// Measure component render time
export const measureRender = (componentName: string) => {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (renderTime > 100) {
      console.warn(`⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  };
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Cache API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cachedFetch = async (url: string, options?: RequestInit) => {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);

  // Return cached data if fresh
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('🚀 Cache hit:', url);
    return cached.data;
  }

  // Fetch fresh data
  const response = await fetch(url, options);
  const data = await response.json();

  // Store in cache
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
};

// Clear cache
export const clearCache = () => {
  cache.clear();
  console.log('🗑️ Cache cleared');
};

// Preload images for better performance
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Lazy load components when they enter viewport
export const useLazyLoad = (ref: React.RefObject<HTMLElement>) => {
  if (typeof window === 'undefined') return false;

  const observer = new IntersectionObserver(
    ([entry]) => entry.isIntersecting,
    { threshold: 0.1 }
  );

  if (ref.current) {
    observer.observe(ref.current);
  }

  return () => {
    if (ref.current) {
      observer.unobserve(ref.current);
    }
  };
};
