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
ipcMain.handle('load-bills', async() => {
    // backward compatibility: return only bill-type transactions
    const all = dataManager.loadTransactions();
    return all.filter(t => t.type === 'bill');
});

ipcMain.handle('load-spendings', async() => {
    // backward compatibility: return only spending-type transactions (those not nested)
    const all = dataManager.loadTransactions();
    return all.filter(t => t.type === 'spending');
});

ipcMain.handle('save-bills', async(event, billsData) => {
    // backward compatibility: replace bill-type transactions and keep others
    const all = dataManager.loadTransactions().filter(t => t.type !== 'bill');
    // ensure bills have spendings array
    const bills = (billsData || []).map(b => ({...b, spendings: b.spendings || [] }));
    const merged = [...all, ...bills];
    return dataManager.saveTransactions(merged);
});

ipcMain.handle('save-spendings', async(event, spendingsData) => {
    // backward compatibility: append stand-alone spendings
    const all = dataManager.loadTransactions().filter(t => t.type !== 'spending');
    const spendings = (spendingsData || []).map(s => ({...s }));
    const merged = [...all, ...spendings];
    return dataManager.saveTransactions(merged);
});

ipcMain.handle('clear-all-data', async() => {
    return dataManager.clearAllData();
});

ipcMain.handle('get-data-dir', async() => {
    return dataManager.getDataDir();
});

// New unified transactions endpoints
ipcMain.handle('load-transactions', async() => {
    return dataManager.loadTransactions();
});

ipcMain.handle('save-transactions', async(event, transactions) => {
    return dataManager.saveTransactions(transactions);
});

ipcMain.handle('add-bill', async(event, bill) => {
    return dataManager.addBill(bill);
});

ipcMain.handle('update-bill', async(event, bill) => {
    return dataManager.updateBill(bill);
});

ipcMain.handle('add-spending-to-bill', async(event, billId, spending) => {
    return dataManager.addSpendingToBill(billId, spending);
});

ipcMain.handle('delete-transaction', async(event, id, type, parentId) => {
    return dataManager.deleteTransaction(id, type, parentId);
});

app.whenReady().then(() => {
    setupPortableMode();
    dataManager.ensureDataDir();
    createWindow();
});