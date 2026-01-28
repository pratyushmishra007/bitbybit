'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '600px',
        background: '#fff',
        padding: '60px 40px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '120px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px',
          lineHeight: '1',
        }}>
          404
        </div>
        
        <h1 style={{
          fontSize: '32px',
          color: '#1a1a1a',
          marginBottom: '16px',
          fontWeight: '600',
        }}>
          Page Not Found
        </h1>
        
        <p style={{
          color: '#6c757d',
          fontSize: '16px',
          marginBottom: '32px',
          lineHeight: '1.6',
        }}>
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link
            href="/"
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Go to Homepage
          </Link>
          
          <Link
            href="/courses"
            style={{
              padding: '14px 32px',
              background: '#fff',
              color: '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#667eea';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = '#667eea';
            }}
          >
            Browse Courses
          </Link>
        </div>

        <div style={{
          marginTop: '40px',
          paddingTop: '30px',
          borderTop: '1px solid #e9ecef',
        }}>
          <p style={{
            color: '#868e96',
            fontSize: '14px',
            marginBottom: '12px',
          }}>
            Need help? Here are some useful links:
          </p>
          <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <Link href="/dashboard" style={{ color: '#667eea', textDecoration: 'none', fontSize: '14px' }}>
              Dashboard
            </Link>
            <Link href="/contests" style={{ color: '#667eea', textDecoration: 'none', fontSize: '14px' }}>
              Contests
            </Link>
            <Link href="/admin" style={{ color: '#667eea', textDecoration: 'none', fontSize: '14px' }}>
              Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
