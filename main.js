const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

// Keep a global reference of the window object
let mainWindow;

function isUpdaterSupported() {
  return app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin');
}

function sendUpdaterEvent(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:event', payload);
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterEvent({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdaterEvent({
      status: 'available',
      version: info?.version || '',
      releaseNotes: info?.releaseNotes || ''
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdaterEvent({
      status: 'not-available',
      version: info?.version || ''
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterEvent({
      status: 'download-progress',
      percent: typeof progress?.percent === 'number' ? progress.percent : 0,
      bytesPerSecond: progress?.bytesPerSecond || 0
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterEvent({
      status: 'downloaded',
      version: info?.version || ''
    });
  });

  autoUpdater.on('error', (error) => {
    sendUpdaterEvent({
      status: 'error',
      message: error?.message || 'Unknown updater error'
    });
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 600,
    height: 750,
    minWidth: 350,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'default',
    show: false, // Don't show until ready
    backgroundColor: '#212121',
    title: 'WTD'
  });

  // Load the app
  mainWindow.loadFile('src/index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();
});

// Quit when all windows are closed
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

// IPC handlers for future weather API integration
ipcMain.handle('get-weather', async () => {
  // TODO: Implement weather API calls
  return { condition: 'sunny', temp: 85 };
});

ipcMain.handle('save-activity', async (event, activity) => {
  // TODO: Implement activity storage
  console.log('Saving activity:', activity);
  return { success: true };
});

ipcMain.handle('get-activities', async () => {
  // TODO: Implement activity retrieval
  return [];
});

ipcMain.handle('suggest-activity', async () => {
  // TODO: Implement activity suggestion logic
  return { name: 'Sample Activity', description: 'This is a test activity' };
});

ipcMain.handle('updater:check-for-updates', async (event, options = {}) => {
  if (!isUpdaterSupported()) {
    return {
      ok: false,
      started: false,
      message: 'Auto-update is currently available only for installed Windows and macOS builds. It is not available on Linux or when running from source.'
    };
  }

  try {
    const manual = options?.manual === true;
    sendUpdaterEvent({ status: 'checking', manual });
    await autoUpdater.checkForUpdates();
    return { ok: true, started: true };
  } catch (error) {
    return {
      ok: false,
      started: false,
      message: error?.message || 'Unable to check for updates.'
    };
  }
});

ipcMain.handle('updater:download-update', async () => {
  if (!isUpdaterSupported()) {
    return {
      ok: false,
      started: false,
      message: 'Auto-update is currently available only for installed Windows and macOS builds. It is not available on Linux or when running from source.'
    };
  }

  try {
    await autoUpdater.downloadUpdate();
    return { ok: true, started: true };
  } catch (error) {
    return {
      ok: false,
      started: false,
      message: error?.message || 'Unable to download update.'
    };
  }
});

ipcMain.handle('updater:quit-and-install', async () => {
  if (!isUpdaterSupported()) {
    return {
      ok: false,
      message: 'Auto-update is currently available only for installed Windows and macOS builds. It is not available on Linux or when running from source.'
    };
  }

  setImmediate(() => autoUpdater.quitAndInstall());
  return { ok: true };
});