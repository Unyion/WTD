const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 575,
    height: 700,
    minWidth: 500,
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
app.whenReady().then(createWindow);

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