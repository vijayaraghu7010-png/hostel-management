/* --- Supabase PostgREST Client Configuration --- */

const SUPABASE_URL = 'https://jxdsuhutztvuoknkypay.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZHN1aHV0enR2dW9rbmt5cGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTc1NjEsImV4cCI6MjA5NzkzMzU2MX0.Att11tBimrBLGMCd88KGat1MNP1c1mgwTPoG6Be9W58';

async function supabaseFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  let finalEndpoint = endpoint;

  // FIX 3: Append cache-busting timestamp `_t=Date.now()` to every GET request
  if (method === 'GET' && !finalEndpoint.includes('_t=')) {
    const separator = finalEndpoint.includes('?') ? '&' : '?';
    finalEndpoint = `${finalEndpoint}${separator}_t=${Date.now()}`;
  }

  const url = `${SUPABASE_URL}${finalEndpoint}`;

  // FIX 3: Mandatory HTTP cache headers on every request
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...options.headers
  };

  const config = {
    ...options,
    headers: headers
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText || response.statusText}`);
    }

    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch (err) {
      return null;
    }
  } catch (error) {
    console.error(`Supabase Client Fetch Error on [${url}]:`, error);
    throw error;
  }
}
