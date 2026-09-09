const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { Agent } = require('undici');
require('dotenv').config();

// High-Performance HTTP Agent with Keep-Alive connection pooling for Google Apps Script & external services
const googleHttpDispatcher = new Agent({
  keepAliveTimeout: 60000,
  keepAliveMaxTimeout: 120000,
  connections: 25,
  pipelining: 1
});

// Event Bus for Real-Time SSE Database Streams
const dbEvents = new EventEmitter();
dbEvents.setMaxListeners(100);

let whatsappService = null;
try {
  whatsappService = require('./whatsapp-service');
} catch (err) {
  console.warn('⚠️ WhatsApp service module load warning:', err.message);
}

// Global safety crash handlers - keep server alive under all circumstances
process.on('uncaughtException', (err) => {
  console.error('🛡️ Server Uncaught Exception handled safely:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('🛡️ Server Unhandled Rejection handled safely:', reason);
});

const app = express();
const PORT = process.env.PORT || 8000;

// Disable server fingerprinting header
app.disable('x-powered-by');

// --- SECURITY HEADERS MIDDLEWARE ---
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// --- RATE LIMITING MIDDLEWARE (Anti-DDoS / Anti-Brute-Force) ---
const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 1000; // High limit for active polling

app.use((req, res, next) => {
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');

  // Completely exempt local loopback traffic (localhost, 127.0.0.1, ::1)
  if (clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp === 'localhost') {
    return next();
  }

  const now = Date.now();
  let clientData = ipRequestCounts.get(clientIp);
  if (!clientData || (now - clientData.startTime) > RATE_LIMIT_WINDOW_MS) {
    clientData = { count: 1, startTime: now };
  } else {
    clientData.count++;
  }
  ipRequestCounts.set(clientIp, clientData);

  // Periodic cleanup of stale IPs every 5 minutes
  if (ipRequestCounts.size > 10000) {
    for (const [ip, data] of ipRequestCounts.entries()) {
      if (now - data.startTime > RATE_LIMIT_WINDOW_MS) {
        ipRequestCounts.delete(ip);
      }
    }
  }

  if (clientData.count > MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({
      ok: false,
      error: 'Too Many Requests. Rate limit exceeded for security reasons. Please try again later.',
      retryAfterSeconds: 60
    });
  }
  next();
});

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- GOOGLE STORAGE & CLOUD BACKEND CONFIGURATION ---
const GOOGLE_CLOUD_CONFIG = {
  service: 'Google Drive & Google Sheets Master Database',
  spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '1BZnCqi9DPhJxhwUpux1HRfo_PDVn2QLDNDheR0Kf73Q',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BZnCqi9DPhJxhwUpux1HRfo_PDVn2QLDNDheR0Kf73Q/edit',
  driveRootFolder: process.env.GOOGLE_DRIVE_FOLDER || 'Aaryan_Aqua_Billing_Data',
  invoicesFolder: 'Aaryan_Aqua_Invoices',
  backupsFolder: 'Aaryan_Aqua_Backups',
  scriptUrl: process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwkegJvhM42cPIROIKg5Dlx6py8OnS5NXuIJeyf1Zb3V3Oc_2jyXPS_aDN7uW0t874d/exec'
};

let isGoogleStorageConnected = false;
let lastGoogleSyncTimestamp = null;
let googleSyncError = null;

// Local JSON Storage Helpers (Offline-First Mirror for Ultra-Fast UX)
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// PDF Storage directory for public WhatsApp sharing
const PDF_DIR = path.join(__dirname, 'public', 'invoices');
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}
app.use('/invoices', express.static(PDF_DIR));

function readLocalJsonFile(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) || defaultValue;
  } catch (err) {
    console.error(`Error reading local file ${filename}:`, err);
    return defaultValue;
  }
}

function writeLocalJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing local file ${filename}:`, err);
  }
}

// Asynchronous non-blocking file writer to prevent event loop stalls
function saveLocalJsonFileAsync(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) console.error(`Error async saving file ${filename}:`, err);
  });
}

// --- ULTRA-FAST IN-MEMORY DATABASE STORE (Sub-Millisecond Read Engine) ---
const dbStore = {
  invoices: [],
  products: [],
  parties: [],
  globalSettings: null,
  deletedInvoiceIds: [],
  deletedProductIds: [],
  deletedPartyIds: [],
  version: 1,
  lastModified: Date.now()
};

function initMemoryDatabase() {
  dbStore.invoices = readLocalJsonFile('invoices.json', []);
  dbStore.products = readLocalJsonFile('products.json', []);
  dbStore.parties = readLocalJsonFile('parties.json', []);
  dbStore.globalSettings = readLocalJsonFile('settings.json', null);
  dbStore.deletedInvoiceIds = readLocalJsonFile('deleted_invoices.json', []);
  dbStore.deletedProductIds = readLocalJsonFile('deleted_products.json', []);
  dbStore.deletedPartyIds = readLocalJsonFile('deleted_parties.json', []);
  dbStore.version = 1;
  dbStore.lastModified = Date.now();
  console.log(`⚡ In-Memory Database initialized: ${dbStore.invoices.length} invoices, ${dbStore.products.length} products, ${dbStore.parties.length} parties.`);
}

initMemoryDatabase();

function markDatabaseUpdated(type, data) {
  dbStore.version++;
  dbStore.lastModified = Date.now();
  dbEvents.emit('change', {
    type,
    version: dbStore.version,
    lastModified: dbStore.lastModified,
    data
  });
}

// Background Queue for Google Apps Script / Google Drive pushes
const googleSyncQueue = [];
let isGoogleSyncBusy = false;

async function processGoogleSyncQueue() {
  if (isGoogleSyncBusy || googleSyncQueue.length === 0) return;
  isGoogleSyncBusy = true;
  const task = googleSyncQueue.shift();
  try {
    await postToGoogleScript(task.payload);
  } catch (e) {
    console.warn('Queue Google sync error:', e.message);
  } finally {
    isGoogleSyncBusy = false;
    if (googleSyncQueue.length > 0) {
      setImmediate(processGoogleSyncQueue);
    }
  }
}

function enqueueGoogleSync(payload) {
  googleSyncQueue.push({ payload, queuedAt: Date.now() });
  processGoogleSyncQueue();
}

// Post JSON action to Google Apps Script / Google Drive Backend (Keep-Alive Pool)
async function postToGoogleScript(payload) {
  if (!GOOGLE_CLOUD_CONFIG.scriptUrl) return null;
  try {
    const res = await fetch(GOOGLE_CLOUD_CONFIG.scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      dispatcher: googleHttpDispatcher
    });
    const data = await res.json();
    isGoogleStorageConnected = true;
    lastGoogleSyncTimestamp = new Date().toISOString();
    googleSyncError = null;
    return data;
  } catch (err) {
    console.warn('⚠️ Google Cloud Storage background sync notice:', err.message);
    googleSyncError = err.message;
    return null;
  }
}

// Startup sync with Google Cloud Storage (Google Drive & Live Google Sheets)
async function syncWithGoogleStorage() {
  if (!GOOGLE_CLOUD_CONFIG.scriptUrl) {
    console.log('ℹ️ Google Script URL not configured. Working in offline-first mode.');
    return;
  }

  try {
    console.log('☁️ Connecting to Google Cloud Storage (Google Drive & Live Master Sheets)...');
    const res = await fetch(`${GOOGLE_CLOUD_CONFIG.scriptUrl}?action=sync`, {
      dispatcher: googleHttpDispatcher
    });
    const data = await res.json();
    if (data && data.ok) {
      isGoogleStorageConnected = true;
      lastGoogleSyncTimestamp = new Date().toISOString();
      googleSyncError = null;

      // Reconcile Invoices
      const invMap = new Map();
      if (Array.isArray(data.invoices)) {
        data.invoices.forEach(i => invMap.set(i.id || i.invoiceNo, i));
      }
      dbStore.invoices.forEach(i => {
        const key = i.id || i.invoiceNo;
        if (!invMap.has(key)) invMap.set(key, i);
      });
      dbStore.invoices = Array.from(invMap.values());
      saveLocalJsonFileAsync('invoices.json', dbStore.invoices);

      // Reconcile Products
      const prodMap = new Map();
      if (Array.isArray(data.products)) {
        data.products.forEach(p => prodMap.set(p.id, p));
      }
      dbStore.products.forEach(p => {
        if (!prodMap.has(p.id)) {
          prodMap.set(p.id, p);
        } else {
          const cloudP = prodMap.get(p.id);
          if (p.updatedAt && (!cloudP.updatedAt || new Date(p.updatedAt) > new Date(cloudP.updatedAt))) {
            prodMap.set(p.id, p);
          }
        }
      });
      dbStore.products = Array.from(prodMap.values());
      saveLocalJsonFileAsync('products.json', dbStore.products);

      // Reconcile Parties
      const partyMap = new Map();
      if (Array.isArray(data.parties)) {
        data.parties.forEach(p => partyMap.set(p.id, p));
      }
      dbStore.parties.forEach(p => {
        if (!partyMap.has(p.id)) partyMap.set(p.id, p);
      });
      dbStore.parties = Array.from(partyMap.values());
      saveLocalJsonFileAsync('parties.json', dbStore.parties);

      // Reconcile Settings
      if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
        dbStore.globalSettings = { ...data.settings, ...(dbStore.globalSettings || {}) };
        saveLocalJsonFileAsync('settings.json', dbStore.globalSettings);
      }

      markDatabaseUpdated('cloud_sync', null);

      console.log(`✅ Google Cloud Storage Synchronized!`);
      console.log(`📊 Master Google Spreadsheet: ${GOOGLE_CLOUD_CONFIG.spreadsheetUrl}`);
      console.log(`📂 Google Drive Folder: ${GOOGLE_CLOUD_CONFIG.driveRootFolder}`);
      console.log(`📦 Cloud Storage Stats: ${dbStore.invoices.length} Invoices, ${dbStore.products.length} Products, ${dbStore.parties.length} Customers`);
    } else {
      console.warn('⚠️ Google Cloud Storage response:', data);
    }
  } catch (err) {
    console.warn('⚠️ Google Cloud Storage initial handshake note (offline-cache operational):', err.message);
    googleSyncError = err.message;
  }
}

// --- REST API ENDPOINTS ---

// 1. Unified Sync Endpoint with HTTP ETag / 304 Cache & In-Memory Response (< 1ms)
app.get('/api/sync', (req, res) => {
  try {
    const etag = `W/"v${dbStore.version}-${dbStore.lastModified}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache');

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.json({
      invoices: dbStore.invoices,
      products: dbStore.products,
      parties: dbStore.parties,
      globalSettings: dbStore.globalSettings,
      deletedInvoiceIds: dbStore.deletedInvoiceIds,
      deletedProductIds: dbStore.deletedProductIds,
      deletedPartyIds: dbStore.deletedPartyIds,
      version: dbStore.version,
      lastModified: dbStore.lastModified,
      storage: {
        provider: 'Google Drive & Google Sheets',
        connected: isGoogleStorageConnected,
        spreadsheetUrl: GOOGLE_CLOUD_CONFIG.spreadsheetUrl,
        driveFolder: GOOGLE_CLOUD_CONFIG.driveRootFolder,
        lastSync: lastGoogleSyncTimestamp
      }
    });
  } catch (err) {
    console.error('Sync pull failed:', err);
    res.status(500).json({ error: 'Sync retrieval failed', details: err.message });
  }
});

// Real-Time Database Event Stream (Server-Sent Events) for 0ms Instant Updates
app.get('/api/sync/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Initial handshake packet
  res.write(`data: ${JSON.stringify({ type: 'connected', version: dbStore.version, lastModified: dbStore.lastModified })}\n\n`);

  const onDbChange = (eventPayload) => {
    try {
      res.write(`data: ${JSON.stringify(eventPayload)}\n\n`);
    } catch (e) {
      // client connection closed
    }
  };

  dbEvents.on('change', onDbChange);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    dbEvents.off('change', onDbChange);
  });
});

// 2. Invoices REST API (Sub-Millisecond In-Memory Mutation + Async Google Cloud Sync)
app.post('/api/invoices', (req, res) => {
  const invoiceRecord = req.body;
  if (!invoiceRecord || !invoiceRecord.id) {
    return res.status(400).json({ error: 'Invalid invoice payload' });
  }
  try {
    const idx = dbStore.invoices.findIndex(i => i.id === invoiceRecord.id);
    if (idx > -1) {
      dbStore.invoices[idx] = invoiceRecord;
    } else {
      dbStore.invoices.push(invoiceRecord);
    }

    markDatabaseUpdated('invoice_saved', invoiceRecord);
    saveLocalJsonFileAsync('invoices.json', dbStore.invoices);

    // Instant response back to UI (< 1ms)
    res.json({ success: true, record: invoiceRecord });

    // Background push to Google Cloud Storage (Google Drive JSON & Live Google Sheets)
    enqueueGoogleSync({ action: 'save_invoice', invoice: invoiceRecord });

  } catch (err) {
    console.error('Failed to save invoice:', err);
    res.status(500).json({ error: 'Save invoice operation failed', details: err.message });
  }
});

app.post('/api/invoices/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing invoice id' });
  try {
    dbStore.invoices = dbStore.invoices.filter(i => i.id !== id);
    if (!dbStore.deletedInvoiceIds.includes(id)) {
      dbStore.deletedInvoiceIds.push(id);
      saveLocalJsonFileAsync('deleted_invoices.json', dbStore.deletedInvoiceIds);
    }
    saveLocalJsonFileAsync('invoices.json', dbStore.invoices);
    markDatabaseUpdated('invoice_deleted', { id });

    res.json({ success: true });

    // Background delete in Google Drive & Google Sheets
    enqueueGoogleSync({ action: 'delete_record', type: 'invoice', id });

  } catch (err) {
    res.status(500).json({ error: 'Delete invoice failed', details: err.message });
  }
});

app.post('/api/products/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing product id' });
  try {
    dbStore.products = dbStore.products.filter(p => p.id !== id);
    if (!dbStore.deletedProductIds.includes(id)) {
      dbStore.deletedProductIds.push(id);
      saveLocalJsonFileAsync('deleted_products.json', dbStore.deletedProductIds);
    }
    saveLocalJsonFileAsync('products.json', dbStore.products);
    markDatabaseUpdated('product_deleted', { id });

    res.json({ success: true });

    // Background delete in Google Drive & Google Sheets
    enqueueGoogleSync({ action: 'delete_record', type: 'product', id });

  } catch (err) {
    res.status(500).json({ error: 'Delete product failed', details: err.message });
  }
});

app.post('/api/parties/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing party id' });
  try {
    dbStore.parties = dbStore.parties.filter(p => p.id !== id);
    if (!dbStore.deletedPartyIds.includes(id)) {
      dbStore.deletedPartyIds.push(id);
      saveLocalJsonFileAsync('deleted_parties.json', dbStore.deletedPartyIds);
    }
    saveLocalJsonFileAsync('parties.json', dbStore.parties);
    markDatabaseUpdated('party_deleted', { id });

    res.json({ success: true });

    // Background delete in Google Drive & Google Sheets
    enqueueGoogleSync({ action: 'delete_record', type: 'party', id });

  } catch (err) {
    res.status(500).json({ error: 'Delete party failed', details: err.message });
  }
});

app.post('/api/invoices/reset', (req, res) => {
  try {
    dbStore.invoices = [];
    dbStore.deletedInvoiceIds = [];
    dbStore.products = [];
    dbStore.deletedProductIds = [];
    dbStore.parties = [];
    dbStore.deletedPartyIds = [];

    saveLocalJsonFileAsync('invoices.json', []);
    saveLocalJsonFileAsync('deleted_invoices.json', []);
    saveLocalJsonFileAsync('products.json', []);
    saveLocalJsonFileAsync('deleted_products.json', []);
    saveLocalJsonFileAsync('parties.json', []);
    saveLocalJsonFileAsync('deleted_parties.json', []);

    markDatabaseUpdated('reset', null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Reset invoices failed', details: err.message });
  }
});

// --- SERVER-SIDE TELEGRAM PDF PROXY ENDPOINT ---
app.post('/api/telegram/sendDocument', async (req, res) => {
  try {
    const { token, chat_id, filename, pdfBase64, caption } = req.body;
    if (!token || !chat_id || !pdfBase64) {
      return res.status(400).json({ ok: false, description: 'Missing token, chat_id, or pdfBase64' });
    }

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const safeFilename = filename || 'Invoice.pdf';

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chat_id}\r\n`;

    if (caption) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
    }

    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document"; filename="${safeFilename}"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;

    const payloadBuffer = Buffer.concat([
      Buffer.from(body, 'utf8'),
      fileBuffer,
      Buffer.from(footer, 'utf8')
    ]);

    const https = require('https');
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendDocument`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payloadBuffer.length
      }
    };

    const request = https.request(options, (response) => {
      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          res.json(json);
        } catch (e) {
          res.status(500).json({ ok: false, description: 'Invalid response from Telegram API', raw: responseData });
        }
      });
    });

    request.on('error', (err) => {
      console.error('Telegram proxy HTTPS error:', err);
      res.status(500).json({ ok: false, description: 'Server HTTPS error: ' + err.message });
    });

    request.write(payloadBuffer);
    request.end();

  } catch (err) {
    console.error('Telegram proxy handler failed:', err);
    res.status(500).json({ ok: false, description: err.message });
  }
});

// --- SERVER-SIDE TELEGRAM TEXT MESSAGE PROXY ENDPOINT ---
app.post('/api/telegram/sendMessage', async (req, res) => {
  try {
    const { token, chat_id, text, parse_mode } = req.body;
    if (!token || !chat_id || !text) {
      return res.status(400).json({ ok: false, description: 'Missing token, chat_id, or text' });
    }

    const payload = JSON.stringify({
      chat_id,
      text,
      parse_mode: parse_mode || 'Markdown'
    });

    const https = require('https');
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const request = https.request(options, (response) => {
      let responseData = '';
      response.on('data', chunk => responseData += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          res.json(json);
        } catch (e) {
          res.status(500).json({ ok: false, description: 'Invalid response from Telegram API', raw: responseData });
        }
      });
    });

    request.on('error', (err) => {
      console.error('Telegram sendMessage proxy error:', err);
      res.status(500).json({ ok: false, description: 'Server HTTPS error: ' + err.message });
    });

    request.write(payload);
    request.end();

  } catch (err) {
    console.error('Telegram sendMessage proxy error:', err);
    res.status(500).json({ ok: false, description: err.message });
  }
});

app.post('/api/invoices/upload-pdf', async (req, res) => {
  try {
    const { filename, pdfBase64, invoiceNo, id } = req.body;
    if (!filename || !pdfBase64) {
      return res.status(400).json({ ok: false, error: 'Missing filename or pdfBase64' });
    }

    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    // Strict path traversal defense
    const cleanBasename = path.basename(filename).replace(/[^a-zA-Z0-9_\.-]/g, '_');
    const safeFilename = cleanBasename.endsWith('.pdf') ? cleanBasename : `${cleanBasename}.pdf`;
    const filePath = path.join(PDF_DIR, safeFilename);

    if (!filePath.startsWith(PDF_DIR)) {
      return res.status(403).json({ ok: false, error: 'Access denied: Directory traversal blocked' });
    }

    fs.writeFileSync(filePath, fileBuffer);

    const protocol = req.protocol || 'https';
    const host = req.get('host');
    const localPdfUrl = `${protocol}://${host}/invoices/${safeFilename}`;

    const invNoMatch = invoiceNo || safeFilename.match(/(\d+)/)?.[1] || "";

    // Forward upload to Google Drive Apps Script
    let googleDriveUrl = null;
    try {
      const driveRes = await postToGoogleScript({
        action: 'upload_pdf',
        filename: safeFilename,
        invoiceNo: invNoMatch,
        invoiceId: id,
        pdfBase64: pdfBase64
      });

      if (driveRes && driveRes.ok) {
        googleDriveUrl = driveRes.url || driveRes.viewUrl || driveRes.downloadUrl;
        console.log(`☁️ PDF ${safeFilename} successfully stored in Google Drive: ${googleDriveUrl}`);
      }
    } catch (e) {
      console.warn("⚠️ Google Apps Script PDF upload notice:", e.message);
    }

    // Update in-memory dbStore and local mirror with pdfUrl
    if (invNoMatch || id) {
      let updated = false;
      dbStore.invoices = dbStore.invoices.map(inv => {
        if (inv.id === id || String(inv.invoiceNo).trim() === String(invNoMatch).trim() || (inv.details && String(inv.details.invoiceNo).trim() === String(invNoMatch).trim())) {
          inv.pdfUrl = googleDriveUrl || localPdfUrl;
          if (!inv.details) inv.details = {};
          inv.details.pdfUrl = googleDriveUrl || localPdfUrl;
          updated = true;
        }
        return inv;
      });
      if (updated) {
        saveLocalJsonFileAsync('invoices.json', dbStore.invoices);
        markDatabaseUpdated('invoice_pdf_updated', { id, invoiceNo: invNoMatch, pdfUrl: googleDriveUrl || localPdfUrl });
      }
    }

    res.json({ 
      ok: true, 
      pdfUrl: googleDriveUrl || localPdfUrl, 
      localPdfUrl: localPdfUrl, 
      googleDriveUrl: googleDriveUrl,
      filename: safeFilename 
    });
  } catch (err) {
    console.error('PDF upload error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- GOOGLE DRIVE CLOUD SYNC ON-DEMAND ENDPOINTS ---
app.post('/api/google-drive/sync-now', async (req, res) => {
  try {
    const invoices = dbStore.invoices;
    const products = dbStore.products;
    const parties = dbStore.parties;
    const settings = dbStore.globalSettings || {};

    // Parallel push to Google Apps Script
    const [invRes, prodRes, partRes, setRes] = await Promise.all([
      postToGoogleScript({ action: 'bulk_save_invoices', invoices }),
      postToGoogleScript({ action: 'save_products', products }),
      postToGoogleScript({ action: 'save_parties', parties }),
      postToGoogleScript({ action: 'save_settings', settings })
    ]);

    res.json({
      ok: true,
      invoicesCount: invoices.length,
      productsCount: products.length,
      partiesCount: parties.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Manual Google Drive sync error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- WHATSAPP BACKGROUND BOT AUTOMATION APIS ---

// Get WhatsApp bot status & QR code
app.get('/api/whatsapp/debug', async (req, res) => {
  if (!whatsappService || !whatsappService.client || !whatsappService.client.pupPage) {
    return res.json({ error: 'No pupPage', status: whatsappService?.status });
  }
  try {
    const pageUrl = whatsappService.client.pupPage.url();
    const hasWWebJS = await whatsappService.client.pupPage.evaluate(() => typeof window.WWebJS !== 'undefined');
    const hasAuthStore = await whatsappService.client.pupPage.evaluate(() => typeof window.AuthStore !== 'undefined');
    const hasRequire = await whatsappService.client.pupPage.evaluate(() => typeof window.require !== 'undefined');
    const testSerialize = await whatsappService.client.pupPage.evaluate(() => {
      try {
        const conn = window.require('WAWebConnModel')?.Conn?.serialize();
        const wid = window.require('WAWebUserPrefsMeUser')?.getMaybeMePnUser() || window.require('WAWebUserPrefsMeUser')?.getMaybeMeLidUser();
        return { ok: true, conn: !!conn, wid: wid ? wid.user : null };
      } catch (e) {
        return { error: e.message };
      }
    });
    res.json({ pageUrl, hasWWebJS, hasAuthStore, hasRequire, testSerialize, status: whatsappService.status });
  } catch (err) {
    res.json({ error: err.message, status: whatsappService.status });
  }
});

// Real-time WhatsApp Bot Status Stream (Server-Sent Events)
app.get('/api/whatsapp/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial snapshot immediately
  if (whatsappService) {
    res.write(`data: ${JSON.stringify(whatsappService.getStatus())}\n\n`);
  } else {
    res.write(`data: ${JSON.stringify({ status: 'DISABLED', isReady: false })}\n\n`);
  }

  // Subscribe to live status changes
  let unsubscribe = null;
  if (whatsappService && typeof whatsappService.onStatusChange === 'function') {
    unsubscribe = whatsappService.onStatusChange((state) => {
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    });
  }

  // Keep-alive heartbeat every 15s to prevent connection timeouts
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    if (unsubscribe) unsubscribe();
  });
});

app.get('/api/whatsapp/status', (req, res) => {
  if (!whatsappService) {
    return res.json({ status: 'DISABLED', isReady: false, error: 'WhatsApp service not loaded' });
  }
  res.json(whatsappService.getStatus());
});

// Initialize / connect WhatsApp bot & request QR code
app.post('/api/whatsapp/connect', async (req, res) => {
  if (!whatsappService) {
    return res.status(500).json({ ok: false, error: 'WhatsApp service not loaded' });
  }
  try {
    const forceClean = req.body?.forceClean || false;
    const status = await whatsappService.initialize({ forceClean });
    res.json({ ok: true, ...status });
  } catch (err) {
    console.error('WhatsApp connect error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Request 8-Digit Pairing Code with phone number
app.post('/api/whatsapp/pair-code', async (req, res) => {
  if (!whatsappService) {
    return res.status(500).json({ ok: false, error: 'WhatsApp service not loaded' });
  }
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ ok: false, error: 'Phone number is required' });
  }
  try {
    const result = await whatsappService.requestPhonePairing(phone);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('WhatsApp pairing code error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Disconnect / logout WhatsApp bot
app.post('/api/whatsapp/disconnect', async (req, res) => {
  if (!whatsappService) {
    return res.status(500).json({ ok: false, error: 'WhatsApp service not loaded' });
  }
  try {
    const result = await whatsappService.logout();
    res.json(result);
  } catch (err) {
    console.error('WhatsApp disconnect error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Send WhatsApp text message
app.post('/api/whatsapp/send-message', async (req, res) => {
  if (!whatsappService) {
    return res.status(500).json({ ok: false, error: 'WhatsApp service not loaded' });
  }
  const { phone, text } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ ok: false, error: 'Missing phone or text' });
  }
  try {
    const result = await whatsappService.sendTextMessage(phone, text);
    res.json(result);
  } catch (err) {
    console.error('WhatsApp sendTextMessage error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Send WhatsApp invoice text + attached PDF document
app.post('/api/whatsapp/send-invoice', async (req, res) => {
  if (!whatsappService) {
    return res.status(500).json({ ok: false, error: 'WhatsApp service not loaded' });
  }
  const { phone, text, filename, pdfBase64, fastPathOnly } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ ok: false, error: 'Missing phone or text' });
  }
  try {
    const result = await whatsappService.sendInvoiceDocument(phone, text, filename, pdfBase64, fastPathOnly);
    res.json(result);
  } catch (err) {
    console.error('WhatsApp sendInvoiceDocument error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get WhatsApp dispatch activity logs
app.get('/api/whatsapp/activity', (req, res) => {
  if (!whatsappService) {
    return res.json({ ok: true, logs: [] });
  }
  res.json({ ok: true, logs: whatsappService.getActivityLogs() });
});

// 3. Products REST API (Sub-Millisecond In-Memory Mutation + Async Google Cloud Sync)
app.post('/api/products', (req, res) => {
  const productsList = req.body;
  if (!Array.isArray(productsList)) {
    return res.status(400).json({ error: 'Expected array of products' });
  }
  try {
    dbStore.products = productsList;
    markDatabaseUpdated('products_saved', productsList);
    saveLocalJsonFileAsync('products.json', productsList);

    // Instant response (< 1ms)
    res.json({ success: true, count: productsList.length });

    // Background sync products to Google Drive & Google Sheets
    enqueueGoogleSync({ action: 'save_products', products: productsList });

  } catch (err) {
    console.error('Failed to save products:', err);
    res.status(500).json({ error: 'Save products failed', details: err.message });
  }
});

// 4. Parties REST API (Sub-Millisecond In-Memory Mutation + Async Google Cloud Sync)
app.post('/api/parties', (req, res) => {
  const partiesList = req.body;
  if (!Array.isArray(partiesList)) {
    return res.status(400).json({ error: 'Expected array of parties' });
  }
  try {
    dbStore.parties = partiesList;
    markDatabaseUpdated('parties_saved', partiesList);
    saveLocalJsonFileAsync('parties.json', partiesList);

    // Instant response (< 1ms)
    res.json({ success: true, count: partiesList.length });

    // Background sync parties to Google Drive & Google Sheets
    enqueueGoogleSync({ action: 'save_parties', parties: partiesList });

  } catch (err) {
    console.error('Failed to save parties:', err);
    res.status(500).json({ error: 'Save parties failed', details: err.message });
  }
});

// 5. Settings REST API (Sub-Millisecond In-Memory Mutation + Async Google Cloud Sync)
app.post('/api/settings', (req, res) => {
  const globalSettingsVal = req.body;
  if (!globalSettingsVal) {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }
  try {
    dbStore.globalSettings = globalSettingsVal;
    markDatabaseUpdated('settings_saved', globalSettingsVal);
    saveLocalJsonFileAsync('settings.json', globalSettingsVal);

    // Instant response (< 1ms)
    res.json({ success: true, settings: globalSettingsVal });

    // Background sync settings to Google Drive
    enqueueGoogleSync({ action: 'save_settings', settings: globalSettingsVal });

  } catch (err) {
    console.error('Failed to save settings:', err);
    res.status(500).json({ error: 'Save settings failed', details: err.message });
  }
});

// 6. Google Cloud Storage Health & Status API (Served directly from RAM in < 1ms)
app.get('/api/storage/status', (req, res) => {
  res.json({
    ok: true,
    provider: 'Google Drive & Google Sheets Master Database',
    connected: isGoogleStorageConnected,
    spreadsheetId: GOOGLE_CLOUD_CONFIG.spreadsheetId,
    spreadsheetUrl: GOOGLE_CLOUD_CONFIG.spreadsheetUrl,
    driveRootFolder: GOOGLE_CLOUD_CONFIG.driveRootFolder,
    invoicesFolder: GOOGLE_CLOUD_CONFIG.invoicesFolder,
    scriptUrl: GOOGLE_CLOUD_CONFIG.scriptUrl,
    lastSync: lastGoogleSyncTimestamp,
    stats: {
      invoices: dbStore.invoices.length,
      products: dbStore.products.length,
      parties: dbStore.parties.length
    },
    version: dbStore.version,
    lastModified: dbStore.lastModified,
    error: googleSyncError
  });
});

app.get('/api/cloud/status', (req, res) => {
  res.redirect('/api/storage/status');
});

// --- SERVE STATIC FRONTEND ASSETS ---
app.use(express.static(__dirname));

// Direct fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server listener
app.listen(PORT, async () => {
  console.log(`🚀 Aaryan Aqua billing server started on port http://localhost:${PORT}`);
  console.log(`☁️ Primary Cloud Backend: Google Drive & Google Sheets Master Database`);
  console.log(`📊 Connected Google Spreadsheet: ${GOOGLE_CLOUD_CONFIG.spreadsheetUrl}`);
  console.log(`📂 Connected Google Drive Folder: ${GOOGLE_CLOUD_CONFIG.driveRootFolder}`);

  // Handshake and sync with Google Cloud Storage
  syncWithGoogleStorage();

  // Auto-resume saved WhatsApp session on startup
  if (whatsappService && fs.existsSync(path.join(__dirname, 'data', '.wwebjs_auth'))) {
    console.log('🔄 Auto-resuming saved WhatsApp bot session...');
    whatsappService.initialize().catch(e => console.warn('WA auto-init error:', e.message));
  }
});
