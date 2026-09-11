const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// State
let client = null;
let status = 'DISCONNECTED'; // DISCONNECTED | INITIALIZING | QR_READY | CODE_READY | AUTHENTICATING | CONNECTED | AUTH_FAILURE
let qrCodeDataUrl = null;
let rawQr = null;
let pairingCode = null;
let clientInfo = null;
let errorMessage = null;
let isInitializing = false;
let activityLogs = [];

const authPath = path.join(__dirname, 'data', '.wwebjs_auth');

function logActivity(entry) {
  const item = {
    id: 'wa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    ...entry
  };
  activityLogs.unshift(item);
  if (activityLogs.length > 50) activityLogs.pop();
}

function getStatus() {
  return {
    status,
    isReady: status === 'CONNECTED',
    qrCodeDataUrl,
    pairingCode,
    clientInfo,
    errorMessage
  };
}

function formatPhone(phone) {
  if (!phone) return null;
  let digits = phone.toString().replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  else if (digits.length === 11 && digits.startsWith('0')) digits = '91' + digits.substring(1);
  return digits.length >= 10 ? `${digits}@c.us` : null;
}

async function initClient(options = {}) {
  const { forceClean = false, pairPhone = null, retryCount = 0 } = options;
  if (status === 'CONNECTED' && !forceClean) return getStatus();
  if (isInitializing) return getStatus();

  isInitializing = true;
  status = 'INITIALIZING';
  qrCodeDataUrl = null;
  rawQr = null;
  pairingCode = null;
  errorMessage = null;

  try {
    if (forceClean) {
      try {
        if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
        console.log('🧹 Cleaned session auth folder.');
      } catch (e) {}
    }

    function cleanChromiumLocks(dir) {
      try {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            cleanChromiumLocks(fullPath);
          } else if (entry.name.startsWith('Singleton')) {
            try { fs.unlinkSync(fullPath); } catch (e) {}
          }
        }
      } catch (e) {}
    }
    cleanChromiumLocks(authPath);

    if (client) {
      try { await client.destroy(); } catch (e) {}
      client = null;
    }

    const clientConfig = {
      authStrategy: new LocalAuth({ dataPath: authPath }),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
      },
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote'
        ]
      }
    };

    if (pairPhone) {
      let digits = pairPhone.toString().replace(/\D/g, '');
      if (digits.length === 10) digits = '91' + digits;
      clientConfig.pairWithPhoneNumber = { phoneNumber: digits, showNotification: false };
    }

    client = new Client(clientConfig);

    client.on('qr', async (qr) => {
      console.log('📱 WhatsApp QR Code Generated! Waiting for scan...');
      rawQr = qr;
      status = 'QR_READY';
      pairingCode = null;
      isInitializing = false;
      try {
        qrCodeDataUrl = await qrcode.toDataURL(qr, {
          width: 320,
          margin: 2,
          color: { dark: '#0a4b5c', light: '#ffffff' }
        });
      } catch (err) {
        console.error('QR generate error:', err);
      }
    });

    client.on('code', (code) => {
      console.log('🔑 WhatsApp Pairing Code Received:', code);
      pairingCode = code;
      status = 'CODE_READY';
      qrCodeDataUrl = null;
      isInitializing = false;
    });

    client.on('authenticated', () => {
      console.log('🔐 Authenticated successfully!');
      status = 'AUTHENTICATING';
      qrCodeDataUrl = null;
      pairingCode = null;
      isInitializing = false;
    });

    client.on('ready', () => {
      console.log('🎉 WhatsApp Bot is Ready and Connected!');
      status = 'CONNECTED';
      qrCodeDataUrl = null;
      pairingCode = null;
      isInitializing = false;
      const me = client.info || {};
      clientInfo = {
        pushname: me.pushname || 'Admin',
        phone: me.wid?.user || 'Connected'
      };
      logActivity({ type: 'STATUS', status: 'CONNECTED', desc: 'Bot linked successfully' });
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ Auth failure:', msg);
      status = 'AUTH_FAILURE';
      errorMessage = msg || 'Authentication failed';
      isInitializing = false;
    });

    client.on('disconnected', (reason) => {
      console.log('⚠️ Disconnected:', reason);
      status = 'DISCONNECTED';
      clientInfo = null;
      isInitializing = false;
      logActivity({ type: 'STATUS', status: 'DISCONNECTED', desc: reason });
      console.log('🔄 Attempting automatic reconnection in 5 seconds...');
      setTimeout(() => initClient(), 5000);
    });

    await client.initialize();
  } catch (err) {
    console.error('Client init error:', err.message);
    status = 'DISCONNECTED';
    isInitializing = false;
    errorMessage = err.message;
    if (retryCount < 3) {
      console.log(`🔄 Retrying WhatsApp engine initialization in 3 seconds (attempt ${retryCount + 1}/3)...`);
      setTimeout(() => initClient({ ...options, retryCount: retryCount + 1 }), 3000);
    }
  }

  return getStatus();
}

// API Routes
app.get('/api/whatsapp/status', (req, res) => {
  res.json(getStatus());
});

app.post('/api/whatsapp/connect', async (req, res) => {
  const forceClean = req.body?.forceClean || false;
  initClient({ forceClean });
  res.json({ ok: true, message: 'Initialization started', ...getStatus() });
});

app.post('/api/whatsapp/pair-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ ok: false, error: 'Phone number required' });
  initClient({ forceClean: true, pairPhone: phone });
  res.json({ ok: true, message: 'Pairing requested' });
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
  try {
    if (client) {
      await client.logout();
      await client.destroy();
      client = null;
    }
  } catch (e) {}
  status = 'DISCONNECTED';
  clientInfo = null;
  res.json({ ok: true });
});

app.post('/api/whatsapp/send-message', async (req, res) => {
  const { phone, text } = req.body;
  if (status !== 'CONNECTED' || !client) {
    return res.status(503).json({ ok: false, error: 'WhatsApp Bot not connected' });
  }
  const chatId = formatPhone(phone);
  if (!chatId) return res.status(400).json({ ok: false, error: 'Invalid phone number' });

  try {
    const result = await client.sendMessage(chatId, text);
    logActivity({ type: 'MESSAGE', phone, status: 'SENT' });
    res.json({ ok: true, messageId: result?.id?._serialized || 'sent' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/whatsapp/send-invoice', async (req, res) => {
  const { phone, text, filename, pdfBase64 } = req.body;
  if (status !== 'CONNECTED' || !client) {
    return res.status(503).json({ ok: false, error: 'WhatsApp Bot not connected' });
  }
  const chatId = formatPhone(phone);
  if (!chatId) return res.status(400).json({ ok: false, error: 'Invalid phone number' });

  try {
    if (pdfBase64) {
      const cleanB64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      const media = new MessageMedia('application/pdf', cleanB64, filename || 'Invoice.pdf');
      await client.sendMessage(chatId, media, { caption: text, sendMediaAsDocument: true });
    } else {
      await client.sendMessage(chatId, text);
    }
    logActivity({ type: 'INVOICE_PDF', phone, filename, status: 'SENT' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/whatsapp/activity', (req, res) => {
  res.json(activityLogs);
});

// Serve full billing application (with built-in WhatsApp QR scanner modal)
app.use(express.static(__dirname));

// Standalone companion card
app.get('/companion', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aaryan Aqua Needs - WhatsApp Bot Companion</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    h2 { margin: 0 0 4px 0; color: #38bdf8; font-size: 20px; }
    p.sub { color: #94a3b8; font-size: 13px; margin: 0 0 20px 0; }
    .qr-box { background: #ffffff; padding: 14px; border-radius: 12px; display: inline-flex; justify-content: center; align-items: center; min-width: 250px; min-height: 250px; margin-bottom: 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
    .qr-box img { width: 240px; height: 240px; display: block; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .status-pill.connected { background: #064e3b; color: #34d399; }
    .status-pill.waiting { background: #451a03; color: #fbbf24; }
    .status-pill.loading { background: #1e3a8a; color: #60a5fa; }
    .btn { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; transition: 0.2s; }
    .btn:hover { background: #0369a1; }
    .instructions { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; text-align: left; font-size: 12px; color: #cbd5e1; margin-top: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 36px; color: #22c55e; margin-bottom: 8px;"><i class="fa-brands fa-whatsapp"></i></div>
    <h2>Aaryan Aqua Needs</h2>
    <p class="sub">Office PC WhatsApp Bot Companion</p>

    <div id="status-pill" class="status-pill loading">
      <i class="fa-solid fa-spinner fa-spin"></i> <span id="status-text">Initializing WhatsApp Web...</span>
    </div>

    <div class="qr-box" id="qr-container">
      <div id="loading-spinner" style="color: #64748b;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><br><span style="font-size: 12px; display: block; margin-top: 8px;">Generating QR Code...</span></div>
      <img id="qr-image" style="display: none;" alt="WhatsApp QR Code">
    </div>

    <div id="connected-box" style="display: none; margin-bottom: 16px;">
      <div style="font-size: 40px; color: #22c55e; margin-bottom: 8px;"><i class="fa-solid fa-circle-check"></i></div>
      <h3 style="margin: 0; color: #34d399; font-size: 16px;">WhatsApp Successfully Linked!</h3>
      <p style="font-size: 12px; color: #94a3b8; margin: 4px 0 14px 0;" id="device-info">Invoices will now be sent automatically in background.</p>
      <button class="btn" onclick="disconnectBot()" style="background: #dc2626;"><i class="fa-solid fa-right-from-bracket"></i> Disconnect / Unlink</button>
    </div>

    <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 14px;" id="actions-bar">
      <button class="btn" onclick="forceRefreshQR()"><i class="fa-solid fa-rotate"></i> Refresh QR</button>
    </div>

    <div class="instructions">
      <strong>📲 How to Pair:</strong><br>
      1. Open <strong>WhatsApp</strong> on your phone.<br>
      2. Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong> &gt; <strong>Linked Devices</strong>.<br>
      3. Tap <strong>Link a Device</strong> and point your camera at this QR code.<br>
      <em>(Session is saved permanently on this computer - you only scan once!)</em>
    </div>
  </div>

  <script>
    async function checkStatus() {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        const pill = document.getElementById('status-pill');
        const statusText = document.getElementById('status-text');
        const qrImg = document.getElementById('qr-image');
        const qrLoading = document.getElementById('loading-spinner');
        const qrContainer = document.getElementById('qr-container');
        const connectedBox = document.getElementById('connected-box');
        const actionsBar = document.getElementById('actions-bar');

        if (data.status === 'CONNECTED') {
          pill.className = 'status-pill connected';
          statusText.textContent = 'Active & Connected (' + (data.clientInfo?.phone ? '+' + data.clientInfo.phone : 'Bot') + ')';
          qrContainer.style.display = 'none';
          actionsBar.style.display = 'none';
          connectedBox.style.display = 'block';
          if (data.clientInfo?.pushname) {
            document.getElementById('device-info').textContent = 'Linked as ' + data.clientInfo.pushname + ' (+' + data.clientInfo.phone + '). Silent background dispatch is active!';
          }
        } else if (data.status === 'QR_READY' && data.qrCodeDataUrl) {
          pill.className = 'status-pill waiting';
          statusText.textContent = 'Point Phone Camera at QR Code';
          qrContainer.style.display = 'inline-flex';
          qrLoading.style.display = 'none';
          qrImg.src = data.qrCodeDataUrl;
          qrImg.style.display = 'block';
          connectedBox.style.display = 'none';
          actionsBar.style.display = 'flex';
        } else if (data.status === 'AUTHENTICATING') {
          pill.className = 'status-pill loading';
          statusText.textContent = 'Authenticating Session...';
          qrLoading.style.display = 'block';
          qrImg.style.display = 'none';
        } else {
          pill.className = 'status-pill loading';
          statusText.textContent = 'Starting WhatsApp Engine...';
          qrLoading.style.display = 'block';
          qrImg.style.display = 'none';
        }
      } catch (e) {}
    }

    async function forceRefreshQR() {
      try {
        await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceClean: true })
        });
        checkStatus();
      } catch (e) {}
    }

    async function disconnectBot() {
      if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
      try {
        await fetch('/api/whatsapp/disconnect', { method: 'POST' });
        location.reload();
      } catch (e) {}
    }

    setInterval(checkStatus, 2000);
    checkStatus();
  </script>
</body>
</html>`);
});

// Start Server & Initialize Client
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AARYAN AQUA NEEDS - WhatsApp Bot Companion Running!`);
  console.log(`📡 Web Dashboard: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  
  // Launch initial client
  initClient();

  // Automatically open browser to dashboard
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} http://localhost:${PORT}`);
});
