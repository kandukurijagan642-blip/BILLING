/**
 * ============================================================================
 * AuthService.gs - Google Apps Script Security & Authentication Module
 * ============================================================================
 */

var DEFAULT_API_KEY = "AARYAN_AQUA_SECURE_KEY_2026";

function getApiSecretKey() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty("API_SECRET_KEY");
  if (!key) {
    key = DEFAULT_API_KEY;
    try {
      props.setProperty("API_SECRET_KEY", key);
    } catch (e) {
      Logger.log("Could not set default API key in ScriptProperties: " + e.message);
    }
  }
  return key;
}

function extractRequestToken(e, data) {
  var token = "";
  
  // 1. Check query parameter ?token=... or ?apiKey=...
  if (e && e.parameter) {
    if (e.parameter.token) token = e.parameter.token;
    else if (e.parameter.apiKey) token = e.parameter.apiKey;
    else if (e.parameter.auth) token = e.parameter.auth;
  }
  
  // 2. Check JSON payload { auth: "...", token: "...", apiKey: "..." }
  if (!token && data && typeof data === 'object') {
    if (data.token) token = data.token;
    else if (data.apiKey) token = data.apiKey;
    else if (data.auth) token = data.auth;
  }
  
  return String(token || "").trim();
}

function authenticateRequest(e, data) {
  var expectedKey = getApiSecretKey();
  var providedToken = extractRequestToken(e, data);

  // If no secret key is set and system is in open setup mode, allow with warning
  if (!expectedKey) {
    return { ok: true, user: "System_Setup_Mode" };
  }

  if (!providedToken) {
    return { 
      ok: false, 
      error: "Authentication required. Please provide a valid API token in 'auth', 'token', or '?token='." 
    };
  }

  if (providedToken !== expectedKey) {
    return { 
      ok: false, 
      error: "Unauthorized: Invalid API authentication token." 
    };
  }

  return { ok: true, user: "Authorized_Admin_User" };
}
