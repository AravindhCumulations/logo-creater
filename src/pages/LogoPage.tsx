import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const LOGO_API_URL = 'https://bpshrp37ol.execute-api.us-east-1.amazonaws.com/v1/';
const HEADER_GRADIENT = 'linear-gradient(90deg, #ff914d 0%, #794585 100%)';
const BUTTON_GRADIENT = 'linear-gradient(90deg, #ff914d 0%, #794585 100%)';
const FOOTER_COLOR = '#263588';

const LogoPage: React.FC = () => {
  const { bucketname } = useParams();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(180); // 30 seconds

  const fetchLogo = async () => {
    setLoading(true);
    setError(null);
    setLogoUrl(null);
    try {
      const res = await fetch(LOGO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: '/get-logo-or-collage',
          httpMethod: 'GET',
          bucketname: bucketname
        }),
      });
      const responseEvent = await res.json();
      const body = typeof responseEvent.body === 'string'
        ? JSON.parse(responseEvent.body)
        : responseEvent.body;
      setLogoUrl(body.fileUrl);
    } catch (err: any) {
      let msg = 'Failed to fetch logo.';
      if (err?.message && typeof err.message === 'string' && err.message.toLowerCase().includes('bucket')) {
        msg = 'Incorrect bucket name. Please check and try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogo();
  }, []);

  // Timer effect
  useEffect(() => {
    if (timer === 0) {
      fetchLogo();
      setTimer(180);
      return;
    }
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Format timer as mm:ss
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '90vh', background: 'linear-gradient(120deg, #fff7f0 0%, #f3eaff 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        width: '100%',
        padding: '10px 0 8px 0',
        background: HEADER_GRADIENT,
        color: 'white',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 24,
        letterSpacing: 1,
        boxShadow: '0 2px 8px rgba(121, 69, 133, 0.08)'
      }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 26 }}>Collage</span>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '0',
        }}
      >
        <div
          style={{
            borderRadius: 0,
            boxShadow: 'none',
            padding: '3vw 6vw',
            maxWidth: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
          className="responsive-card logo-card"
        >
          <h2 style={{ color: '#263588', fontWeight: 700, marginBottom: 24, fontSize: 24 }}>Logo</h2>
          <div style={{ marginBottom: 12, color: '#263588', fontWeight: 500, fontSize: 15 }}>
            Next refresh in: {formatTimer(timer)}
          </div>
          {loading && <p style={{ color: '#794585', fontWeight: 500 }}>Loading logo...</p>}
          {error && <p style={{ color: '#ff914d', fontWeight: 500 }}>{error}</p>}
          {logoUrl && (
            <div style={{ width: '100%', height: '100%', marginBottom: 16, maxHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={logoUrl}
                alt="Logo"
                className="responsive-logo-image"
                style={{
                  width: '100%',
                  maxWidth: 520,
                  height: 'auto',
                  maxHeight: '70vh',
                  borderRadius: 12,
                  background: '#f3eaff',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}
          <button
            onClick={fetchLogo}
            style={{
              marginTop: 12,
              padding: '10px 28px',
              borderRadius: 8,
              border: 'none',
              background: BUTTON_GRADIENT,
              color: 'white',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #ff914d33',
              transition: 'background 0.2s',
              width: '100%',
              maxWidth: 240,
            }}
          >
            Refresh Logo
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        width: '100%',
        background: FOOTER_COLOR,
        color: 'white',
        textAlign: 'center',
        padding: '18px 0 12px 0',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: 0.5,
        marginTop: 'auto',
        boxShadow: '0 -2px 8px rgba(121, 69, 133, 0.08)'
      }}>
        &copy; {new Date().getFullYear()} The Thought Bulb. All rights reserved.
      </footer>
    </div>
  );
};

export default LogoPage; 