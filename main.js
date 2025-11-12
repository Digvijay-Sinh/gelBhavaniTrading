const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dataManager = require('./dataManager');

let win;

// Set portable mode for USB drive compatibility
function setupPortableMode() {
    // Get the executable's directory (where the app is running from)
    const exePath = app.getAppPath();
    const dataDir = path.join(exePath, 'data');
    process.env.PORTABLE_EXECUTABLE_DIR = exePath;
}

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },

    });

    win.loadFile('index.html');

    ipcMain.on('navigate', (event, page) => {
        win.loadFile(page);
    });
}

// IPC Handlers for Data Management
ipcMain.handle('load-bills', async () => {
    return dataManager.loadBills();
});

ipcMain.handle('load-spendings', async () => {
    return dataManager.loadSpendings();
});

ipcMain.handle('save-bills', async (event, billsData) => {
    return dataManager.saveBills(billsData);
});

ipcMain.handle('save-spendings', async (event, spendingsData) => {
    return dataManager.saveSpendings(spendingsData);
});

ipcMain.handle('clear-all-data', async () => {
    return dataManager.clearAllData();
});

ipcMain.handle('get-data-dir', async () => {
    return dataManager.getDataDir();
});

app.whenReady().then(() => {
    setupPortableMode();
    dataManager.ensureDataDir();
    createWindow();
});