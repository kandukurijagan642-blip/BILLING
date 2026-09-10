const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwkegJvhM42cPIROIKg5Dlx6py8OnS5NXuIJeyf1Zb3V3Oc_2jyXPS_aDN7uW0t874d/exec';
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1BZnCqi9DPhJxhwUpux1HRfo_PDVn2QLDNDheR0Kf73Q/edit';
const DRIVE_FOLDER = 'Aaryan_Aqua_Billing_Data';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchFromGas(url, options = {}) {
  const mergedHeaders = Object.assign({}, BROWSER_HEADERS, options.headers || {});
  try {
    const res = await fetch(url, {
      ...options,
      headers: mergedHeaders,
      redirect: 'follow'
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.warn("GAS returned non-JSON:", text.substring(0, 300));
      return { ok: false, error: "Non-JSON response from Google Apps Script", raw: text.substring(0, 300) };
    }
  } catch (netErr) {
    console.error("fetchFromGas network error:", netErr);
    return { ok: false, error: netErr.message };
  }
}

// --- HIGH-SPEED IN-MEMORY CACHE (Sub-20ms Response Time) ---
let cachedSyncData = null;
let cacheTimestamp = 0;
let isRefreshing = false;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

// Seed initial memory cache from bundled data files if available
try {
  const invoicesData = require('../../data/invoices.json');
  const productsData = require('../../data/products.json');
  const partiesData = require('../../data/parties.json');
  cachedSyncData = {
    ok: true,
    invoices: invoicesData || [],
    products: productsData || [],
    parties: partiesData || [],
    globalSettings: null,
    deletedInvoiceIds: [],
    deletedProductIds: [],
    deletedPartyIds: [],
    storage: {
      provider: 'Google Drive & Google Sheets Master Database',
      connected: true,
      spreadsheetUrl: SPREADSHEET_URL,
      driveFolder: DRIVE_FOLDER,
      lastSync: new Date().toISOString()
    }
  };
  cacheTimestamp = Date.now();
} catch (seedErr) {
  console.log("Memory seed notice:", seedErr.message);
}

async function refreshCacheFromGas() {
  if (isRefreshing) return cachedSyncData;
  isRefreshing = true;
  try {
    const data = await fetchFromGas(`${SCRIPT_URL}?action=sync`);
    if (data && (data.invoices || data.products || data.ok)) {
      cachedSyncData = {
        ok: true,
        invoices: data.invoices || (cachedSyncData ? cachedSyncData.invoices : []),
        products: data.products || (cachedSyncData ? cachedSyncData.products : []),
        parties: data.parties || (cachedSyncData ? cachedSyncData.parties : []),
        globalSettings: data.globalSettings || data.settings || null,
        deletedInvoiceIds: [],
        deletedProductIds: [],
        deletedPartyIds: [],
        storage: {
          provider: 'Google Drive & Google Sheets Master Database',
          connected: true,
          spreadsheetUrl: SPREADSHEET_URL,
          driveFolder: DRIVE_FOLDER,
          lastSync: new Date().toISOString()
        }
      };
      cacheTimestamp = Date.now();
    }
  } catch (err) {
    console.warn("Background cache refresh warning:", err);
  } finally {
    isRefreshing = false;
  }
  return cachedSyncData;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const rawPath = event.path || '';
  const path = rawPath.replace(/^(\/\.netlify\/functions\/api|\/api)/, '').replace(/\/$/, '') || '/sync';

  try {
    // 1. GET /sync (Sub-20ms In-Memory Response + Stale-While-Revalidate)
    if (path === '/sync' && event.httpMethod === 'GET') {
      const ifNoneMatch = event.headers['if-none-match'] || event.headers['If-None-Match'];
      const currentEtag = `W/"sync-${cacheTimestamp}"`;

      // Return 304 if client cache matches
      if (ifNoneMatch && cachedSyncData && ifNoneMatch === currentEtag) {
        return {
          statusCode: 304,
          headers: {
            ...headers,
            'ETag': currentEtag,
            'Cache-Control': 'public, max-age=5, stale-while-revalidate=60'
          }
        };
      }

      // Fast-path: return cached data immediately (< 10ms)
      if (cachedSyncData) {
        if (Date.now() - cacheTimestamp > CACHE_TTL_MS && !isRefreshing) {
          refreshCacheFromGas().catch(() => {});
        }
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'ETag': currentEtag,
            'Cache-Control': 'public, max-age=5, stale-while-revalidate=60'
          },
          body: JSON.stringify(cachedSyncData)
        };
      }

      // Initial cold start fallback
      const freshData = await refreshCacheFromGas();
      const freshEtag = `W/"sync-${cacheTimestamp}"`;
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'ETag': freshEtag,
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=60'
        },
        body: JSON.stringify(freshData || {
          ok: true,
          invoices: [],
          products: [],
          parties: [],
          globalSettings: null,
          storage: { connected: true, provider: 'Google Drive & Google Sheets Master Database' }
        })
      };
    }

    // 2. Storage status
    if (path === '/storage/status' && event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          provider: 'Google Drive & Google Sheets Master Database',
          connected: true,
          spreadsheetUrl: SPREADSHEET_URL,
          driveFolder: DRIVE_FOLDER,
          scriptUrl: SCRIPT_URL,
          lastSync: new Date(cacheTimestamp || Date.now()).toISOString()
        })
      };
    }

    // 3. WhatsApp Status on Netlify (Serverless Notice)
    if (path.startsWith('/whatsapp')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'DISCONNECTED',
          isReady: false,
          webDirect: false,
          clientInfo: null,
          message: 'WhatsApp automated background bot runs locally on your shop server (server.js).'
        })
      };
    }

    // 4. POST Mutations (Instant Local Cache Update + Async Google Sheets Sync)
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (path === '/google-drive/sync-now') {
        const data = await refreshCacheFromGas();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            message: 'All data synchronized with Google Drive & Google Sheets Master Database!',
            invoicesCount: ((data && data.invoices) || []).length,
            productsCount: ((data && data.products) || []).length,
            partiesCount: ((data && data.parties) || []).length,
            spreadsheetUrl: SPREADSHEET_URL,
            timestamp: new Date().toISOString()
          })
        };
      }

      let gasPayload = null;

      if (path === '/invoices') {
        gasPayload = { action: 'save_invoice', invoice: body };
        if (cachedSyncData) {
          if (!cachedSyncData.invoices) cachedSyncData.invoices = [];
          const idx = cachedSyncData.invoices.findIndex(i => i && (i.id === body.id || i.invoiceNo === body.invoiceNo));
          if (idx > -1) {
            cachedSyncData.invoices[idx] = body;
          } else {
            cachedSyncData.invoices.push(body);
          }
          cacheTimestamp = Date.now();
        }
      } else if (path === '/invoices/delete') {
        gasPayload = { action: 'delete_record', type: 'invoice', id: body.id };
        if (cachedSyncData && cachedSyncData.invoices) {
          cachedSyncData.invoices = cachedSyncData.invoices.filter(i => i && i.id !== body.id);
          cacheTimestamp = Date.now();
        }
      } else if (path === '/products') {
        gasPayload = { action: 'save_products', products: body };
        if (cachedSyncData) {
          cachedSyncData.products = body;
          cacheTimestamp = Date.now();
        }
      } else if (path === '/products/delete') {
        gasPayload = { action: 'delete_record', type: 'product', id: body.id };
        if (cachedSyncData && cachedSyncData.products) {
          cachedSyncData.products = cachedSyncData.products.filter(p => p && p.id !== body.id);
          cacheTimestamp = Date.now();
        }
      } else if (path === '/parties') {
        gasPayload = { action: 'save_parties', parties: body };
        if (cachedSyncData) {
          cachedSyncData.parties = body;
          cacheTimestamp = Date.now();
        }
      } else if (path === '/parties/delete') {
        gasPayload = { action: 'delete_record', type: 'party', id: body.id };
        if (cachedSyncData && cachedSyncData.parties) {
          cachedSyncData.parties = cachedSyncData.parties.filter(p => p && p.id !== body.id);
          cacheTimestamp = Date.now();
        }
      } else if (path === '/settings') {
        gasPayload = { action: 'save_settings', settings: body };
        if (cachedSyncData) {
          cachedSyncData.globalSettings = body;
          cacheTimestamp = Date.now();
        }
      } else if (path === '/invoices/upload-pdf') {
        gasPayload = {
          action: 'upload_pdf',
          filename: body.filename,
          invoiceNo: body.invoiceNo,
          invoiceId: body.id,
          pdfBase64: body.pdfBase64
        };
      }

      if (gasPayload) {
        const gasData = await fetchFromGas(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gasPayload)
        });

        if (gasData && gasData.ok) {
          if (gasData.viewUrl && !gasData.pdfUrl) gasData.pdfUrl = gasData.viewUrl;
          if (gasData.viewUrl && !gasData.googleDriveUrl) gasData.googleDriveUrl = gasData.viewUrl;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(gasData || { ok: true, success: true })
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, path })
    };

  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, error: 'Serverless function notice', message: err.message })
    };
  }
};
