'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can log to an error reporting service here
    // e.g., Sentry.captureException(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f9fa',
          padding: '20px',
        }}>
          <div style={{
            maxWidth: '500px',
            background: '#fff',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
            }}>
              😔
            </div>
            <h1 style={{
              fontSize: '24px',
              color: '#1a1a1a',
              marginBottom: '12px',
              fontWeight: '600',
            }}>
              Oops! Something went wrong
            </h1>
            <p style={{
              color: '#6c757d',
              marginBottom: '24px',
              lineHeight: '1.6',
            }}>
              We're sorry for the inconvenience. The error has been logged and we'll fix it soon.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                marginBottom: '20px',
                textAlign: 'left',
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#dc3545',
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                  Error Details (Dev Only)
                </summary>
                <pre style={{
                  marginTop: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  background: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#495057',
                  border: '1px solid #ced4da',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
