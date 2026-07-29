// Database states
let productsDb = [];
let partiesDb = [];
let invoicesDb = [];
let globalSettings = {};

// Active Form Invoice State
let currentInvoice = {
  invoiceType: "Bill of Supply",
  headerLogo: "ganesha",
  invoiceNo: "",
  invoiceDate: "",
  transportMode: "",
  lrNo: "",
  transportDate: "",
  supplyDate: "",
  bundles: 0,
  supplyPlace: "Andhra Pradesh",
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
  billTransportMode: document.getElementById('bill-transport-mode'),
  billLrNo: document.getElementById('bill-lr-no'),
  billTransportDate: document.getElementById('bill-transport-date'),
  billSupplyDate: document.getElementById('bill-supply-date'),
  billBundles: document.getElementById('bill-bundles'),
  billSupplyPlace: document.getElementById('bill-supply-place'),
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
  billConsigneeState: document.getElementById('bill-consignee-state'),
  billConsigneeStateCode: document.getElementById('bill-consignee-state-code'),

  billItemSelect: document.getElementById('bill-item-select'),
  billItemStockQty: document.getElementById('bill-item-stock-qty'),
  billItemHsn: document.getElementById('bill-item-hsn'),
  billItemQty: document.getElementById('bill-item-qty'),
  billItemUnit: document.getElementById('bill-item-unit'),
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

// Lock screen credentials state
let activeUsername = "1234";
let activePassword = "1234";
let lockTimerSeconds = 300; // 5 mins
let isLocked = false;
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
  // One-time cache clear, service worker unregistration, and local storage reset to force start sequence from 0001
  if (localStorage.getItem("sw_cleared_v23_force_clear_invoices") !== "true") {
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
    localStorage.setItem("sw_cleared_v23_force_clear_invoices", "true");
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

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMobileSidebar();
    }
  });

  // Register PWA Service Worker for sub-10ms instant boot
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
    }).catch(err => {
      console.log('SW registration failed:', err);
    });
  }
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
        address: "LANKEVANIDIBBA\nREPALLE MANDAL\nGUNTURU\nAndhra Pradesh - 522264, India",
        gstin: "37AAACD7852Q1ZZ",
        state: "Andhra Pradesh",
        stateCode: "37",
        phone: "9848012345"
      },
      {
        id: "party-2",
        type: "consignee",
        name: "DEVI FISHERIES LIMITED",
        company: "DEVI FISHERIES LIMITED",
        address: "LANKEVANIDIBBA\nREPALLE MANDAL\nGUNTURU\nAndhra Pradesh - 522264, India",
        gstin: "37AAACD7852Q1ZZ",
        state: "Andhra Pradesh",
        stateCode: "37",
        phone: "9848012345"
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
        discount: 42.50
      },
      {
        id: "prod-2",
        description: "AQUA PROBIOTIC FEED SUPPLEMENT 1KG",
        hsn: "23099090",
        packSize: "1 KG",
        unit: "Can",
        rate: 850.00,
        gstRate: 5,
        discount: 10.00
      },
      {
        id: "prod-3",
        description: "ZEOLITE POWDER 25KG BAG",
        hsn: "28421000",
        packSize: "25 KG",
        unit: "Bag",
        rate: 450.00,
        gstRate: 12,
        discount: 5.00
      }
    ];
    localStorage.setItem("products", JSON.stringify(sampleProducts));
  }

  if (!localStorage.getItem("settings")) {
    const defaultSettings = {
      company: {
        name: "Aaryan Aqua Needs",
        tagline: "Quality Products for Better Aquaculture",
        address: "10-14-15/3, Paruchurivari Street, 11th\nWard Behind Narayana School Repalle\nAndhra Pradesh - 522265, India",
        phones: "7386262139 & 7403727272",
        email: "aaryanaquaneeds@gmail.com",
        gstin: "37ACNFA4687Q1ZC",
        state: "Andhra Pradesh",
        stateCode: "37"
      },
      bank: {
        name: "AXIS BANK, REPALLE",
        accountName: "Aaryan Aqua Needs",
        accountNo: "923020001234567",
        ifsc: "UTIB0000123",
        branch: "Repalle"
      },
      upiId: "7386262139@upi",
      telegram: { token: "8800483005:AAFVRi7PthDe_Dl1Gk1wLYnvkVP580x2y_g", chatId: "6877857251" },
      security: { autolock: "120", username: "1234", password: "1234" },
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

  if (!globalSettings.telegram) {
    globalSettings.telegram = { token: "", chatId: "" };
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

  try {
    localStorage.setItem("settings", JSON.stringify(globalSettings));
  } catch (err) {
    console.warn("Unable to persist settings:", err);
  }

  activeUsername = globalSettings.security?.username || "1234";
  activePassword = globalSettings.security?.password || globalSettings.security?.pin || "1234";
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
    } catch (err) {
      console.warn("Unable to save products db:", err);
    }
  }
}

function validateInvoiceStockAvailability(newItems, oldItems = []) {
  loadAllDatabases();
  
  const tempStockMap = {};
  productsDb.forEach(p => {
    tempStockMap[p.description] = p.stock !== undefined ? parseInt(p.stock, 10) : 0;
  });

  if (oldItems) {
    oldItems.forEach(oldItem => {
      if (tempStockMap[oldItem.description] !== undefined) {
        tempStockMap[oldItem.description] += parseInt(oldItem.quantity, 10) || 0;
      }
    });
  }

  for (let newItem of newItems) {
    const availableTempStock = tempStockMap[newItem.description] !== undefined ? tempStockMap[newItem.description] : 0;
    if (parseInt(newItem.quantity, 10) > availableTempStock) {
      alert(`❌ Error: Insufficient stock for ${newItem.description}!\nAvailable stock: ${availableTempStock}\nRequested: ${newItem.quantity}\n\nInvoice generation cancelled!`);
      return false;
    }
  }
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

// --- DASHBOARD LOADER ---
function updateDashboardOverview() {
  loadAllDatabases();
  elements.statTotalInvoices.textContent = invoicesDb.length;
  elements.statTotalProducts.textContent = productsDb.length;
  
  const uniqueParties = new Set(partiesDb.map(p => p.name)).size;
  elements.statTotalParties.textContent = uniqueParties;

  const totalRevenue = invoicesDb.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
  elements.statTotalAmount.textContent = '₹ ' + formatCurrency(totalRevenue);

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
    { el: elements.billTransportMode, key: 'transportMode' },
    { el: elements.billLrNo, key: 'lrNo' },
    { el: elements.billTransportDate, key: 'transportDate' },
    { el: elements.billSupplyDate, key: 'supplyDate' },
    { el: elements.billBundles, key: 'bundles', isInt: true },
    { el: elements.billSupplyPlace, key: 'supplyPlace' },
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
    { el: elements.billConsigneeState, sub: 'consignee', key: 'state' },
    { el: elements.billConsigneeStateCode, sub: 'consignee', key: 'stateCode' }
  ];

  binds.forEach(b => {
    if (!b.el) return;
    b.el.addEventListener("input", (e) => {
      let val = e.target.value;
      if (b.isInt) val = parseInt(val, 10) || 0;
      if (b.isFloat) val = parseFloat(val) || 0;

      if (b.sub) {
        currentInvoice[b.sub][b.key] = val;
      } else {
        currentInvoice[b.key] = val;
      }
      calculateSummaryAndTable();
    });
    b.el.addEventListener("change", (e) => {
      let val = e.target.value;
      if (b.sub) {
        currentInvoice[b.sub][b.key] = val;
      } else {
        currentInvoice[b.key] = val;
      }
      calculateSummaryAndTable();
    });
  });

  elements.billItemSelect.addEventListener("change", (e) => {
    const prodId = e.target.value;
    if (!prodId) {
      elements.billItemHsn.value = "";
      elements.billItemRate.value = "0";
      elements.billItemQty.value = "0";
      elements.billItemUnit.value = "";
      elements.billItemGstRate.value = "0";
      elements.billItemDiscount.value = "0";
      if (elements.billItemStockQty) elements.billItemStockQty.value = "—";
      return;
    }
    const prod = productsDb.find(p => p.id === prodId);
    if (prod) {
      elements.billItemHsn.value = prod.hsn || "";
      elements.billItemRate.value = prod.rate || "0";
      elements.billItemQty.value = "1";
      elements.billItemUnit.value = prod.unit || "Bucket";
      elements.billItemGstRate.value = "0";
      elements.billItemDiscount.value = prod.discount || "0";
      if (elements.billItemStockQty) {
        elements.billItemStockQty.value = prod.stock !== undefined ? prod.stock : 0;
      }
    }
  });

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

  elements.billItemSelect.innerHTML = `<option value="">-- Search product --</option>`;
  productsDb.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.description} (₹${p.rate})`;
    elements.billItemSelect.appendChild(opt);
  });
}

window.copyBuyerToConsignee = function() {
  currentInvoice.consignee = { ...currentInvoice.buyer };
  elements.billConsigneeName.value = currentInvoice.consignee.name;
  elements.billConsigneeAddress.value = currentInvoice.consignee.address;
  elements.billConsigneeGstin.value = currentInvoice.consignee.gstin;
  elements.billConsigneeState.value = currentInvoice.consignee.state;
  elements.billConsigneeStateCode.value = currentInvoice.consignee.stateCode;
  
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

function autoSuggestInvoiceNo() {
  const nextStr = InvoiceUtils.getNextInvoiceNumber(invoicesDb);
  currentInvoice.invoiceNo = nextStr;

  if (elements.billInvoiceNo) {
    elements.billInvoiceNo.value = currentInvoice.invoiceNo;
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
  const prodId = elements.billItemSelect.value;
  let desc = "";
  const prod = productsDb.find(p => p.id === prodId);
  if (prod) {
    desc = prod.description;
  } else {
    alert("Please select a Product!");
    return;
  }

  const hsn = elements.billItemHsn.value.trim();
  const qty = parseInt(elements.billItemQty.value, 10) || 0;
  const unit = elements.billItemUnit.value.trim() || "Bucket";
  const gstRate = parseFloat(elements.billItemGstRate.value) || 0;
  const discount = parseFloat(elements.billItemDiscount.value) || 0;
  const rate = parseFloat(elements.billItemRate.value) || 0;

  if (qty <= 0) {
    alert("Please enter a valid Quantity!");
    return;
  }
  if (rate <= 0) {
    alert("Please enter a valid Rate!");
    return;
  }

  // Hard stock block check
  if (prod) {
    const currentInCart = currentInvoice.items
      .filter(item => item.description === prod.description)
      .reduce((sum, item) => sum + item.quantity, 0);
    const totalRequested = currentInCart + qty;
    const availableStock = prod.stock !== undefined ? parseInt(prod.stock, 10) : 0;
    if (totalRequested > availableStock) {
      alert(`❌ Error: Insufficient stock for ${prod.description}!\nAvailable stock: ${availableStock}\nRequested in invoice: ${totalRequested}`);
      return;
    }
  }

  const rawSubtotal = qty * rate;
  const amount = rawSubtotal * (1 - discount / 100);

  const newItem = {
    id: Date.now().toString(),
    baleNo: (currentInvoice.items.length + 1).toString(),
    description: desc,
    hsn: hsn,
    quantity: qty,
    unit: unit,
    rate: rate,
    gstRate: gstRate,
    discount: discount,
    amount: amount
  };

  currentInvoice.items.push(newItem);
  
  elements.billItemSelect.value = "";
  elements.billItemHsn.value = "";
  elements.billItemQty.value = "0";
  elements.billItemUnit.value = "";
  elements.billItemGstRate.value = "5";
  elements.billItemDiscount.value = "0";
  elements.billItemRate.value = "0";

  calculateSummaryAndTable();
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
  elements.billingItemsTbody.innerHTML = "";
  
  if (currentInvoice.items.length === 0) {
    elements.noItemsPlaceholder.classList.remove("hidden");
  } else {
    elements.noItemsPlaceholder.classList.add("hidden");
  }

  let totalQty = 0;
  const sellerStateCode = globalSettings.company?.stateCode || "37";
  const buyerStateCode = currentInvoice.buyer.stateCode || "37";
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
      <td style="text-align: left; font-weight: 600;">${item.description}</td>
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
    invoiceType: "Bill of Supply",
    headerLogo: "ganesha",
    invoiceNo: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentDate: new Date().toISOString().split('T')[0],
    transportMode: "",
    lrNo: "",
    transportDate: "",
    supplyDate: "",
    bundles: 0,
    supplyPlace: "Andhra Pradesh",
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
  elements.billTransportMode.value = "";
  elements.billLrNo.value = "";
  elements.billTransportDate.value = "";
  elements.billSupplyDate.value = "";
  elements.billBundles.value = "0";
  elements.billSupplyPlace.value = "Andhra Pradesh";
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

// --- GENERATE INVOICE CONTROLLER ---
window.generateAndPrintInvoice = function() {
  if (!currentInvoice.invoiceNo) {
    alert("Please provide an Invoice Number!");
    return;
  }
  if (!currentInvoice.buyer.name) {
    alert("Please provide a Buyer Customer Name!");
    return;
  }
  if (currentInvoice.items.length === 0) {
    alert("Please add at least one line item!");
    return;
  }

  const existingIdxForStock = invoicesDb.findIndex(inv => inv.id === currentInvoice.invoiceNo);
  const oldItemsForStock = existingIdxForStock > -1 ? invoicesDb[existingIdxForStock].details.items : [];
  if (!validateInvoiceStockAvailability(currentInvoice.items, oldItemsForStock)) {
    return;
  }

  const sellerStateCode = globalSettings.company?.stateCode || "37";
  const buyerStateCode = currentInvoice.buyer.stateCode || "37";
  const breakdown = InvoiceUtils.calculateInvoiceBreakdown(currentInvoice.items, sellerStateCode, buyerStateCode);
  let taxableVal = breakdown.taxableVal;
  let totalCgst = breakdown.totalCgst;
  let totalSgst = breakdown.totalSgst;
  let totalIgst = breakdown.totalIgst;
  const grandTotal = breakdown.roundedGrandTotal;
  const roundOff = breakdown.roundOff;

  if (!validateInvoicePaymentExceeds(currentInvoice, grandTotal)) {
    return;
  }

  currentInvoice.taxable = taxableVal;
  currentInvoice.cgst = totalCgst;
  currentInvoice.sgst = totalSgst;
  currentInvoice.igst = totalIgst;
  currentInvoice.roundOff = roundOff;
  currentInvoice.total = grandTotal;

  const invoiceRecord = {
    id: currentInvoice.invoiceNo,
    invoiceNo: currentInvoice.invoiceNo,
    invoiceDate: currentInvoice.invoiceDate,
    customerName: currentInvoice.buyer.name,
    itemsCount: currentInvoice.items.length,
    total: grandTotal,
    details: JSON.parse(JSON.stringify(currentInvoice))
  };

  const existingIdx = invoicesDb.findIndex(inv => inv.id === invoiceRecord.id);
  if (existingIdx > -1) {
    if (confirm(`Overwrite existing Invoice #${invoiceRecord.invoiceNo} in history?`)) {
      reconcileProductInventoryStock(invoicesDb[existingIdx].details, currentInvoice);
      invoicesDb[existingIdx] = invoiceRecord;
    } else {
      return;
    }
  } else {
    reconcileProductInventoryStock(null, currentInvoice);
    invoicesDb.push(invoiceRecord);
  }

  try {
    localStorage.setItem("invoices", JSON.stringify(invoicesDb));
  } catch (err) {
    console.warn("Unable to persist invoices:", err);
  }
  sendTelegramInvoiceNotification(invoiceRecord);
  populateA4PrintOverlay(invoiceRecord.details);
  uploadInvoicePdfToTelegram(invoiceRecord.details, true);

  setTimeout(() => {
    document.body.classList.remove("printing-thermal");
    window.print();
    resetBillingForm();
    switchTab("history");
  }, 100);
};

window.saveAndGenerateInvoiceOnly = function(btnEl) {
  if (!currentInvoice.invoiceNo) {
    alert("Please provide an Invoice Number!");
    return;
  }
  if (!currentInvoice.buyer.name) {
    alert("Please provide a Buyer Customer Name!");
    return;
  }
  if (currentInvoice.items.length === 0) {
    alert("Please add at least one line item!");
    return;
  }

  const existingIdxForStock = invoicesDb.findIndex(inv => inv.id === currentInvoice.invoiceNo);
  const oldItemsForStock = existingIdxForStock > -1 ? invoicesDb[existingIdxForStock].details.items : [];
  if (!validateInvoiceStockAvailability(currentInvoice.items, oldItemsForStock)) {
    return;
  }

  const sellerStateCode = globalSettings.company?.stateCode || "37";
  const buyerStateCode = currentInvoice.buyer.stateCode || "37";
  const breakdown = InvoiceUtils.calculateInvoiceBreakdown(currentInvoice.items, sellerStateCode, buyerStateCode);
  let taxableVal = breakdown.taxableVal;
  let totalCgst = breakdown.totalCgst;
  let totalSgst = breakdown.totalSgst;
  let totalIgst = breakdown.totalIgst;
  const grandTotal = breakdown.roundedGrandTotal;
  const roundOff = breakdown.roundOff;

  if (!validateInvoicePaymentExceeds(currentInvoice, grandTotal)) {
    return;
  }

  currentInvoice.taxable = taxableVal;
  currentInvoice.cgst = totalCgst;
  currentInvoice.sgst = totalSgst;
  currentInvoice.igst = totalIgst;
  currentInvoice.roundOff = roundOff;
  currentInvoice.total = grandTotal;

  const invoiceRecord = {
    id: currentInvoice.invoiceNo,
    invoiceNo: currentInvoice.invoiceNo,
    invoiceDate: currentInvoice.invoiceDate,
    customerName: currentInvoice.buyer.name,
    itemsCount: currentInvoice.items.length,
    total: grandTotal,
    details: JSON.parse(JSON.stringify(currentInvoice))
  };

  const existingIdx = invoicesDb.findIndex(inv => inv.id === invoiceRecord.id);
  if (existingIdx > -1) {
    if (confirm(`Overwrite existing Invoice #${invoiceRecord.invoiceNo} in history?`)) {
      reconcileProductInventoryStock(invoicesDb[existingIdx].details, currentInvoice);
      invoicesDb[existingIdx] = invoiceRecord;
    } else {
      return;
    }
  } else {
    reconcileProductInventoryStock(null, currentInvoice);
    invoicesDb.push(invoiceRecord);
  }

  try {
    localStorage.setItem("invoices", JSON.stringify(invoicesDb));
  } catch (err) {
    console.warn("Unable to persist invoices:", err);
  }
  
  sendTelegramInvoiceNotification(invoiceRecord);
  uploadInvoicePdfToTelegram(invoiceRecord.details, true);

  alert(`✅ Invoice #${invoiceRecord.invoiceNo} generated & saved to history successfully!`);

  resetBillingForm();
  switchTab("history");
};

window.generateAndPrintThermal = function(btnEl) {
  if (!currentInvoice.invoiceNo) {
    alert("Please provide an Invoice Number!");
    return;
  }
  if (!currentInvoice.buyer.name) {
    alert("Please provide a Buyer Customer Name!");
    return;
  }
  if (currentInvoice.items.length === 0) {
    alert("Please add at least one line item!");
    return;
  }

  const existingIdxForStock = invoicesDb.findIndex(inv => inv.id === currentInvoice.invoiceNo);
  const oldItemsForStock = existingIdxForStock > -1 ? invoicesDb[existingIdxForStock].details.items : [];
  if (!validateInvoiceStockAvailability(currentInvoice.items, oldItemsForStock)) {
    return;
  }

  const sellerStateCode = globalSettings.company?.stateCode || "37";
  const buyerStateCode = currentInvoice.buyer.stateCode || "37";
  const breakdown = InvoiceUtils.calculateInvoiceBreakdown(currentInvoice.items, sellerStateCode, buyerStateCode);
  let taxableVal = breakdown.taxableVal;
  let totalCgst = breakdown.totalCgst;
  let totalSgst = breakdown.totalSgst;
  let totalIgst = breakdown.totalIgst;
  const grandTotal = breakdown.roundedGrandTotal;
  const roundOff = breakdown.roundOff;

  if (!validateInvoicePaymentExceeds(currentInvoice, grandTotal)) {
    return;
  }

  currentInvoice.taxable = taxableVal;
  currentInvoice.cgst = totalCgst;
  currentInvoice.sgst = totalSgst;
  currentInvoice.igst = totalIgst;
  currentInvoice.roundOff = roundOff;
  currentInvoice.total = grandTotal;

  const invoiceRecord = {
    id: currentInvoice.invoiceNo,
    invoiceNo: currentInvoice.invoiceNo,
    invoiceDate: currentInvoice.invoiceDate,
    customerName: currentInvoice.buyer.name,
    itemsCount: currentInvoice.items.length,
    total: grandTotal,
    details: JSON.parse(JSON.stringify(currentInvoice))
  };

  const existingIdx = invoicesDb.findIndex(inv => inv.id === invoiceRecord.id);
  if (existingIdx > -1) {
    if (confirm(`Overwrite existing Invoice #${invoiceRecord.invoiceNo} in history?`)) {
      reconcileProductInventoryStock(invoicesDb[existingIdx].details, currentInvoice);
      invoicesDb[existingIdx] = invoiceRecord;
    } else {
      return;
    }
  } else {
    reconcileProductInventoryStock(null, currentInvoice);
    invoicesDb.push(invoiceRecord);
  }

  try {
    localStorage.setItem("invoices", JSON.stringify(invoicesDb));
  } catch (err) {
    console.warn("Unable to persist invoices:", err);
  }
  sendTelegramInvoiceNotification(invoiceRecord);
  uploadInvoicePdfToTelegram(invoiceRecord.details, true);

  // Trigger POS Thermal Print dialog
  populateThermalPrintOverlay(invoiceRecord.details);
  document.body.classList.add("printing-thermal");
  setTimeout(() => {
    window.print();
    document.body.classList.remove("printing-thermal");
    resetBillingForm();
    switchTab("history");
  }, 100);
};

// --- POPULATE PRINT VIEW CANVAS (A4) ---
function populateA4PrintOverlay(invoice) {
  const company = globalSettings.company;

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
  } else if (logoChoice === "venkateswara") {
    if (divineMottoRow) divineMottoRow.style.display = "flex";
    if (divineImg) { divineImg.style.display = "block"; divineImg.src = "lord_venkateswara.jpg"; }
    if (divineImgRight) { divineImgRight.style.display = "none"; }
    if (mottoText) mottoText.textContent = "॥ श्री वेंकटेश्वराय नमः ॥";
  } else {
    if (divineMottoRow) divineMottoRow.style.display = "none";
  }

  document.getElementById("p-print-document-title").textContent = invoice.invoiceType ? invoice.invoiceType.toUpperCase() : "BILL OF SUPPLY";

  document.getElementById("p-print-company-name").textContent = company.name || "AARYAN AQUA NEEDS";
  const taglineEl = document.getElementById("p-print-company-tagline");
  if (taglineEl) taglineEl.textContent = company.tagline || "QUALITY PRODUCTS FOR BETTER AQUACULTURE";
  document.getElementById("p-print-company-address").innerHTML = (company.address || "").replace(/\n/g, ", ");
  document.getElementById("p-print-company-phones").textContent = company.phones || "";
  document.getElementById("p-print-company-gstin").textContent = company.gstin || "";
  document.getElementById("p-print-company-state").textContent = company.state || "Andhra Pradesh";
  document.getElementById("p-print-company-state-code").textContent = company.stateCode || "37";

  document.getElementById("p-print-invoice-no").textContent = invoice.invoiceNo;
  document.getElementById("p-print-invoice-date").textContent = formatInputDateString(invoice.invoiceDate);
  
  document.getElementById("p-print-delivery-note").textContent = invoice.deliveryNote || "—";
  document.getElementById("p-print-payment-mode").textContent = `${invoice.paymentMode || 'Cash'} (${invoice.paymentStatus || 'Paid'})`;
  document.getElementById("p-print-ref-no-date").textContent = invoice.referenceNoDate || "—";
  document.getElementById("p-print-other-references").textContent = invoice.otherReferences || "—";
  document.getElementById("p-print-buyer-order-no").textContent = invoice.buyerOrderNo || "—";
  document.getElementById("p-print-buyer-order-date").textContent = invoice.buyerOrderDate ? formatInputDateString(invoice.buyerOrderDate) : "—";
  document.getElementById("p-print-dispatch-doc-no").textContent = invoice.dispatchDocNo || "—";
  document.getElementById("p-print-delivery-note-date").textContent = invoice.deliveryNoteDate ? formatInputDateString(invoice.deliveryNoteDate) : "—";
  document.getElementById("p-print-dispatched-through").textContent = invoice.dispatchedThrough || "—";
  document.getElementById("p-print-destination").textContent = invoice.destination || "—";
  document.getElementById("p-print-delivery-terms").textContent = invoice.deliveryTerms || "—";

  document.getElementById("p-print-buyer-name").textContent = invoice.buyer.name;
  document.getElementById("p-print-buyer-address").innerHTML = (invoice.buyer.address || "").replace(/\n/g, "<br>");
  document.getElementById("p-print-buyer-gstin").textContent = invoice.buyer.gstin || "—";
  document.getElementById("p-print-buyer-state").textContent = invoice.buyer.state || "Andhra Pradesh";
  document.getElementById("p-print-buyer-state-code").textContent = invoice.buyer.stateCode || "37";

  const consigneeName = invoice.consignee.name || invoice.buyer.name;
  const consigneeAddress = invoice.consignee.address || invoice.buyer.address;
  const consigneeGstin = invoice.consignee.gstin || invoice.buyer.gstin;
  const consigneeState = invoice.consignee.state || invoice.buyer.state;
  const consigneeStateCode = invoice.consignee.stateCode || invoice.buyer.stateCode;

  document.getElementById("p-print-consignee-name").textContent = consigneeName;
  document.getElementById("p-print-consignee-address").innerHTML = (consigneeAddress || "").replace(/\n/g, "<br>");
  document.getElementById("p-print-consignee-gstin").textContent = consigneeGstin || "—";
  document.getElementById("p-print-consignee-state").textContent = consigneeState || "Andhra Pradesh";
  document.getElementById("p-print-consignee-state-code").textContent = consigneeStateCode || "37";

  const printItemsTbody = document.getElementById("p-print-items-tbody");
  printItemsTbody.innerHTML = "";
  
  let taxableVal = 0;
  let totalQuantity = 0;

  invoice.items.forEach((item, index) => {
    taxableVal += item.amount;
    totalQuantity += item.quantity;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center; border-right: 1.5px solid #000;">${index + 1}</td>
      <td style="text-align: left; font-weight: 700; color: #000; border-right: 1.5px solid #000;">${item.description}</td>
      <td style="text-align: center; border-right: 1.5px solid #000;">${item.hsn || "—"}</td>
      <td style="text-align: center; border-right: 1.5px solid #000; font-weight: 700;">${item.quantity} ${item.unit || 'bucket'}</td>
      <td style="text-align: right; border-right: 1.5px solid #000;">${formatCurrency(item.rate)}</td>
      <td style="text-align: center; border-right: 1.5px solid #000;">${item.unit || 'bucket'}</td>
      <td style="text-align: center; border-right: 1.5px solid #000;">${item.discount ? item.discount.toFixed(2) + ' %' : '0.00 %'}</td>
      <td style="text-align: right; font-weight: 700;">${formatCurrency(item.amount)}</td>
    `;
    printItemsTbody.appendChild(tr);
  });

  const minRows = 7;
  const currRows = invoice.items.length;
  if (currRows < minRows) {
    for (let i = currRows; i < minRows; i++) {
      const tr = document.createElement("tr");
      tr.className = "filler-row";
      tr.innerHTML = `
        <td style="border-right: 1.5px solid #000;">&nbsp;</td>
        <td style="border-right: 1.5px solid #000;">&nbsp;</td>
        <td style="border-right: 1.5px solid #000;">&nbsp;</td>
        <td style="border-right: 1.5px solid #000;">&nbsp;</td>
        <td style="border-right: 1.5px solid #000;">&nbsp;</td>
        <td style="border-right: 1.5px solid #000;">&nbsp;</td>
        <td style="border-right: 1.5px solid #000;">&nbsp;</td>
        <td>&nbsp;</td>
      `;
      printItemsTbody.appendChild(tr);
    }
  }

  document.getElementById("p-print-total-quantity").textContent = `${totalQuantity} ${invoice.items[0]?.unit || 'bucket'}`;
  document.getElementById("p-print-total-amount").textContent = `₹ ${formatCurrency(taxableVal)}`;

  const roundedGrandTotal = Math.round(invoice.total || taxableVal);
  document.getElementById("p-print-amount-words").textContent = convertNumberToWords(roundedGrandTotal) + " Rupees Only";

  // Populate new payment status and receipt details block
  const pStatus = invoice.paymentStatus || 'Paid';
  document.getElementById("p-print-payment-status").textContent = pStatus;
  document.getElementById("p-print-payment-status").style.color = pStatus === 'Paid' ? '#10b981' : (pStatus === 'Partial' ? '#f59e0b' : '#ef4444');
  document.getElementById("p-print-payment-mode-val").textContent = invoice.paymentMode || 'Cash';
  document.getElementById("p-print-billing-date-val").textContent = formatInputDateString(invoice.invoiceDate);
  document.getElementById("p-print-payment-date-val").textContent = formatInputDateString(invoice.paymentDate || invoice.invoiceDate);
  document.getElementById("p-print-summary-total").textContent = `₹ ${formatCurrency(roundedGrandTotal)}`;
  document.getElementById("p-print-summary-paid").textContent = `₹ ${formatCurrency(invoice.paidAmount !== undefined ? invoice.paidAmount : roundedGrandTotal)}`;
  document.getElementById("p-print-summary-balance-paid").textContent = `₹ ${formatCurrency(invoice.balancePaid !== undefined ? invoice.balancePaid : 0)}`;
  document.getElementById("p-print-summary-due").textContent = `₹ ${formatCurrency(invoice.balanceDue !== undefined ? invoice.balanceDue : 0)}`;

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
      <td style="text-align: right;">₹ ${formatCurrency(data.taxable)}</td>
      <td style="text-align: right;">₹ ${formatCurrency(data.cgst)}</td>
      <td style="text-align: right;">₹ ${formatCurrency(data.sgst)}</td>
      <td style="text-align: right;">₹ ${formatCurrency(data.igst)}</td>
      <td style="text-align: right; font-weight: 700;">₹ ${formatCurrency(totalTax)}</td>
    `;
    hsnTbody.appendChild(tr);
  });

  const totalHsnTaxSum = totHsnCgst + totHsnSgst + totHsnIgst;
  document.getElementById("p-print-hsn-total-taxable").textContent = `₹ ${formatCurrency(totHsnTaxable)}`;
  document.getElementById("p-print-hsn-total-cgst").textContent = `₹ ${formatCurrency(totHsnCgst)}`;
  document.getElementById("p-print-hsn-total-sgst").textContent = `₹ ${formatCurrency(totHsnSgst)}`;
  document.getElementById("p-print-hsn-total-igst").textContent = `₹ ${formatCurrency(totHsnIgst)}`;
  document.getElementById("p-print-hsn-total-tax").textContent = `₹ ${formatCurrency(totalHsnTaxSum)}`;

  document.getElementById("p-print-tax-words").textContent = convertNumberToWords(Math.round(totalHsnTaxSum)) + " Rupees Only";
  document.getElementById("p-print-sign-company").textContent = company.name ? company.name.toUpperCase() : "AARYAN AQUA NEEDS";

  // Bank & Payment QR Code Population
  const bank = globalSettings.bank || {};
  const bankNameEl = document.getElementById("p-print-bank-name");
  if (bankNameEl) bankNameEl.textContent = bank.name || "AXIS BANK, REPALLE";
  const bankAccNameEl = document.getElementById("p-print-bank-acc-name");
  if (bankAccNameEl) bankAccNameEl.textContent = bank.accountName || company.name || "Aaryan Aqua Needs";
  const bankAccNoEl = document.getElementById("p-print-bank-acc-no");
  if (bankAccNoEl) bankAccNoEl.textContent = bank.accountNo || "923020001234567";
  const bankIfscEl = document.getElementById("p-print-bank-ifsc");
  if (bankIfscEl) bankIfscEl.textContent = bank.ifsc || "UTIB0000123";
  const bankBranchEl = document.getElementById("p-print-bank-branch");
  if (bankBranchEl) bankBranchEl.textContent = bank.branch || "Repalle";
  const upiIdEl = document.getElementById("p-print-upi-id");
  const activeUpi = globalSettings.upiId || "7386262139@upi";
  if (upiIdEl) upiIdEl.textContent = activeUpi;

}

// --- POPULATE THERMAL POS PRINT OVERLAY ---
function populateThermalPrintOverlay(invoice) {
  const company = globalSettings.company;
  
  const logoImg = document.getElementById("th-divine-img");
  if (logoImg) {
    if (invoice.headerLogo === "venkateswara") logoImg.src = "lord_venkateswara.jpg";
    else if (invoice.headerLogo === "none") logoImg.style.display = "none";
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
  const details = invoiceData || currentInvoice;
  if (!details.invoiceNo || !details.buyer?.name || !details.items || details.items.length === 0) {
    alert("Please fill invoice details and add items before exporting PDF!");
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

  const customerClean = (details.buyer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Invoice_${details.invoiceNo}_${customerClean}.pdf`;

  const opt = {
    margin: [3, 3, 3, 3],
    filename: filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 1.35, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    element.style.display = "none";
    if (btnEl && btnEl.tagName) {
      btnEl.innerHTML = origHtml;
      btnEl.disabled = false;
    }
  }).catch(err => {
    console.error("PDF export error:", err);
    element.style.display = "none";
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
  }
  return digits;
}

let pendingWaMsg = "";

window.shareInvoicePdfNative = function(details, btnEl = null) {
  if (!details || !details.invoiceNo || !details.buyer?.name || !details.items || details.items.length === 0) {
    alert("Please fill invoice details and add items before sharing!");
    return;
  }

  let origHtml = "";
  if (btnEl && btnEl.tagName) {
    origHtml = btnEl.innerHTML;
    btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Preparing PDF...`;
    btnEl.disabled = true;
  }

  populateA4PrintOverlay(details);
  const element = document.getElementById("print-invoice-wrapper");
  if (!element) return;

  element.style.display = "block";
  document.body.classList.remove("printing-thermal");

  const customerClean = (details.buyer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Invoice_${details.invoiceNo}_${customerClean}.pdf`;

  const opt = {
    margin: [3, 3, 3, 3],
    filename: filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 1.35, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).outputPdf('blob').then(pdfBlob => {
    element.style.display = "none";
    if (btnEl && btnEl.tagName) {
      btnEl.innerHTML = origHtml;
      btnEl.disabled = false;
    }
    
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        title: `Invoice #${details.invoiceNo}`,
        text: `Official Tax Invoice #${details.invoiceNo} - Aaryan Aqua Needs`,
        files: [file]
      }).catch(err => {
        console.log("Share cancelled:", err);
      });
    } else {
      // Direct PDF Download Fallback
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdfBlob);
      a.download = filename;
      a.click();

      const msg = `*${globalSettings.company?.name || 'AARYAN AQUA NEEDS'}*\n` +
                  `*Invoice No:* #${details.invoiceNo} (${details.invoiceType || 'Tax Invoice'})\n` +
                  `*Customer:* ${details.buyer.name}\n` +
                  `*Grand Total:* ₹ ${formatCurrency(details.total || 0)}\n\n` +
                  `📄 Please find attached official Tax Invoice PDF file (#${details.invoiceNo}).`;

      pendingWaMsg = msg;

      const customerPhone = details.buyer?.phone || (elements.billBuyerPhone ? elements.billBuyerPhone.value : "");
      const phoneInput = document.getElementById("guide-whatsapp-phone");
      if (phoneInput) phoneInput.value = customerPhone || "";

      const fnEl = document.getElementById("guide-pdf-filename");
      if (fnEl) fnEl.textContent = filename;
      const modalEl = document.getElementById("whatsapp-pdf-guide-modal");
      if (modalEl) modalEl.classList.remove("hidden");
    }
  }).catch(err => {
    console.error("PDF share generation error:", err);
    element.style.display = "none";
    if (btnEl && btnEl.tagName) {
      btnEl.innerHTML = origHtml;
      btnEl.disabled = false;
    }
  });
};

window.openWhatsappWebChat = function() {
  const modalEl = document.getElementById("whatsapp-pdf-guide-modal");
  if (modalEl) modalEl.classList.add("hidden");

  const phoneInput = document.getElementById("guide-whatsapp-phone");
  const enteredPhone = phoneInput ? phoneInput.value.trim() : "";
  const cleanPhone = formatWhatsAppPhone(enteredPhone);

  let url = "";
  if (cleanPhone) {
    url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(pendingWaMsg)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(pendingWaMsg)}`;
  }

  window.open(url, '_blank');
};

window.closeWhatsappGuideModal = function() {
  const modalEl = document.getElementById("whatsapp-pdf-guide-modal");
  if (modalEl) modalEl.classList.add("hidden");
};

window.shareCurrentInvoiceWhatsApp = function() {
  shareInvoicePdfNative(currentInvoice);
};

window.shareInvoiceToWhatsApp = function(id) {
  const inv = invoicesDb.find(i => i.id === id);
  if (inv) {
    shareInvoicePdfNative(inv.details);
  }
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
        <button class="action-btn print" onclick="downloadSavedInvoicePdf('${inv.id}')" title="Download PDF"><i class="fa-solid fa-file-pdf text-rose"></i></button>
        <button class="action-btn print" onclick="printSavedInvoiceThermal('${inv.id}')" title="Print Thermal POS"><i class="fa-solid fa-receipt"></i></button>
        <button class="action-btn share btn-whatsapp" onclick="shareInvoiceToWhatsApp('${inv.id}')" title="Share via WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
        <button class="action-btn share" onclick="shareInvoiceToTelegram('${inv.id}', this)" title="Share PDF to Telegram"><i class="fa-solid fa-paper-plane text-teal"></i></button>
        <button class="action-btn delete" onclick="deleteSavedInvoice('${inv.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    elements.historyInvoicesBody.appendChild(tr);
  });
}

elements.searchHistoryInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderHistoryTableRows(invoicesDb);
    return;
  }
  const filtered = invoicesDb.filter(inv => 
    inv.invoiceNo.toLowerCase().includes(query) || 
    inv.customerName.toLowerCase().includes(query)
  );
  renderHistoryTableRows(filtered);
});

window.editSavedInvoice = function(id) {
  const inv = invoicesDb.find(i => i.id === id);
  if (inv) {
    currentInvoice = JSON.parse(JSON.stringify(inv.details));
    
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
    elements.billTransportMode.value = currentInvoice.transportMode || "";
    elements.billLrNo.value = currentInvoice.lrNo || "";
    elements.billTransportDate.value = currentInvoice.transportDate || "";
    elements.billSupplyDate.value = currentInvoice.supplyDate || "";
    elements.billBundles.value = currentInvoice.bundles !== undefined ? currentInvoice.bundles : 0;
    elements.billSupplyPlace.value = currentInvoice.supplyPlace || "Andhra Pradesh";
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
    invoicesDb = invoicesDb.filter(inv => inv.id !== id);
    localStorage.setItem("invoices", JSON.stringify(invoicesDb));
    
    // Automatically recalculate next invoice number sequence
    autoSuggestInvoiceNo();
    
    updateDashboardOverview();
    if (!elements.historyInvoicesBody.closest('.content-view').classList.contains('hidden')) {
      loadInvoicesHistoryTable();
    }
  }
};

// --- PRODUCTS DIALOG MODAL CONTROLLER ---
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

  document.getElementById("product-modal").classList.remove("hidden");
};

window.closeProductModal = function() {
  document.getElementById("product-modal").classList.add("hidden");
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

  const product = { id: id || "prod-" + Date.now(), description: desc, hsn, packSize: pack, unit, rate, gstRate: 0, discount: disc, stock: stock };

  if (id) {
    const idx = productsDb.findIndex(p => p.id === id);
    if (idx > -1) productsDb[idx] = product;
  } else {
    productsDb.push(product);
  }

  localStorage.setItem("products", JSON.stringify(productsDb));
  closeProductModal();
  loadProductsDatabaseTable();
  populateBillingSelectors();
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
        <td colspan="4" class="text-center text-muted">No products found.</td>
      </tr>
    `;
    return;
  }

  records.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 600;">${p.description}</td>
      <td>${p.hsn || "—"}</td>
      <td style="text-align: right; font-weight: 700; color: var(--primary-teal);">₹ ${formatCurrency(p.rate)}</td>
      <td style="text-align: center; font-weight: 700; color: var(--primary-teal);">${p.stock !== undefined ? p.stock : 0}</td>
      <td class="actions-cell">
        <button class="action-btn edit" onclick="openProductModal('${p.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="action-btn delete" onclick="deleteProductRowDb('${p.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    elements.productsListBody.appendChild(tr);
  });
}

window.deleteProductRowDb = function(id) {
  if (confirm("Delete product from inventory list permanently?")) {
    productsDb = productsDb.filter(p => p.id !== id);
    localStorage.setItem("products", JSON.stringify(productsDb));
    loadProductsDatabaseTable();
  }
};

elements.searchProductsInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderProductsTable(productsDb);
    return;
  }
  const filtered = productsDb.filter(p => 
    p.description.toLowerCase().includes(query) || 
    p.hsn.toLowerCase().includes(query)
  );
  renderProductsTable(filtered);
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
  document.getElementById("party-modal").classList.add("hidden");
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

  const party = { id: id || "party-" + Date.now(), type, name, company, address, gstin, state, stateCode, phone };

  if (id) {
    const idx = partiesDb.findIndex(p => p.id === id);
    if (idx > -1) partiesDb[idx] = party;
  } else {
    partiesDb.push(party);
  }

  localStorage.setItem("parties", JSON.stringify(partiesDb));
  closePartyModal();
  loadPartiesDatabaseLists();
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

function createPartyListCard(p) {
  const card = document.createElement("div");
  card.className = "party-list-card";
  card.innerHTML = `
    <div class="party-list-card-details">
      <h4>${p.name}</h4>
      ${p.company ? `<p style="font-weight:600; color:var(--text-dark); margin: 2px 0;">${p.company}</p>` : ''}
      <p style="font-size:10.5px; color:#475569; white-space: pre-line;">${p.address}</p>
      <span>${p.phone ? 'Ph: ' + p.phone : ''}</span>
    </div>
    <div class="actions-cell">
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
    loadPartiesDatabaseLists();
  }
};

// --- REPORTS VIEW DATE RANGE RUNNER ---
function resetReportsView() {
  elements.reportStartDate.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  elements.reportEndDate.value = new Date().toISOString().split('T')[0];
  
  elements.reportResultsPlaceholder.classList.remove("hidden");
  elements.reportResultsContent.classList.add("hidden");
}

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

  elements.setTgToken.value = globalSettings.telegram?.token || "";
  elements.setTgChatId.value = globalSettings.telegram?.chatId || "";
  if (globalSettings.telegram?.token && globalSettings.telegram?.chatId) {
    elements.tgStatusIndicator.classList.remove("hidden");
    elements.tgStatusText.textContent = "Credentials loaded.";
  } else {
    elements.tgStatusIndicator.classList.add("hidden");
  }

  elements.setAutolockTimer.value = globalSettings.security?.autolock || "300";
  elements.setLoginUsername.value = globalSettings.security?.username || "1234";
  elements.setLoginPassword.value = globalSettings.security?.password || globalSettings.security?.pin || "1234";

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

  try {
    const text = encodeURIComponent("🔔 Aaryan Aqua Needs billing system has successfully connected your Telegram bot notification API!");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=${text}`);
    const data = await res.json();
    
    if (data.ok) {
      elements.tgStatusIndicator.className = "info-note col-12 text-success";
      elements.tgStatusText.textContent = "Test Message Sent! Check your Telegram Chat.";
    } else {
      elements.tgStatusIndicator.className = "info-note col-12 text-danger";
      elements.tgStatusText.textContent = `Error: ${data.description}`;
    }
  } catch (err) {
    elements.tgStatusIndicator.className = "info-note col-12 text-danger";
    elements.tgStatusText.textContent = "Network Error! Bot API request failed.";
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

  globalSettings.security = { autolock, username, password };
  localStorage.setItem("settings", JSON.stringify(globalSettings));
  alert("Login credentials and lock settings saved successfully!");
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
  alert("Store configuration defaults saved successfully!");
  loadAllDatabases();
};

async function sendTelegramInvoiceNotification(invoice) {
  const token = globalSettings.telegram?.token;
  const chat = globalSettings.telegram?.chatId;

  if (!token || !chat) return;

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
    fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=${text}`);
  } catch (err) {
    console.error("Failed to dispatch Telegram bot notification", err);
  }
}

// --- ACTIVITY AUTO-LOCK CONTROLLER ---
function resetAutolockTimer() {
  if (isLocked) return;

  clearTimeout(autolockInterval);
  if (lockTimerSeconds === 0) return;

  autolockInterval = setTimeout(triggerLockOverlay, lockTimerSeconds * 1000);
}

window.triggerManualLock = function() {
  triggerLockOverlay();
};

function triggerLockOverlay() {
  isLocked = true;
  document.getElementById("login-form").reset();
  document.getElementById("login-error-message").classList.add("hidden");
  
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
async function uploadInvoicePdfToTelegram(invoiceDetails, silent = false) {
  const token = globalSettings.telegram?.token;
  const chat = globalSettings.telegram?.chatId;

  if (!token || !chat) {
    if (!silent) alert("Telegram bot token or Chat ID is missing! Please configure in Settings.");
    return false;
  }

  populateA4PrintOverlay(invoiceDetails);

  const printWrapper = document.getElementById("print-invoice-wrapper");
  if (!printWrapper) return false;
  
  printWrapper.style.display = "block";
  printWrapper.style.position = "absolute";
  printWrapper.style.left = "-9999px";
  printWrapper.style.top = "0";

  const opt = {
    margin:       [0, 0, 0, 0],
    filename:     `Invoice_${invoiceDetails.invoiceNo}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const element = printWrapper.querySelector('.invoice-page');
    const blob = await html2pdf().from(element).set(opt).toPdf().output('blob');
    
    printWrapper.style.display = "";
    printWrapper.style.position = "";
    printWrapper.style.left = "";
    
    const formData = new FormData();
    formData.append("chat_id", chat);
    formData.append("document", blob, `Invoice_${invoiceDetails.invoiceNo}.pdf`);
    formData.append("caption", `🔔 Invoice #${invoiceDetails.invoiceNo} generated for ${invoiceDetails.buyer.name}.\nGrand Total: ₹ ${formatCurrency(invoiceDetails.total || 0)}`);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (data.ok) {
      if (!silent) alert(`Invoice PDF #${invoiceDetails.invoiceNo} successfully shared via Telegram!`);
      return true;
    } else {
      if (!silent) alert(`Telegram error: ${data.description}`);
      return false;
    }
  } catch (err) {
    printWrapper.style.display = "";
    printWrapper.style.position = "";
    printWrapper.style.left = "";
    if (!silent) alert(`Failed to compile or upload PDF: ${err.message}`);
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
    autoSuggestInvoiceNo();
    resetBillingForm();
    alert("✅ Invoice database cleared successfully. Next invoice sequence starts at #0001!");
    switchTab("billing");
  }
};
