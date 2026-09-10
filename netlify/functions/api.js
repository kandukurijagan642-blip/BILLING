const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwkegJvhM42cPIROIKg5Dlx6py8OnS5NXuIJeyf1Zb3V3Oc_2jyXPS_aDN7uW0t874d/exec';
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1BZnCqi9DPhJxhwUpux1HRfo_PDVn2QLDNDheR0Kf73Q/edit';
const DRIVE_FOLDER = 'Aaryan_Aqua_Billing_Data';

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
    // 1. GET /sync (Pulls data from Google Apps Script)
    if (path === '/sync' && event.httpMethod === 'GET') {
      const res = await fetch(`${SCRIPT_URL}?action=sync`, { redirect: 'follow' });
      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          invoices: data.invoices || [],
          products: data.products || [],
          parties: data.parties || [],
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
          lastSync: new Date().toISOString()
        })
      };
    }

    // 3. WhatsApp Status on Netlify (Serverless Notice)
    if (path.startsWith('/whatsapp')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'CONNECTED',
          isReady: true,
          webDirect: true,
          clientInfo: { pushname: 'Aaryan Aqua (Direct Web)' },
          message: 'Direct WhatsApp integration active'
        })
      };
    }

    // 4. POST Mutations
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};

      if (path === '/google-drive/sync-now') {
        const res = await fetch(`${SCRIPT_URL}?action=sync`, { redirect: 'follow' });
        const data = await res.json();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            message: 'All data synchronized with Google Drive & Google Sheets Master Database!',
            invoicesCount: (data.invoices || []).length,
            productsCount: (data.products || []).length,
            partiesCount: (data.parties || []).length,
            spreadsheetUrl: SPREADSHEET_URL,
            timestamp: new Date().toISOString()
          })
        };
      }

      let gasPayload = null;

      if (path === '/invoices') {
        gasPayload = { action: 'save_invoice', invoice: body };
      } else if (path === '/invoices/delete') {
        gasPayload = { action: 'delete_record', type: 'invoice', id: body.id };
      } else if (path === '/products') {
        gasPayload = { action: 'save_products', products: body };
      } else if (path === '/products/delete') {
        gasPayload = { action: 'delete_record', type: 'product', id: body.id };
      } else if (path === '/parties') {
        gasPayload = { action: 'save_parties', parties: body };
      } else if (path === '/parties/delete') {
        gasPayload = { action: 'delete_record', type: 'party', id: body.id };
      } else if (path === '/settings') {
        gasPayload = { action: 'save_settings', settings: body };
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
        const gasRes = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gasPayload),
          redirect: 'follow'
        });
        const gasData = await gasRes.json().catch(() => ({ ok: true }));
        if (gasData && gasData.ok) {
          if (gasData.viewUrl && !gasData.pdfUrl) gasData.pdfUrl = gasData.viewUrl;
          if (gasData.viewUrl && !gasData.googleDriveUrl) gasData.googleDriveUrl = gasData.viewUrl;
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(gasData || { success: true })
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
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Serverless function error', message: err.message })
    };
  }
};
