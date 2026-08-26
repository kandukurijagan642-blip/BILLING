const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Start internal Node.js Express server
let server;
try {
  server = require('./server.js');
} catch (err) {
  console.error("Failed to start embedded server:", err);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Aaryan Aqua Needs - GST Billing System',
    icon: path.join(__dirname, 'rallis_logo.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    }
  });

  // Load Express web server
  mainWindow.loadURL('http://localhost:8000');

  // Open external links (like WhatsApp Web) in system default web browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://web.whatsapp.com') || url.startsWith('https://api.whatsapp.com') || url.startsWith('https://wa.me')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
