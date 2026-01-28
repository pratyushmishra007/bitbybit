/**
 * Dynamic Imports for Code Splitting
 * This file provides lazy-loaded components to improve initial page load performance
 */

import dynamic from 'next/dynamic';
import LoadingSpinner from './LoadingSpinner';

// Lazy load AppAssistant (only loads when opened)
export const DynamicAppAssistant = dynamic(() => import('./AppAssistant'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="large" />
    </div>
  ),
  ssr: false, // Disable server-side rendering for this component
});

// Lazy load RobotButton
export const DynamicRobotButton = dynamic(() => import('./RobotButton'), {
  loading: () => null,
  ssr: false,
});

// Lazy load admin components
export const DynamicAdminPanel = dynamic(() => import('../admin/courses/[id]/edit/page'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="large" />
    </div>
  ),
  ssr: false,
});

// Add more dynamic imports as needed
