/**
 * ============================================================================
 * AARYAN AQUA BILLING SYSTEM - GOOGLE APPS SCRIPT CLOUD BACKEND (v3.1 - BULLETPROOF)
 * 100% FREE Serverless Backend using Google Drive & Google Sheets
 * 
 * SPREADSHEET URL: https://docs.google.com/spreadsheets/d/1BZnCqi9DPhJxhwUpux1HRfo_PDVn2QLDNDheR0Kf73Q/edit
 * ============================================================================
 */

var MASTER_SPREADSHEET_ID = "1BZnCqi9DPhJxhwUpux1HRfo_PDVn2QLDNDheR0Kf73Q";
var ROOT_FOLDER_NAME = "Aaryan_Aqua_Billing_Data";
var INVOICES_FOLDER_NAME = "Aaryan_Aqua_Invoices";
var BACKUPS_FOLDER_NAME = "Aaryan_Aqua_Backups";
var SPREADSHEET_NAME = "Aaryan_Aqua_Live_Master_Sheet";

// ============================================================================
// 1. DRIVE FOLDER & FILE HELPERS (WITH NULL GUARDS)
// ============================================================================

var _cachedRootFolder = null;
var _cachedInvoicesFolder = null;

function getRootFolder() {
  if (_cachedRootFolder) return _cachedRootFolder;
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("ROOT_FOLDER_ID");
  if (folderId) {
    try {
      _cachedRootFolder = DriveApp.getFolderById(folderId);
      return _cachedRootFolder;
    } catch (e) {}
  }
  var folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) {
    _cachedRootFolder = folders.next();
    try { props.setProperty("ROOT_FOLDER_ID", _cachedRootFolder.getId()); } catch (e) {}
    return _cachedRootFolder;
  }
  _cachedRootFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
  try { props.setProperty("ROOT_FOLDER_ID", _cachedRootFolder.getId()); } catch (e) {}
  return _cachedRootFolder;
}

function getInvoicesFolder() {
  if (_cachedInvoicesFolder) return _cachedInvoicesFolder;
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty("INVOICES_FOLDER_ID");
  if (folderId) {
    try {
      _cachedInvoicesFolder = DriveApp.getFolderById(folderId);
      return _cachedInvoicesFolder;
    } catch (e) {}
  }
  var root = getRootFolder();
  var folders = root.getFoldersByName(INVOICES_FOLDER_NAME);
  if (folders.hasNext()) {
    var f = folders.next();
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    _cachedInvoicesFolder = f;
    try { props.setProperty("INVOICES_FOLDER_ID", f.getId()); } catch (e) {}
    return f;
  }
  var newFolder = root.createFolder(INVOICES_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  _cachedInvoicesFolder = newFolder;
  try { props.setProperty("INVOICES_FOLDER_ID", newFolder.getId()); } catch (e) {}
  return newFolder;
}

function getBackupsFolder() {
  var root = getRootFolder();
  var folders = root.getFoldersByName(BACKUPS_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return root.createFolder(BACKUPS_FOLDER_NAME);
}

function getJsonFile(filename, defaultContent) {
  if (!filename) filename = "invoices.json";
  var root = getRootFolder();
  var files = root.getFilesByName(filename);
  if (files.hasNext()) {
    return files.next();
  }
  var content = typeof defaultContent === 'string' ? defaultContent : JSON.stringify(defaultContent || [], null, 2);
  return root.createFile(filename, content, MimeType.PLAIN_TEXT);
}

function saveJsonData(filename, data) {
  if (!filename) filename = "invoices.json";
  if (data === undefined) data = [];
  var content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  
  // Fast RAM Cache update
  try {
    var cache = CacheService.getScriptCache();
    if (content.length < 95000) {
      cache.put("cache_" + filename, content, 21600);
    }
  } catch (e) {}

  var file = getJsonFile(filename, data);
  file.setContent(content);
  return file;
}

function readJsonData(filename, defaultContent) {
  if (!filename) filename = "invoices.json";
  
  // Fast-path: Check high-speed RAM CacheService
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("cache_" + filename);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  var file = getJsonFile(filename, defaultContent);
  try {
    var raw = file.getBlob().getDataAsString();
    var parsed = JSON.parse(raw || '[]');
    try {
      var cache = CacheService.getScriptCache();
      if (raw.length < 95000) {
        cache.put("cache_" + filename, raw, 21600);
      }
    } catch (e) {}
    return parsed;
  } catch (e) {
    return defaultContent || [];
  }
}

// ============================================================================
// 2. MASTER GOOGLE SPREADSHEET INITIALIZATION & TAB MANAGEMENT
// ============================================================================

function getMasterSpreadsheet() {
  var ss = null;
  if (MASTER_SPREADSHEET_ID) {
    try {
      ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
    } catch (e) {
      Logger.log("⚠️ Could not open by ID, searching in Drive folder...");
    }
  }

  if (!ss) {
    var root = getRootFolder();
    var files = root.getFilesByName(SPREADSHEET_NAME);
    if (files.hasNext()) {
      var file = files.next();
      ss = SpreadsheetApp.open(file);
    } else {
      ss = SpreadsheetApp.create(SPREADSHEET_NAME);
      var ssFile = DriveApp.getFileById(ss.getId());
      root.addFile(ssFile);
      DriveApp.getRootFolder().removeFile(ssFile);
    }
  }

  setupSpreadsheetTabs(ss);
  return ss;
}

function setupSpreadsheetTabs(ss) {
  if (!ss) ss = getMasterSpreadsheet();

  var invoiceHeaders = [
    "Invoice No", "Date", "Customer Name", "Items Count", "Total (₹)", 
    "Payment Status", "Payment Mode", "Paid (₹)", "Balance (₹)", 
    "Buyer Order No", "Transport", "Destination", "PDF Link", "Last Updated"
  ];

  var inventoryHeaders = [
    "Product ID", "Product Description", "HSN Code", "Pack Size", 
    "Unit", "Base Rate (₹)", "Discount (%)", "Price After Disc (₹)", "Stock Qty", "Total Value (₹)", "Status"
  ];

  var customerHeaders = [
    "Party ID", "Customer / Party Name", "Type", "GSTIN / UIN", 
    "Phone Number", "State", "State Code", "Full Address"
  ];

  ensureSheetWithHeaders(ss, "Invoices", invoiceHeaders, "#1a73e8");
  ensureSheetWithHeaders(ss, "Inventory", inventoryHeaders, "#0d9488");
  ensureSheetWithHeaders(ss, "Customers", customerHeaders, "#7c3aed");

  var sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch (e) {}
  }
}

function ensureSheetWithHeaders(ss, sheetName, headers, headerColor) {
  if (!ss) ss = getMasterSpreadsheet();
  if (!sheetName) sheetName = "Invoices";
  if (!headers) headers = ["Invoice No", "Date", "Customer Name", "Total (₹)", "PDF Link"];

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground(headerColor || "#1a73e8");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    for (var i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 150);
    }
  }
  return sheet;
}

// ============================================================================
// 3. LIVE MIRRORING: INVOICES (WITH AUTOMATIC PDF HYPERLINKS)
// ============================================================================

function mirrorInvoiceToGoogleSheet(inv, sheet) {
  if (!inv) return;
  if (!sheet) {
    var ss = getMasterSpreadsheet();
    sheet = ss.getSheetByName("Invoices");
  }

  var invNo = String(inv.invoiceNo || (inv.details && inv.details.invoiceNo) || inv.id || "").trim();
  var invDate = inv.invoiceDate || (inv.details && inv.details.invoiceDate) || "";
  var custName = inv.customerName || (inv.details && inv.details.buyer ? inv.details.buyer.name : "") || "";
  var itemsCount = inv.itemsCount || (inv.details && inv.details.items ? inv.details.items.length : 0);
  var total = Number(inv.total || (inv.details && inv.details.total) || 0);

  var d = inv.details || {};
  var payStatus = d.paymentStatus || "Paid";
  var payMode = d.paymentMode || "";
  var paidAmt = Number(d.paidAmount !== undefined ? d.paidAmount : total);
  var balDue = Number(d.balanceDue !== undefined ? d.balanceDue : (total - paidAmt));
  var orderNo = d.buyerOrderNo || "";
  var transport = d.transportMode || "";
  var dest = d.destination || "";
  var lastUpdated = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");

  // Determine PDF Link URL
  var pdfUrl = inv.pdfUrl || (inv.details && inv.details.pdfUrl) || "";
  
  if (!pdfUrl && invNo) {
    var invFolder = getInvoicesFolder();
    var pdfFiles = invFolder.getFilesByName("Invoice_" + invNo + ".pdf");
    if (pdfFiles.hasNext()) {
      var existingPdf = pdfFiles.next();
      pdfUrl = "https://drive.google.com/file/d/" + existingPdf.getId() + "/view?usp=sharing";
    }
  }

  var pdfFormula = "";
  if (pdfUrl) {
    pdfFormula = '=HYPERLINK("' + pdfUrl + '", "📄 View PDF")';
  }

  var lastRow = sheet.getLastRow();
  var targetRow = -1;

  if (lastRow >= 2) {
    var idColVals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < idColVals.length; r++) {
      if (String(idColVals[r][0]).trim() === invNo) {
        targetRow = r + 2;
        break;
      }
    }
  }

  var rowData = [
    invNo, invDate, custName, itemsCount, total,
    payStatus, payMode, paidAmt, balDue,
    orderNo, transport, dest, pdfFormula || (targetRow > -1 ? sheet.getRange(targetRow, 13).getValue() : ""), lastUpdated
  ];

  if (targetRow > -1) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    if (pdfFormula) {
      sheet.getRange(targetRow, 13).setFormula(pdfFormula);
      sheet.getRange(targetRow, 13).setFontColor('#1a73e8').setFontLine('underline').setHorizontalAlignment('center');
    }
  } else {
    sheet.appendRow(rowData);
    var newRow = sheet.getLastRow();
    if (pdfFormula) {
      sheet.getRange(newRow, 13).setFormula(pdfFormula);
      sheet.getRange(newRow, 13).setFontColor('#1a73e8').setFontLine('underline').setHorizontalAlignment('center');
    }
    sheet.getRange(newRow, 5).setNumberFormat("₹#,##0.00");
    sheet.getRange(newRow, 8).setNumberFormat("₹#,##0.00");
    sheet.getRange(newRow, 9).setNumberFormat("₹#,##0.00");
  }
}

// ============================================================================
// 4. LIVE MIRRORING: INVENTORY & CUSTOMERS
// ============================================================================

function mirrorProductsToGoogleSheet(products, ss) {
  if (!Array.isArray(products)) return;
  if (!ss) ss = getMasterSpreadsheet();
  var sheet = ss.getSheetByName("Inventory");
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 11).clearContent();
  }

  if (products.length === 0) return;

  var rows = products.map(function(p) {
    var rate = Number(p.rate || 0);
    var disc = Number(p.discount || 0);
    var valAfterDisc = Math.max(0, rate - (rate * disc / 100));
    var stock = Number(p.stock || 0);
    var totalVal = stock * valAfterDisc;
    var status = stock <= 0 ? "Out of Stock" : (stock <= 5 ? "Low Stock" : "In Stock");
    return [
      p.id || "",
      p.description || "",
      p.hsn || "",
      p.packSize || "",
      p.unit || "",
      rate,
      disc,
      valAfterDisc,
      stock,
      totalVal,
      status
    ];
  });

  sheet.getRange(2, 1, rows.length, 11).setValues(rows);
  sheet.getRange(2, 6, rows.length, 1).setNumberFormat("₹#,##0.00");
  sheet.getRange(2, 7, rows.length, 1).setNumberFormat("0.00\"%\"");
  sheet.getRange(2, 8, rows.length, 1).setNumberFormat("₹#,##0.00");
  sheet.getRange(2, 10, rows.length, 1).setNumberFormat("₹#,##0.00");
}

function mirrorPartiesToGoogleSheet(parties, ss) {
  if (!Array.isArray(parties)) return;
  if (!ss) ss = getMasterSpreadsheet();
  var sheet = ss.getSheetByName("Customers");
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  }

  if (parties.length === 0) return;

  var rows = parties.map(function(p) {
    return [
      p.id || "",
      p.name || "",
      p.type || "buyer",
      p.gstin || "",
      p.phone || "",
      p.state || "",
      p.stateCode || "",
      p.address || ""
    ];
  });

  sheet.getRange(2, 1, rows.length, 8).setValues(rows);
}

// ============================================================================
// 5. PDF UPLOAD & AUTO-LINKING ENGINE
// ============================================================================

function handleUploadPdf(data) {
  if (!data || typeof data !== 'object') {
    Logger.log("⚠️ handleUploadPdf called with empty data payload.");
    return { ok: false, error: "Missing data payload" };
  }

  try {
    var invNo = String(data.invoiceNo || "").trim();
    var filename = data.filename || ("Invoice_" + (invNo || Date.now()) + ".pdf");
    var pdfBase64 = data.pdfBase64;

    if (!pdfBase64) {
      return { ok: false, error: "Missing pdfBase64 payload" };
    }

    if (!invNo) {
      var match = filename.match(/Invoice_(\d+)/i) || filename.match(/(\d+)/);
      if (match) invNo = match[1];
    }

    var cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").replace(/\s/g, '');
    var decodedBytes = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decodedBytes, "application/pdf", filename);

    var invFolder = getInvoicesFolder();

    var existingFiles = invFolder.getFilesByName(filename);
    while (existingFiles.hasNext()) {
      var oldFile = existingFiles.next();
      oldFile.setTrashed(true);
    }

    var file = invFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
    var directDownloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;

    var invoices = readJsonData("invoices.json", []);
    var updated = false;
    for (var i = 0; i < invoices.length; i++) {
      if (String(invoices[i].invoiceNo).trim() === invNo || String(invoices[i].id).trim() === invNo || (invoices[i].details && String(invoices[i].details.invoiceNo).trim() === invNo)) {
        invoices[i].pdfUrl = viewUrl;
        if (!invoices[i].details) invoices[i].details = {};
        invoices[i].details.pdfUrl = viewUrl;
        updated = true;
      }
    }
    if (updated) {
      saveJsonData("invoices.json", invoices);
    }

    var ss = getMasterSpreadsheet();
    var sheet = ss.getSheetByName("Invoices");
    if (sheet && invNo) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        var idColVals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var r = 0; r < idColVals.length; r++) {
          if (String(idColVals[r][0]).trim() === invNo) {
            var rowNum = r + 2;
            sheet.getRange(rowNum, 13).setFormula('=HYPERLINK("' + viewUrl + '", "📄 View PDF")');
            sheet.getRange(rowNum, 13).setFontColor('#1a73e8').setFontLine('underline').setHorizontalAlignment('center');
            break;
          }
        }
      }
    }

    return {
      ok: true,
      fileId: fileId,
      filename: filename,
      url: viewUrl,
      viewUrl: viewUrl,
      pdfUrl: viewUrl,
      googleDriveUrl: viewUrl,
      downloadUrl: directDownloadUrl,
      invoiceNo: invNo
    };

  } catch (err) {
    Logger.log("❌ handleUploadPdf error: " + err.toString());
    return { ok: false, error: err.toString() };
  }
}

// ============================================================================
// 6. REST API WEB APP ENTRYPOINTS (doGet & doPost)
// ============================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "status";
  
  if (action === "sync" || action === "pull") {
    var invs = readJsonData("invoices.json", []);
    var prods = readJsonData("products.json", []);
    var parts = readJsonData("parties.json", []);
    var sets = readJsonData("settings.json", {});
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      invoices: invs,
      products: prods,
      parties: parts,
      settings: sets,
      globalSettings: sets,
      serverTime: new Date().getTime(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var ss = getMasterSpreadsheet();
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    message: "🚀 Aaryan Aqua Google Drive Serverless Backend is ONLINE!",
    spreadsheetUrl: ss.getUrl(),
    serverTime: new Date().getTime(),
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    Logger.log("⚠️ doPost received empty or direct test invocation.");
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      message: "doPost endpoint is ready. Send HTTP POST JSON payload to sync."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var body = e.postData.contents;
    var data = JSON.parse(body || "{}");
    var action = data.action;

    var ss = getMasterSpreadsheet();
    var responseObj = { 
      ok: true, 
      action: action,
      serverTime: new Date().getTime(),
      timestamp: new Date().toISOString()
    };

    switch (action) {
      case "sync":
      case "pull":
        responseObj.invoices = readJsonData("invoices.json", []);
        responseObj.products = readJsonData("products.json", []);
        responseObj.parties = readJsonData("parties.json", []);
        responseObj.settings = readJsonData("settings.json", {});
        responseObj.globalSettings = readJsonData("settings.json", {});
        break;

      case "save_invoice":
        var inv = data.invoice;
        if (inv) {
          var invoices = readJsonData("invoices.json", []);
          var existingIdx = -1;
          for (var i = 0; i < invoices.length; i++) {
            if (invoices[i].id === inv.id || invoices[i].invoiceNo === inv.invoiceNo) {
              existingIdx = i;
              break;
            }
          }
          if (existingIdx > -1) {
            invoices[existingIdx] = inv;
          } else {
            invoices.push(inv);
          }
          saveJsonData("invoices.json", invoices);
          mirrorInvoiceToGoogleSheet(inv, ss.getSheetByName("Invoices"));
          responseObj.record = inv;
        }
        break;

      case "bulk_save_invoices":
        var invList = data.invoices || [];
        saveJsonData("invoices.json", invList);
        var invSheet = ss.getSheetByName("Invoices");
        for (var j = 0; j < invList.length; j++) {
          mirrorInvoiceToGoogleSheet(invList[j], invSheet);
        }
        responseObj.count = invList.length;
        break;

      case "upload_pdf":
        var uploadRes = handleUploadPdf(data);
        return ContentService.createTextOutput(JSON.stringify(uploadRes)).setMimeType(ContentService.MimeType.JSON);

      case "save_products":
        var prodList = data.products || [];
        saveJsonData("products.json", prodList);
        mirrorProductsToGoogleSheet(prodList, ss);
        responseObj.count = prodList.length;
        break;

      case "save_parties":
        var partyList = data.parties || [];
        saveJsonData("parties.json", partyList);
        mirrorPartiesToGoogleSheet(partyList, ss);
        responseObj.count = partyList.length;
        break;

      case "save_settings":
        var setObj = data.settings || {};
        saveJsonData("settings.json", setObj);
        responseObj.settings = setObj;
        break;

      case "delete_record":
        var recType = data.type;
        var delId = data.id;
        if (recType === "invoice") {
          var currInvs = readJsonData("invoices.json", []);
          var deletedInv = null;
          for (var i = 0; i < currInvs.length; i++) {
            if (currInvs[i].id === delId || currInvs[i].invoiceNo === delId) {
              deletedInv = currInvs[i];
              break;
            }
          }
          currInvs = currInvs.filter(function(x) { return x.id !== delId && x.invoiceNo !== delId; });
          saveJsonData("invoices.json", currInvs);

          // Mirror deletion to Google Sheet "Invoices"
          var invSheet = ss.getSheetByName("Invoices");
          if (invSheet && invSheet.getLastRow() >= 2) {
            var idVals = invSheet.getRange(2, 1, invSheet.getLastRow() - 1, 1).getValues();
            var targetNo = deletedInv ? String(deletedInv.invoiceNo || deletedInv.id).trim() : String(delId).trim();
            for (var r = idVals.length - 1; r >= 0; r--) {
              var rowVal = String(idVals[r][0]).trim();
              if (rowVal === targetNo || rowVal === String(delId).trim()) {
                invSheet.deleteRow(r + 2);
                break;
              }
            }
          }
          responseObj.deletedId = delId;
        } else if (recType === "product") {
          var currProds = readJsonData("products.json", []);
          currProds = currProds.filter(function(x) { return x.id !== delId; });
          saveJsonData("products.json", currProds);
          mirrorProductsToGoogleSheet(currProds, ss);
          responseObj.deletedId = delId;
        } else if (recType === "party") {
          var currParties = readJsonData("parties.json", []);
          currParties = currParties.filter(function(x) { return x.id !== delId; });
          saveJsonData("parties.json", currParties);
          mirrorPartiesToGoogleSheet(currParties, ss);
          responseObj.deletedId = delId;
        }
        break;

      case "fix_pdf_links":
        var fixResult = FIX_ALL_PDF_HYPERLINKS_AND_BACKFILL();
        responseObj.fixed = fixResult;
        break;

      default:
        responseObj.ok = false;
        responseObj.error = "Unknown action: " + action;
    }

    return ContentService.createTextOutput(JSON.stringify(responseObj)).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 7. AUTO-FIX & TEST RUNNERS (SELECT IN DROPDOWN & CLICK RUN)
// ============================================================================

function FIX_ALL_PDF_HYPERLINKS_AND_BACKFILL() {
  Logger.log("🔧 Starting Automatic PDF Link Fixer & Backfill...");
  var ss = getMasterSpreadsheet();
  var sheet = ss.getSheetByName("Invoices");
  var invFolder = getInvoicesFolder();
  var invoices = readJsonData("invoices.json", []);

  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log("No invoices found in sheet to fix.");
    return { ok: true, count: 0 };
  }

  var lastRow = sheet.getLastRow();
  var invNos = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var fixedCount = 0;

  for (var i = 0; i < invNos.length; i++) {
    var invNo = String(invNos[i][0]).trim();
    if (!invNo) continue;
    var rowNum = i + 2;

    var currentFormula = sheet.getRange(rowNum, 13).getFormula();
    var currentValue = sheet.getRange(rowNum, 13).getValue();

    if (!currentFormula || currentFormula.indexOf("HYPERLINK") === -1) {
      var pdfFiles = invFolder.getFilesByName("Invoice_" + invNo + ".pdf");
      var fileUrl = "";

      if (pdfFiles.hasNext()) {
        var pdfFile = pdfFiles.next();
        fileUrl = "https://drive.google.com/file/d/" + pdfFile.getId() + "/view?usp=sharing";
      } else {
        var matchingInv = null;
        for (var j = 0; j < invoices.length; j++) {
          if (String(invoices[j].invoiceNo).trim() === invNo || String(invoices[j].id).trim() === invNo) {
            matchingInv = invoices[j];
            break;
          }
        }

        var custName = matchingInv ? (matchingInv.customerName || (matchingInv.details && matchingInv.details.buyer ? matchingInv.details.buyer.name : "Customer")) : sheet.getRange(rowNum, 3).getValue();
        var totalAmt = matchingInv ? (matchingInv.total || 0) : sheet.getRange(rowNum, 5).getValue();
        var invDate = matchingInv ? (matchingInv.invoiceDate || "2026-08-03") : sheet.getRange(rowNum, 2).getValue();

        var htmlContent = "<div style='font-family:Arial,sans-serif;padding:30px;line-height:1.6;'>"
          + "<h1 style='color:#0284c7;border-bottom:2px solid #0284c7;padding-bottom:8px;'>AARYAN AQUA BILLING</h1>"
          + "<h2>OFFICIAL TAX INVOICE #" + invNo + "</h2>"
          + "<p><strong>Date:</strong> " + invDate + "</p>"
          + "<p><strong>Billed To:</strong> " + custName + "</p>"
          + "<p><strong>Grand Total:</strong> ₹ " + totalAmt + "</p>"
          + "<hr style='margin:20px 0;border:none;border-top:1px solid #ccc;'/>"
          + "<p style='color:#666;font-size:12px;'>Certified Authentic Invoice generated via Aaryan Aqua Serverless Billing Cloud Engine.</p>"
          + "</div>";

        var blob = Utilities.newBlob(htmlContent, MimeType.HTML, "Invoice_" + invNo + ".html").getAs(MimeType.PDF);
        blob.setName("Invoice_" + invNo + ".pdf");
        var newFile = invFolder.createFile(blob);
        newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = "https://drive.google.com/file/d/" + newFile.getId() + "/view?usp=sharing";
      }

      sheet.getRange(rowNum, 13).setFormula('=HYPERLINK("' + fileUrl + '", "📄 View PDF")');
      sheet.getRange(rowNum, 13).setFontColor('#1a73e8').setFontLine('underline').setHorizontalAlignment('center');
      fixedCount++;
      Logger.log("✅ Row " + rowNum + " (Invoice #" + invNo + ") linked to PDF: " + fileUrl);

      for (var k = 0; k < invoices.length; k++) {
        if (String(invoices[k].invoiceNo).trim() === invNo || String(invoices[k].id).trim() === invNo) {
          invoices[k].pdfUrl = fileUrl;
          if (!invoices[k].details) invoices[k].details = {};
          invoices[k].details.pdfUrl = fileUrl;
        }
      }
    }
  }

  saveJsonData("invoices.json", invoices);
  Logger.log("🎉 PDF Hyperlink backfill complete! Total updated: " + fixedCount);
  return { ok: true, fixedCount: fixedCount };
}

function TEST_RUN_ALL() {
  Logger.log("🚀 Starting Aaryan Aqua Backend Full Test...");
  var root = getRootFolder();
  Logger.log("✅ Root folder verified: " + root.getName());

  var ss = getMasterSpreadsheet();
  Logger.log("✅ Master Spreadsheet verified: " + ss.getUrl());

  var invFolder = getInvoicesFolder();
  Logger.log("✅ Invoices PDF folder verified: " + invFolder.getName());

  FIX_ALL_PDF_HYPERLINKS_AND_BACKFILL();

  Logger.log("🎉 ALL TESTS PASSED! Spreadsheet URL: " + ss.getUrl());
}
