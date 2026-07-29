const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

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

const InvoiceModel = mongoose.model('Invoice', InvoiceSchema);
const ProductModel = mongoose.model('Product', ProductSchema);
const PartyModel = mongoose.model('Party', PartySchema);
const SettingModel = mongoose.model('Setting', SettingSchema);

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
      const invoices = await InvoiceModel.find().lean();
      const products = await ProductModel.find().lean();
      const parties = await PartyModel.find().lean();
      const dbSettings = await SettingModel.findOne({ key: 'globalSettings' }).lean();
      
      res.json({
        invoices: invoices || [],
        products: products || [],
        parties: parties || [],
        globalSettings: dbSettings ? dbSettings.value : null
      });
    } else {
      res.json({
        invoices: readLocalJsonFile('invoices.json', []),
        products: readLocalJsonFile('products.json', []),
        parties: readLocalJsonFile('parties.json', []),
        globalSettings: readLocalJsonFile('settings.json', null)
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
      res.json({ success: true });
    } else {
      let invoices = readLocalJsonFile('invoices.json', []);
      invoices = invoices.filter(i => i.id !== id);
      writeLocalJsonFile('invoices.json', invoices);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Delete invoice failed', details: err.message });
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
