'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

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
        maxWidth: '600px',
        background: '#fff',
        padding: '50px 40px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 24px',
          background: '#fee',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
        }}>
          ⚠️
        </div>

        <h1 style={{
          fontSize: '28px',
          color: '#1a1a1a',
          marginBottom: '12px',
          fontWeight: '600',
        }}>
          Something Went Wrong
        </h1>

        <p style={{
          color: '#6c757d',
          marginBottom: '24px',
          lineHeight: '1.6',
          fontSize: '16px',
        }}>
          We encountered an unexpected error. Don't worry, our team has been notified and we're working on it.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details style={{
            marginBottom: '24px',
            textAlign: 'left',
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
          }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: '600',
              color: '#dc3545',
              marginBottom: '8px',
            }}>
              🔍 Error Details (Development Mode)
            </summary>
            <pre style={{
              fontSize: '12px',
              color: '#495057',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginTop: '12px',
              lineHeight: '1.5',
            }}>
              <strong>Message:</strong> {error.message}
              {'\n\n'}
              <strong>Stack:</strong>
              {'\n'}
              {error.stack}
              {error.digest && (
                <>
                  {'\n\n'}
                  <strong>Digest:</strong> {error.digest}
                </>
              )}
            </pre>
          </details>
        )}

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={reset}
            style={{
              padding: '14px 28px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#007bff'}
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '14px 28px',
              background: '#fff',
              color: '#495057',
              border: '1px solid #ced4da',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            Go to Homepage
          </button>
        </div>

        <p style={{
          marginTop: '32px',
          color: '#868e96',
          fontSize: '14px',
        }}>
          If this problem persists, please contact our support team.
        </p>
      </div>
    </div>
  );
}
