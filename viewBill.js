let billsData = [];
let spendingsData = [];
let allTransactions = [];

const { ipcRenderer } = require('electron');

// Load data on page load
document.addEventListener('DOMContentLoaded', async function() {
    await loadDataFromStorage();
    renderTable();
    updateSummary();
    attachEventListeners();
    await initializeDummyData();
});

// Initialize dummy data
async function initializeDummyData() {
    // If there's already data in storage, do not overwrite it
    if (billsData.length > 0 || spendingsData.length > 0) return;

    // Add some dummy data for first-time demo
    billsData = [{
            id: 1001,
            type: 'bill',
            description: 'Web Design Project',
            amount: 500,
            quantity: 2,
            rate: 250,
            tax: 10,
            total: '1100.00',
            date: '11/05/2024'
        },
        {
            id: 1002,
            type: 'bill',
            description: 'Logo Design',
            amount: 300,
            quantity: 1,
            rate: 300,
            tax: 5,
            total: '315.00',
            date: '11/06/2024'
        }
    ];

    spendingsData = [{
        id: 2001,
        type: 'spending',
        description: 'Office Supplies',
        amount: 50,
        quantity: 2,
        rate: 25,
        discount: 5,
        total: '95.00',
        date: '11/05/2024'
    }];

    await saveDataToStorage();
    combineTransactions();
}

// Load data from JSON files via IPC
async function loadDataFromStorage() {
    try {
        billsData = await ipcRenderer.invoke('load-bills');
        spendingsData = await ipcRenderer.invoke('load-spendings');
    } catch (error) {
        console.error('Error loading data:', error);
    }

    combineTransactions();
}

// Save data to JSON files via IPC
async function saveDataToStorage() {
    try {
        await ipcRenderer.invoke('save-bills', billsData);
        await ipcRenderer.invoke('save-spendings', spendingsData);
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Combine bills and spendings
function combineTransactions() {
    allTransactions = [...billsData, ...spendingsData].sort((a, b) => b.id - a.id);
}

// Attach event listeners
function attachEventListeners() {
    const filterEl = document.getElementById('filterType');
    const searchEl = document.getElementById('searchInput');
    if (filterEl) filterEl.addEventListener('change', renderTable);
    if (searchEl) searchEl.addEventListener('input', renderTable);
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) clearBtn.addEventListener('click', handleClearData);
}

// Filter transactions
function getFilteredTransactions() {
    const filterTypeEl = document.getElementById('filterType');
    const searchEl = document.getElementById('searchInput');
    const filterType = filterTypeEl ? filterTypeEl.value : 'all';
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';

    let filtered = allTransactions;

    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }

    if (searchTerm) {
        filtered = filtered.filter(t =>
            t.description.toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
}

// Render table
function renderTable() {
    const filteredData = getFilteredTransactions();
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');

    if (!tableBody) return;

    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="9">No transactions found. <a href="./addBill.html">Add one now</a></td></tr>';
        if (recordCount) recordCount.textContent = '0 records';
        return;
    }

    tableBody.innerHTML = filteredData.map(transaction => {
        const taxOrDiscount = transaction.type === 'bill' ?
            `${transaction.tax}% Tax` :
            `${transaction.discount}% Disc`;

        return `
            <tr>
                <td>
                    <span class="type-badge ${transaction.type}">
                        ${transaction.type}
                    </span>
                </td>
                <td>${transaction.description}</td>
                <td>$${parseFloat(transaction.amount).toFixed(2)}</td>
                <td>${transaction.quantity}</td>
                <td>$${parseFloat(transaction.rate).toFixed(2)}</td>
                <td>${taxOrDiscount}</td>
                <td><strong>$${parseFloat(transaction.total).toFixed(2)}</strong></td>
                <td>${transaction.date}</td>
                <td>
                    <button class="btn-delete" onclick="deleteTransaction(${transaction.id}, '${transaction.type}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    if (recordCount) recordCount.textContent = `${filteredData.length} record${filteredData.length !== 1 ? 's' : ''}`;
}

// Delete transaction
async function deleteTransaction(id, type) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    if (type === 'bill') {
        billsData = billsData.filter(b => b.id !== id);
    } else {
        spendingsData = spendingsData.filter(s => s.id !== id);
    }
    await saveDataToStorage();
    combineTransactions();
    renderTable();
    updateSummary();
}

// Update summary
function updateSummary() {
    const totalBillsCount = billsData.length;
    const totalSpendingsCount = spendingsData.length;

    const totalBillsAmount = billsData.reduce((sum, b) => sum + parseFloat(b.total), 0);
    const totalSpendingsAmount = spendingsData.reduce((sum, s) => sum + parseFloat(s.total), 0);

    const netProfit = totalBillsAmount - totalSpendingsAmount;

    const totalBillsEl = document.getElementById('totalBills');
    const billsAmountEl = document.getElementById('billsAmount');
    const totalSpendingsEl = document.getElementById('totalSpendings');
    const spendingsAmountEl = document.getElementById('spendingsAmount');
    const netProfitEl = document.getElementById('netProfit');

    if (totalBillsEl) totalBillsEl.textContent = totalBillsCount;
    if (billsAmountEl) billsAmountEl.textContent = `$${totalBillsAmount.toFixed(2)}`;
    if (totalSpendingsEl) totalSpendingsEl.textContent = totalSpendingsCount;
    if (spendingsAmountEl) spendingsAmountEl.textContent = `$${totalSpendingsAmount.toFixed(2)}`;
    if (netProfitEl) netProfitEl.textContent = `$${netProfit.toFixed(2)}`;
}

// Clear all data
async function handleClearData() {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
    billsData = [];
    spendingsData = [];
    await saveDataToStorage();
    combineTransactions();
    renderTable();
    updateSummary();
}