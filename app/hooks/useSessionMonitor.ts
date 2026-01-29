import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook to monitor session state and handle authentication changes
 * Automatically redirects to sign in when session expires or user signs out
 * 
 * @param options Configuration options
 * @param options.redirectTo - Where to redirect when unauthenticated (default: '/auth/signin')
 * @param options.requireAuth - Whether to require authentication (default: true)
 * @param options.onSessionEnd - Callback when session ends
 */
export function useSessionMonitor(options?: {
  redirectTo?: string;
  requireAuth?: boolean;
  onSessionEnd?: () => void;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const redirectTo = options?.redirectTo ?? '/auth/signin';
  const requireAuth = options?.requireAuth ?? true;

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' && requireAuth) {
      console.log('🚪 Session ended - redirecting to sign in');
      
      // Call cleanup callback if provided
      if (options?.onSessionEnd) {
        options.onSessionEnd();
      }

      // Redirect to sign in
      router.push(redirectTo);
    }
  }, [status, requireAuth, redirectTo, router, options]);

  return { session, status, isAuthenticated: status === 'authenticated' };
}
