const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

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
const MAX_REQUESTS_PER_MINUTE = 120; // 120 requests/min

app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
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

// Database connection mode status
let isMongoConnected = false;

// Local JSON Storage Helpers
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

// --- MONGOOSE MONGO SCHEMAS & MODELS ---
const InvoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNo: String,
  invoiceDate: String,
  customerName: String,
  itemsCount: Number,
  total: Number,
  details: Object
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true },
  description: String,
  hsn: String,
  unit: String,
  rate: Number,
  stock: Number,
  gstRate: Number
}, { timestamps: true });

const PartySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: String,
  address: String,
  gstin: String,
  phone: String,
  state: String,
  stateCode: String,
  type: String // 'buyer' or 'consignee'
}, { timestamps: true });

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: Object
}, { timestamps: true });

const DeletedInvoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }
}, { timestamps: true });

const InvoiceModel = mongoose.model('Invoice', InvoiceSchema);
const ProductModel = mongoose.model('Product', ProductSchema);
const PartyModel = mongoose.model('Party', PartySchema);
const SettingModel = mongoose.model('Setting', SettingSchema);
const DeletedInvoiceModel = mongoose.model('DeletedInvoice', DeletedInvoiceSchema);

// --- CONNECT TO MONGODB (IF URI PROVIDED) ---
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  console.log('Connecting to MongoDB database...');
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('✅ Successfully connected to MongoDB Atlas!');
      isMongoConnected = true;
    })
    .catch(err => {
      console.error('❌ MongoDB connection error. Falling back to local file storage.', err);
      isMongoConnected = false;
    });
} else {
  console.log('ℹ️ MONGODB_URI environment variable not defined. Using offline-ready local JSON storage.');
}

// --- REST API ENDPOINTS ---

// 1. Unified Sync Endpoint (Pulls all databases in one round-trip)
app.get('/api/sync', async (req, res) => {
  try {
    if (isMongoConnected) {
      const [invoices, products, parties, dbSettings, deletedDocs] = await Promise.all([
        InvoiceModel.find().maxTimeMS(4000).lean().catch(() => null),
        ProductModel.find().maxTimeMS(4000).lean().catch(() => null),
        PartyModel.find().maxTimeMS(4000).lean().catch(() => null),
        SettingModel.findOne({ key: 'globalSettings' }).maxTimeMS(4000).lean().catch(() => null),
        DeletedInvoiceModel.find().maxTimeMS(4000).lean().catch(() => null)
      ]);

      const localInvoices = readLocalJsonFile('invoices.json', []);
      const localProducts = readLocalJsonFile('products.json', []);
      const localParties = readLocalJsonFile('parties.json', []);
      const localDeleted = readLocalJsonFile('deleted_invoices.json', []);
      
      res.json({
        invoices: invoices || localInvoices,
        products: products || localProducts,
        parties: parties || localParties,
        globalSettings: dbSettings ? dbSettings.value : readLocalJsonFile('settings.json', null),
        deletedInvoiceIds: deletedDocs ? deletedDocs.map(d => d.id) : localDeleted
      });
    } else {
      res.json({
        invoices: readLocalJsonFile('invoices.json', []),
        products: readLocalJsonFile('products.json', []),
        parties: readLocalJsonFile('parties.json', []),
        globalSettings: readLocalJsonFile('settings.json', null),
        deletedInvoiceIds: readLocalJsonFile('deleted_invoices.json', [])
      });
    }
  } catch (err) {
    console.error('Sync pull failed:', err);
    res.status(500).json({ error: 'Sync retrieval failed', details: err.message });
  }
});

// 2. Invoices REST API
app.post('/api/invoices', async (req, res) => {
  const invoiceRecord = req.body; // Expects { id, invoiceNo, invoiceDate, customerName, itemsCount, total, details }
  if (!invoiceRecord || !invoiceRecord.id) {
    return res.status(400).json({ error: 'Invalid invoice payload' });
  }
  try {
    if (isMongoConnected) {
      // Upsert invoice record
      const result = await InvoiceModel.findOneAndUpdate(
        { id: invoiceRecord.id },
        invoiceRecord,
        { upsert: true, new: true }
      );
      res.json({ success: true, record: result });
    } else {
      const invoices = readLocalJsonFile('invoices.json', []);
      const idx = invoices.findIndex(i => i.id === invoiceRecord.id);
      if (idx > -1) {
        invoices[idx] = invoiceRecord;
      } else {
        invoices.push(invoiceRecord);
      }
      writeLocalJsonFile('invoices.json', invoices);
      res.json({ success: true, record: invoiceRecord });
    }
  } catch (err) {
    console.error('Failed to save invoice:', err);
    res.status(500).json({ error: 'Save invoice operation failed', details: err.message });
  }
});

app.post('/api/invoices/delete', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing invoice id' });
  try {
    if (isMongoConnected) {
      await InvoiceModel.deleteOne({ id });
      await DeletedInvoiceModel.create({ id }).catch(() => {});
      res.json({ success: true });
    } else {
      let invoices = readLocalJsonFile('invoices.json', []);
      invoices = invoices.filter(i => i.id !== id);
      writeLocalJsonFile('invoices.json', invoices);
      
      let deleted = readLocalJsonFile('deleted_invoices.json', []);
      if (!deleted.includes(id)) {
        deleted.push(id);
        writeLocalJsonFile('deleted_invoices.json', deleted);
      }
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Delete invoice failed', details: err.message });
  }
});

app.post('/api/invoices/reset', async (req, res) => {
  try {
    if (isMongoConnected) {
      await InvoiceModel.deleteMany({});
      await DeletedInvoiceModel.deleteMany({});
      res.json({ success: true });
    } else {
      writeLocalJsonFile('invoices.json', []);
      writeLocalJsonFile('deleted_invoices.json', []);
      res.json({ success: true });
    }
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

app.post('/api/invoices/upload-pdf', (req, res) => {
  try {
    const { filename, pdfBase64 } = req.body;
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
    const pdfUrl = `${protocol}://${host}/invoices/${safeFilename}`;

    res.json({ ok: true, pdfUrl, filename: safeFilename });
  } catch (err) {
    console.error('PDF upload error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 3. Products REST API (Bulk Save/Sync)
app.post('/api/products', async (req, res) => {
  const productsList = req.body; // Expects array of products
  if (!Array.isArray(productsList)) {
    return res.status(400).json({ error: 'Expected array of products' });
  }
  try {
    if (isMongoConnected) {
      // Re-populate products collection to match state
      await ProductModel.deleteMany({});
      const result = await ProductModel.insertMany(productsList);
      res.json({ success: true, count: result.length });
    } else {
      writeLocalJsonFile('products.json', productsList);
      res.json({ success: true, count: productsList.length });
    }
  } catch (err) {
    console.error('Failed to save products:', err);
    res.status(500).json({ error: 'Save products failed', details: err.message });
  }
});

// 4. Parties REST API (Bulk Save/Sync)
app.post('/api/parties', async (req, res) => {
  const partiesList = req.body; // Expects array of parties
  if (!Array.isArray(partiesList)) {
    return res.status(400).json({ error: 'Expected array of parties' });
  }
  try {
    if (isMongoConnected) {
      await PartyModel.deleteMany({});
      const result = await PartyModel.insertMany(partiesList);
      res.json({ success: true, count: result.length });
    } else {
      writeLocalJsonFile('parties.json', partiesList);
      res.json({ success: true, count: partiesList.length });
    }
  } catch (err) {
    console.error('Failed to save parties:', err);
    res.status(500).json({ error: 'Save parties failed', details: err.message });
  }
});

// 5. Settings REST API
app.post('/api/settings', async (req, res) => {
  const globalSettingsVal = req.body;
  if (!globalSettingsVal) {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }
  try {
    if (isMongoConnected) {
      const result = await SettingModel.findOneAndUpdate(
        { key: 'globalSettings' },
        { key: 'globalSettings', value: globalSettingsVal },
        { upsert: true, new: true }
      );
      res.json({ success: true, settings: result.value });
    } else {
      writeLocalJsonFile('settings.json', globalSettingsVal);
      res.json({ success: true, settings: globalSettingsVal });
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
    res.status(500).json({ error: 'Save settings failed', details: err.message });
  }
});

// --- SERVE STATIC FRONTEND ASSETS ---
app.use(express.static(__dirname));

// Direct fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server listener
app.listen(PORT, () => {
  console.log(`🚀 Aaryan Aqua billing server started on port http://localhost:${PORT}`);
});
