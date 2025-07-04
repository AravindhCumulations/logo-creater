import * as React from 'react';
import { useEffect, useState } from 'react';

const LOGO_API_URL = 'https://bpshrp37ol.execute-api.us-east-1.amazonaws.com/v1/';

const LogoPage: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogo = async () => {
    setLoading(true);
    setError(null);
    setLogoUrl(null);
    try {
        console.log("fetching logo");
        
      const res = await fetch(LOGO_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: '/get-logo-or-collage',
          httpMethod: 'GET',
        }),
      });
      const responseEvent = await res.json();
      console.log(responseEvent);
      
      const body = typeof responseEvent.body === 'string'
        ? JSON.parse(responseEvent.body)
        : responseEvent.body;
      setLogoUrl(body.fileUrl);
      console.log("logoUrl", body);
    } catch (err: any) {
      setError('Failed to fetch logo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogo();
    // Optionally, you could add a refresh button instead of relying on page reload
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
      <h2>Logo Page</h2>
      {loading && <p>Loading logo...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {logoUrl && (
        <img src={logoUrl} alt="Logo" style={{ maxWidth: 300, maxHeight: 300 }} />
      )}
      <button onClick={fetchLogo} style={{ marginTop: 20 }}>Refresh Logo</button>
    </div>
  );
};

export default LogoPage; 