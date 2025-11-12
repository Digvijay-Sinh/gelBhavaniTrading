const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dataManager = require('./dataManager');

let win;

// Set portable mode for USB drive compatibility
function setupPortableMode() {
    // Ask dataManager to create/return the correct data dir, then set it explicitly
    const dataDir = dataManager.ensureDataDir(); // creates and returns the path
    if (typeof dataManager.setDataDir === 'function') {
        dataManager.setDataDir(dataDir);
    } else {
        dataManager._dataDir = dataDir; // fallback (should not be necessary after patch)
    }
}

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false, // prevent flicker before maximize
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        resizable: false, // prevent resizing
        fullscreenable: false, // prevent full-screen toggle
        maximizable: false, // prevent unmaximizing/maximizing manually
        autoHideMenuBar: true, // hides the menu bar (File/Edit/etc.)
        title: "મા આશાપુરા ટ્રેડિંગ",
    });

    win.loadFile('index.html');

    win.once('ready-to-show', () => {
        win.maximize();
        win.show();
    });

    // Prevent resizing after maximize
    win.setResizable(false);

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

// Farmers API
ipcMain.handle('load-farmers', async() => {
    return dataManager.loadFarmers();
});

ipcMain.handle('save-farmers', async(event, farmers) => {
    return dataManager.saveFarmers(farmers);
});

ipcMain.handle('add-farmer', async(event, farmer) => {
    return dataManager.addFarmer(farmer);
});

ipcMain.handle('update-farmer', async(event, farmer) => {
    return dataManager.updateFarmer(farmer);
});

ipcMain.handle('delete-farmer', async(event, id) => {
    return dataManager.deleteFarmer(id);
});

// SellTogether API
ipcMain.handle('load-selltogether', async() => {
    return dataManager.loadSellTogether();
});

ipcMain.handle('save-selltogether', async(event, entries) => {
    return dataManager.saveSellTogether(entries);
});

ipcMain.handle('add-selltogether', async(event, entry) => {
    // Save entry, then mark involved farmers as hidden (sold together)
    const created = dataManager.addSellTogether(entry);
    try {
        if (created && Array.isArray(created.farmerIds) && created.farmerIds.length > 0) {
            const farmers = dataManager.loadFarmers();
            const idSet = new Set(created.farmerIds.map(String));
            const updated = farmers.map(f => {
                if (idSet.has(String(f.id))) {
                    return {...f, hiddenInSellTogether: true };
                }
                return f;
            });
            dataManager.saveFarmers(updated);
        }
    } catch (err) {
        console.error('Failed to mark farmers as hidden after adding sellTogether', err);
    }
    return created;
});

ipcMain.handle('update-selltogether', async(event, entry) => {
    return dataManager.updateSellTogether(entry);
});

ipcMain.handle('delete-selltogether', async(event, id) => {
    try {
        // find entry to know which farmers were part of it
        const entries = dataManager.loadSellTogether();
        const idStr = String(id);
        const entry = entries.find(e => String(e.id) === idStr);
        // delete the entry
        const ok = dataManager.deleteSellTogether(id);
        // recompute hidden flags: any farmer present in remaining entries should remain hidden
        const remaining = dataManager.loadSellTogether();
        const remainingFarmerIds = new Set();
        remaining.forEach(e => {
            if (Array.isArray(e.farmerIds)) e.farmerIds.forEach(fid => remainingFarmerIds.add(String(fid)));
        });
        const farmers = dataManager.loadFarmers();
        const updated = farmers.map(f => ({...f, hiddenInSellTogether: remainingFarmerIds.has(String(f.id)) }));
        dataManager.saveFarmers(updated);
        return ok;
    } catch (err) {
        console.error('Failed to delete sellTogether and update farmer flags', err);
        return false;
    }
});

app.whenReady().then(() => {
    setupPortableMode();
    // dataManager.ensureDataDir();
    createWindow();
});