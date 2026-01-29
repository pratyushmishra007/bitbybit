/**
 * Get the base URL for the application
 * Automatically detects environment and returns the appropriate URL
 * - Development: http://localhost:3000
 * - Production: https://bitbybit-tmga.vercel.app
 */
export function getBaseUrl(): string {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Check for explicit environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Check if we're on Vercel (production)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  return 'http://localhost:3000';
}

/**
 * Get the full URL for a path
 * @param path - The path to append to the base URL (e.g., '/api/auth/callback')
 */
export function getFullUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
