import { app, BrowserWindow } from 'electron';
import path from 'path';
import { ipcHandlers } from './ipc-handlers';
import { setupTray } from './tray';

// Extend app type for isQuiting property
declare global {
  // eslint-disable-next-line no-var
  var __APP_IS_QUITING: boolean;
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!global.__APP_IS_QUITING) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  ipcHandlers.register();
  
  // Setup tray icon
  if (mainWindow) {
    setupTray(mainWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Set quit flag
app.on('before-quit', () => {
  global.__APP_IS_QUITING = true;
});
