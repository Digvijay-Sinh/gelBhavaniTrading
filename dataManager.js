const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Determine data directory - use app directory for portable mode
let dataDir = null;

// Resolve default portable data dir when dataDir not explicitly set
function resolvePortableDataDir() {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
    if (portableDir && typeof portableDir === 'string' && portableDir.trim().length) {
        return path.join(portableDir, 'data');
    }
    return path.join(path.dirname(process.execPath), 'data');
}

// Setter so main.js can pass the resolved data directory
function setDataDir(dir) {
    dataDir = dir;
}

// getDataDir returns explicitly-set dir or the resolved default
function getDataDir() {
    if (dataDir && typeof dataDir === 'string') return dataDir;
    dataDir = resolvePortableDataDir();
    return dataDir;
}

// ensureDataDir uses getDataDir() (so it respects setDataDir)
function ensureDataDir() {
    const dir = getDataDir();
    try {
        fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
        console.error('Failed to create data directory:', dir, err);
        throw err;
    }
    return dir;
}

// keep your getTransactionsFilePath / loadTransactions etc. but update any direct calls
function getTransactionsFilePath() {
    return path.join(getDataDir(), 'transactions.json');
}

// Load transactions (bills and spendings combined)
function loadTransactions() {
    try {
        const filePath = getTransactionsFilePath();
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading transactions:', error);
        return [];
    }
}

function saveTransactions(transactions) {
    try {
        const filePath = getTransactionsFilePath();
        fs.writeFileSync(filePath, JSON.stringify(transactions, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving transactions:', error);
        return false;
    }
}

// Add a new bill (returns the created bill)
function addBill(bill) {
    const transactions = loadTransactions();
    // ensure bill has id and spendings array
    if (!bill.id) bill.id = Date.now();
    if (!Array.isArray(bill.spendings)) bill.spendings = [];
    transactions.push(bill);
    saveTransactions(transactions);
    return bill;
}

// Update an existing bill by id
function updateBill(updatedBill) {
    const transactions = loadTransactions();
    const idx = transactions.findIndex(t => t.id === updatedBill.id && t.type === 'bill');
    if (idx === -1) return false;
    // Preserve existing spendings if not provided
    if (!Array.isArray(updatedBill.spendings)) {
        updatedBill.spendings = transactions[idx].spendings || [];
    }
    transactions[idx] = updatedBill;
    return saveTransactions(transactions);
}

// Add spending to a bill with given billId
function addSpendingToBill(billId, spending) {
    const transactions = loadTransactions();
    const idx = transactions.findIndex(t => t.id === billId && t.type === 'bill');
    if (idx === -1) return false;
    if (!spending.id) spending.id = Date.now();
    if (!Array.isArray(transactions[idx].spendings)) transactions[idx].spendings = [];
    transactions[idx].spendings.push(spending);
    return saveTransactions(transactions);
}

// Delete a bill or spending
function deleteTransaction(id, type, parentId) {
    const transactions = loadTransactions();
    if (type === 'bill') {
        const filtered = transactions.filter(t => !(t.id === id && t.type === 'bill'));
        return saveTransactions(filtered);
    }
    if (type === 'spending') {
        // If parentId provided, remove from that bill
        if (parentId) {
            const billIdx = transactions.findIndex(t => t.id === parentId && t.type === 'bill');
            if (billIdx === -1) return false;
            transactions[billIdx].spendings = (transactions[billIdx].spendings || []).filter(s => s.id !== id);
            return saveTransactions(transactions);
        }
        // Otherwise search all bills and remove spending with id
        for (let i = 0; i < transactions.length; i++) {
            if (transactions[i].type === 'bill' && Array.isArray(transactions[i].spendings)) {
                const before = transactions[i].spendings.length;
                transactions[i].spendings = transactions[i].spendings.filter(s => s.id !== id);
                if (transactions[i].spendings.length !== before) {
                    return saveTransactions(transactions);
                }
            }
        }
        return false;
    }
    return false;
}

function clearAllData() {
    try {
        const filePath = getTransactionsFilePath();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return true;
    } catch (error) {
        console.error('Error clearing transactions:', error);
        return false;
    }
}

// One-time migration from old bills.json and spendings.json
function migrateOldFiles() {
    const dataDir = getDataDir();
    const billsPath = path.join(dataDir, 'bills.json');
    const spendingsPath = path.join(dataDir, 'spendings.json');
    const transactionsPath = getTransactionsFilePath();

    // If transactions.json already exists, skip migration
    if (fs.existsSync(transactionsPath)) return;

    const transactions = [];

    if (fs.existsSync(billsPath)) {
        try {
            const billsRaw = fs.readFileSync(billsPath, 'utf8');
            const bills = JSON.parse(billsRaw || '[]');
            // transform each bill to include empty spendings array if needed
            bills.forEach(b => {
                if (!Array.isArray(b.spendings)) b.spendings = [];
                transactions.push(b);
            });
        } catch (err) {
            console.error('Failed to migrate bills.json', err);
        }
    }

    if (fs.existsSync(spendingsPath)) {
        try {
            const spendingsRaw = fs.readFileSync(spendingsPath, 'utf8');
            const spendings = JSON.parse(spendingsRaw || '[]');
            // Since there is no reliable parent link, add as standalone spending entries
            spendings.forEach(s => transactions.push(s));
        } catch (err) {
            console.error('Failed to migrate spendings.json', err);
        }
    }

    // Save combined transactions if we have any
    if (transactions.length > 0) {
        try {
            fs.writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2), 'utf8');
            // remove old files
            try { if (fs.existsSync(billsPath)) fs.unlinkSync(billsPath); } catch (e) {}
            try { if (fs.existsSync(spendingsPath)) fs.unlinkSync(spendingsPath); } catch (e) {}
        } catch (err) {
            console.error('Failed to write transactions.json during migration', err);
        }
    }
}

module.exports = {
    getDataDir,
    ensureDataDir,
    getTransactionsFilePath,
    loadTransactions,
    saveTransactions,
    addBill,
    updateBill,
    addSpendingToBill,
    deleteTransaction,
    clearAllData
};