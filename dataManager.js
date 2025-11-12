const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Determine data directory - use app directory for portable mode
function getDataDir() {
    // For portable mode, use the app's executable directory
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
        return path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
    }
    // Fallback for development
    return path.join(app.getPath('userData'), 'data');
}

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    return dataDir;
}

// Get file path for bills data
function getBillsFilePath() {
    return path.join(ensureDataDir(), 'bills.json');
}

// Get file path for spendings data
function getSpendingsFilePath() {
    return path.join(ensureDataDir(), 'spendings.json');
}

// Load bills from JSON file
function loadBills() {
    try {
        const filePath = getBillsFilePath();
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading bills:', error);
        return [];
    }
}

// Load spendings from JSON file
function loadSpendings() {
    try {
        const filePath = getSpendingsFilePath();
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error loading spendings:', error);
        return [];
    }
}

// Save bills to JSON file
function saveBills(billsData) {
    try {
        const filePath = getBillsFilePath();
        fs.writeFileSync(filePath, JSON.stringify(billsData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving bills:', error);
        return false;
    }
}

// Save spendings to JSON file
function saveSpendings(spendingsData) {
    try {
        const filePath = getSpendingsFilePath();
        fs.writeFileSync(filePath, JSON.stringify(spendingsData, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving spendings:', error);
        return false;
    }
}

// Clear all data
function clearAllData() {
    try {
        const billsPath = getBillsFilePath();
        const spendingsPath = getSpendingsFilePath();

        if (fs.existsSync(billsPath)) {
            fs.unlinkSync(billsPath);
        }
        if (fs.existsSync(spendingsPath)) {
            fs.unlinkSync(spendingsPath);
        }
        return true;
    } catch (error) {
        console.error('Error clearing data:', error);
        return false;
    }
}

module.exports = {
    getDataDir,
    ensureDataDir,
    getBillsFilePath,
    getSpendingsFilePath,
    loadBills,
    loadSpendings,
    saveBills,
    saveSpendings,
    clearAllData
};