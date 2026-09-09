const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CODE_READY' | 'AUTHENTICATING' | 'CONNECTED' | 'AUTH_FAILURE'
    this.qrCodeDataUrl = null;
    this.pairingCode = null;
    this.clientInfo = null;
    this.errorMessage = null;
    this.authPath = path.join(__dirname, 'data', '.wwebjs_auth');
    this.isInitializing = false;
    this.activePhoneNumber = null;
    this.widCache = new Map(); // Fast in-memory cache for resolved WhatsApp WIDs
    this.activityLogs = this.loadActivityLogs();
    this.statusListeners = new Set();
    this.loadingPercent = null;
    this.loadingMessage = null;
    this.isDispatching = false;
    this.dispatchingDetails = null;
  }

  onStatusChange(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  notifyStatusChange() {
    const state = this.getStatus();
    for (const listener of this.statusListeners) {
      try { listener(state); } catch (e) {}
    }
  }

  loadActivityLogs() {
    try {
      const logPath = path.join(__dirname, 'data', 'whatsapp_logs.json');
      if (fs.existsSync(logPath)) {
        const raw = fs.readFileSync(logPath, 'utf8');
        return JSON.parse(raw) || [];
      }
    } catch (e) {}
    return [];
  }

  logActivity(entry) {
    try {
      const logEntry = {
        id: 'wa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        ...entry
      };
      this.activityLogs.unshift(logEntry);
      if (this.activityLogs.length > 60) this.activityLogs.pop();

      const logPath = path.join(__dirname, 'data', 'whatsapp_logs.json');
      fs.writeFileSync(logPath, JSON.stringify(this.activityLogs.slice(0, 50), null, 2));
    } catch (e) {
      console.warn('Could not save WhatsApp activity log:', e.message);
    }
  }

  getActivityLogs() {
    return this.activityLogs || [];
  }

  getStatus() {
    return {
      status: this.status,
      isReady: this.status === 'CONNECTED',
      qrCodeDataUrl: this.qrCodeDataUrl,
      pairingCode: this.pairingCode,
      clientInfo: this.clientInfo,
      loadingPercent: this.loadingPercent,
      loadingMessage: this.loadingMessage,
      isDispatching: this.isDispatching,
      dispatchingDetails: this.dispatchingDetails,
      errorMessage: this.errorMessage
    };
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;
    let digits = phone.toString().replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = '91' + digits.substring(1);
    }
    if (digits.length < 10) return null;
    return `${digits}@c.us`;
  }

  formatPairingPhoneDigits(phone) {
    if (!phone) return null;
    let digits = phone.toString().replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = '91' + digits.substring(1);
    }
    return digits.length >= 10 ? digits : null;
  }

  async resolveChatId(phone) {
    const rawChatId = this.formatPhoneNumber(phone);
    if (!rawChatId) return null;

    // Fast-path: check in-memory cache
    if (this.widCache.has(rawChatId)) {
      return this.widCache.get(rawChatId);
    }

    let targetChatId = rawChatId;
    if (this.client) {
      try {
        const numberId = await this.client.getNumberId(rawChatId);
        if (numberId && numberId._serialized) {
          targetChatId = numberId._serialized;
        }
      } catch (e) {
        console.warn('getNumberId warning:', e.message);
      }
    }

    this.widCache.set(rawChatId, targetChatId);
    return targetChatId;
  }

  cleanAuthDir() {
    try {
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
        console.log('🧹 Cleaned stale .wwebjs_auth directory.');
      }
    } catch (e) {
      console.warn('⚠️ Could not remove auth directory:', e.message);
    }
  }

  async initialize(options = {}) {
    const { phoneNumber = null, forceClean = false } = options;

    if (this.status === 'CONNECTED' && !forceClean) {
      return this.getStatus();
    }

    if (this.isInitializing) {
      return this.getStatus();
    }

    this.isInitializing = true;
    this.status = 'INITIALIZING';
    this.qrCodeDataUrl = null;
    this.pairingCode = null;
    this.errorMessage = null;
    this.notifyStatusChange();

    // Launch asynchronously in background without blocking the HTTP caller
    (async () => {
      try {
        if (forceClean) {
          this.cleanAuthDir();
        }

        if (this.client) {
          const oldClient = this.client;
          this.client = null;
          try {
            await Promise.race([
              oldClient.destroy().catch(() => {}),
              new Promise(res => setTimeout(res, 1200))
            ]);
          } catch (e) {}
        }

        const cacheDir = path.join(__dirname, 'data', '.wwebjs_cache');
        if (!fs.existsSync(cacheDir)) {
          try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (e) {}
        }

        const clientConfig = {
          authStrategy: new LocalAuth({
            dataPath: this.authPath
          }),
          webVersionCache: {
            type: 'local',
            path: cacheDir,
            strict: false
          },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          puppeteer: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-accelerated-2d-canvas',
              '--no-first-run',
              '--no-zygote',
              '--disable-gpu',
              '--disable-extensions',
              '--disable-default-apps',
              '--mute-audio',
              '--no-default-browser-check',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              '--disable-sync',
              '--disable-hang-monitor',
              '--disable-client-side-phishing-detection',
              '--password-store=basic',
              '--use-mock-keychain',
              '--disable-component-update',
              '--disable-domain-reliability',
              '--disable-breakpad',
              '--disk-cache-size=67108864',
              '--disable-blink-features=AutomationControlled'
            ]
          }
        };

        const pairDigits = this.formatPairingPhoneDigits(phoneNumber);
        if (pairDigits) {
          this.activePhoneNumber = pairDigits;
          clientConfig.pairWithPhoneNumber = {
            phoneNumber: pairDigits,
            showNotification: false
          };
        }

        const newClient = new Client(clientConfig);
        this.client = newClient;

        // 1. QR Code Handler
        newClient.on('qr', async (qrString) => {
          console.log('📱 WhatsApp QR code generated. Waiting for user scan...');
          this.status = 'QR_READY';
          this.pairingCode = null;
          this.isInitializing = false;
          try {
            this.qrCodeDataUrl = await qrcode.toDataURL(qrString, {
              width: 320,
              margin: 2,
              color: {
                dark: '#0a4b5c',
                light: '#ffffff'
              }
            });
          } catch (qrErr) {
            console.error('Error converting QR to DataURL:', qrErr);
          }
          this.notifyStatusChange();
        });

        // 2. Phone Pairing Code Handler
        newClient.on('code', (code) => {
          console.log('🔑 WhatsApp Pairing Code Received:', code);
          this.status = 'CODE_READY';
          this.pairingCode = code;
          this.qrCodeDataUrl = null;
          this.isInitializing = false;
          this.notifyStatusChange();
        });

        // 3. Loading Screen & Authenticated Handlers
        newClient.on('loading_screen', (percent, message) => {
          if (this.status !== 'CONNECTED') {
            this.status = 'AUTHENTICATING';
            this.loadingPercent = percent;
            this.loadingMessage = message || 'Syncing messages...';
          }
          console.log(`⏳ WhatsApp Loading: ${percent}% - ${message || ''}`);
          this.notifyStatusChange();
        });

        newClient.on('authenticated', () => {
          console.log('🔐 WhatsApp Client Authenticated Successfully! Accelerating ready state...');
          if (this.status !== 'CONNECTED') {
            this.status = 'AUTHENTICATING';
          }
          this.loadingPercent = this.loadingPercent || 95;
          this.loadingMessage = 'Authenticating session...';
          this.qrCodeDataUrl = null;
          this.pairingCode = null;
          this.isInitializing = false;
          this.notifyStatusChange();

          // Proactive fast-check: catch ready state as soon as Conn.serialize resolves
          let checkCount = 0;
          const readyFastChecker = setInterval(async () => {
            checkCount++;
            if (this.status === 'CONNECTED' || !newClient.pupPage || checkCount > 40) {
              clearInterval(readyFastChecker);
              return;
            }
            try {
              const isConnReady = await newClient.pupPage.evaluate(() => {
                try {
                  const conn = window.require('WAWebConnModel')?.Conn;
                  return !!(conn && conn.serialize);
                } catch (e) { return false; }
              });
              if (isConnReady && this.status !== 'CONNECTED') {
                clearInterval(readyFastChecker);
                console.log('⚡ Proactive Fast-Ready Detected! Connecting bot immediately...');
                newClient.emit('ready');
              }
            } catch (e) {}
          }, 350);
        });

        // 4. Auth Failure Handler
        newClient.on('auth_failure', (msg) => {
          console.error('❌ WhatsApp Authentication Failure:', msg);
          this.status = 'AUTH_FAILURE';
          this.errorMessage = msg || 'Authentication failed. Please link device again.';
          this.isInitializing = false;
          this.notifyStatusChange();
        });

        // 5. Ready Handler
        newClient.on('ready', () => {
          console.log('🎉 WhatsApp Background Bot is READY & CONNECTED!');
          this.status = 'CONNECTED';
          this.loadingPercent = 100;
          this.loadingMessage = null;
          this.qrCodeDataUrl = null;
          this.pairingCode = null;
          this.isInitializing = false;
          try {
            const info = newClient.info;
            this.clientInfo = {
              pushname: info?.pushname || 'Aaryan Aqua',
              wid: info?.wid?._serialized || '',
              phone: info?.wid?.user || ''
            };
          } catch (e) {
            this.clientInfo = { pushname: 'Connected Device', phone: '' };
          }
          this.notifyStatusChange();
        });

        // 6. Disconnected Handler
        newClient.on('disconnected', (reason) => {
          console.log('⚠️ WhatsApp Client Disconnected:', reason);
          this.status = 'DISCONNECTED';
          this.clientInfo = null;
          this.qrCodeDataUrl = null;
          this.pairingCode = null;
          this.loadingPercent = null;
          this.loadingMessage = null;
          this.isInitializing = false;
          this.notifyStatusChange();
        });

        // 7. Internal Error Handler (Prevents unhandled crashes)
        newClient.on('error', (err) => {
          console.error('⚠️ WhatsApp internal client error caught safely:', err.message);
        });

        // Launch client
        newClient.initialize().catch(err => {
          console.error('WhatsApp client.initialize() error:', err);
          this.status = 'DISCONNECTED';
          this.errorMessage = err.message || 'Initialization failed';
          this.isInitializing = false;
          this.notifyStatusChange();
        });

      } catch (err) {
        console.error('Failed to start WhatsApp Service:', err);
        this.status = 'DISCONNECTED';
        this.errorMessage = err.message;
        this.isInitializing = false;
      }
    })();

    return this.getStatus();
  }

  async requestPhonePairing(phone) {
    const digits = this.formatPairingPhoneDigits(phone);
    if (!digits) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Force clean fresh initialization with pairWithPhoneNumber
    await this.logout();
    this.initialize({ phoneNumber: digits, forceClean: true });

    // Wait up to 25 seconds for the pairing code event
    const startTime = Date.now();
    while (Date.now() - startTime < 25000) {
      if (this.pairingCode) {
        return { ok: true, code: this.pairingCode, status: this.status };
      }
      if (this.status === 'CONNECTED') {
        return { ok: true, status: 'CONNECTED', isReady: true };
      }
      if (this.status === 'AUTH_FAILURE') {
        throw new Error(this.errorMessage || 'Authentication failed');
      }
      await new Promise(r => setTimeout(r, 600));
    }

    if (this.pairingCode) {
      return { ok: true, code: this.pairingCode, status: this.status };
    }

    return { ok: true, status: this.status, pairingCode: null, message: 'Code generating... Please wait.' };
  }

  async logout() {
    this.status = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    this.pairingCode = null;
    this.clientInfo = null;
    this.isInitializing = false;

    if (this.client) {
      const oldClient = this.client;
      this.client = null;
      try {
        await Promise.race([
          oldClient.logout().catch(() => {}),
          new Promise(r => setTimeout(r, 1200))
        ]);
      } catch (e) {}
      try {
        await Promise.race([
          oldClient.destroy().catch(() => {}),
          new Promise(r => setTimeout(r, 1200))
        ]);
      } catch (e) {}
    }

    this.cleanAuthDir();
    return { ok: true, status: 'DISCONNECTED' };
  }

  async sendTextMessage(phone, messageText) {
    if (this.status !== 'CONNECTED' || !this.client) {
      throw new Error('WhatsApp Bot is not connected. Please scan QR code first.');
    }

    const targetChatId = await this.resolveChatId(phone);
    if (!targetChatId) {
      throw new Error('Invalid phone number. Please provide a valid 10-digit mobile number.');
    }

    this.isDispatching = true;
    this.dispatchingDetails = { phone };
    this.notifyStatusChange();

    try {
      const result = await this.client.sendMessage(targetChatId, messageText);
      const messageId = (result && result.id) ? (result.id._serialized || result.id.id || 'sent') : 'sent_' + Date.now();

      this.logActivity({
        type: 'TEXT_MESSAGE',
        phone,
        recipient: targetChatId,
        preview: messageText.slice(0, 70),
        status: 'DELIVERED',
        messageId
      });

      return { ok: true, messageId, recipient: targetChatId };
    } finally {
      this.isDispatching = false;
      this.dispatchingDetails = null;
      this.notifyStatusChange();
    }
  }

  async sendInvoiceDocument(phone, messageText, filename, pdfBase64, fastPathOnly = false) {
    if (this.status !== 'CONNECTED' || !this.client) {
      throw new Error('WhatsApp Bot is not connected. Please scan QR code first.');
    }

    const targetChatId = await this.resolveChatId(phone);
    if (!targetChatId) {
      throw new Error('Invalid phone number. Please provide a valid 10-digit mobile number.');
    }

    const cleanBasename = path.basename(filename || 'Invoice.pdf').replace(/[^a-zA-Z0-9_\.-]/g, '_');
    const safeFilename = cleanBasename.endsWith('.pdf') ? cleanBasename : `${cleanBasename}.pdf`;

    this.isDispatching = true;
    this.dispatchingDetails = { filename: safeFilename, phone };
    this.notifyStatusChange();

    try {
      let base64Data = null;
      if (pdfBase64) {
        base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        // Automatically cache to public/invoices on disk for subsequent instant dispatches
        try {
          const diskPath = path.join(__dirname, 'public', 'invoices', safeFilename);
          if (!fs.existsSync(diskPath)) {
            fs.writeFileSync(diskPath, Buffer.from(base64Data, 'base64'));
          }
        } catch (e) {}
      } else {
        // Ultra-fast path: read existing PDF from disk
        let diskPath = path.join(__dirname, 'public', 'invoices', safeFilename);
        if (!fs.existsSync(diskPath)) {
          // Fallback: search by invoice number in public/invoices
          const invMatch = safeFilename.match(/Invoice_(\d+)/i);
          if (invMatch && invMatch[1]) {
            const invNum = invMatch[1];
            const invoiceDir = path.join(__dirname, 'public', 'invoices');
            if (fs.existsSync(invoiceDir)) {
              const files = fs.readdirSync(invoiceDir);
              const found = files.find(f => {
                const fLower = f.toLowerCase();
                return (
                  fLower === `invoice_${invNum}.pdf` ||
                  fLower.startsWith(`invoice_${invNum}_`) ||
                  fLower.startsWith(`invoice_${invNum.padStart(4, '0')}_`)
                );
              });
              if (found) {
                diskPath = path.join(invoiceDir, found);
              }
            }
          }
        }
        if (fs.existsSync(diskPath)) {
          base64Data = fs.readFileSync(diskPath).toString('base64');
        }
      }

      if (!base64Data) {
        if (fastPathOnly) {
          return { ok: false, needPdf: true, message: 'PDF not on disk' };
        }
        return await this.sendTextMessage(phone, messageText);
      }

      const media = new MessageMedia('application/pdf', base64Data, safeFilename);

      const result = await this.client.sendMessage(targetChatId, media, {
        caption: messageText,
        sendMediaAsDocument: true
      });

      const messageId = (result && result.id) ? (result.id._serialized || result.id.id || 'sent') : 'sent_' + Date.now();

      this.logActivity({
        type: 'INVOICE_PDF',
        phone,
        recipient: targetChatId,
        filename: safeFilename,
        status: 'DELIVERED',
        messageId
      });

      return {
        ok: true,
        messageId,
        recipient: targetChatId,
        filename: safeFilename
      };
    } finally {
      this.isDispatching = false;
      this.dispatchingDetails = null;
      this.notifyStatusChange();
    }
  }
}

const whatsappService = new WhatsAppService();
module.exports = whatsappService;
