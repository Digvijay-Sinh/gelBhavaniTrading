let transactions = [];
let allTransactions = []; // flattened list for rendering (bills + nested spendings)

const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', async function() {
    await loadTransactions();
    combineTransactions();
    renderTable();
    updateSummary();
    attachEventListeners();
    await initializeDummyData();
});

// Initialize dummy data (first-time only)
async function initializeDummyData() {
    if (transactions.length > 0) return;
    await ipcRenderer.invoke('save-transactions', transactions);
    combineTransactions();
}

async function loadTransactions() {
    try {
        transactions = await ipcRenderer.invoke('load-transactions');
    } catch (err) {
        console.error('Error loading transactions', err);
        transactions = [];
    }
}

async function saveTransactions() {
    try {
        await ipcRenderer.invoke('save-transactions', transactions);
    } catch (err) {
        console.error('Error saving transactions', err);
    }
}

// Flatten bills and nested spendings into a list for filtering/rendering
function combineTransactions() {
    // For rendering we keep bills as primary rows and keep spendings nested inside them.
    // Standalone spendings (type === 'spending' without a parent) will be included as separate rows.
    // Preserve order by bill id desc; standalone spendings will be shown by their id as well.
    allTransactions = transactions.slice().sort((a, b) => b.id - a.id);
}

function attachEventListeners() {
    const filterEl = document.getElementById('filterType');
    const searchEl = document.getElementById('searchInput');
    if (filterEl) filterEl.addEventListener('change', renderTable);
    if (searchEl) searchEl.addEventListener('input', renderTable);
    const clearBtn = document.getElementById('clearDataBtn');
    if (clearBtn) clearBtn.addEventListener('click', handleClearData);
}

function getFilteredTransactions() {
    const filterTypeEl = document.getElementById('filterType');
    const searchEl = document.getElementById('searchInput');
    const filterType = filterTypeEl ? filterTypeEl.value : 'all';
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';

    let filtered = allTransactions;
    if (filterType === 'bill') {
        filtered = filtered.filter(t => t.type === 'bill');
    } else if (filterType === 'spending') {
        // show bills that have spendings and standalone spendings
        filtered = allTransactions.filter(t => {
            if (t.type === 'spending') return true;
            if (t.type === 'bill' && Array.isArray(t.spendings) && t.spendings.length > 0) return true;
            return false;
        });
    }

    if (searchTerm) {
        filtered = filtered.filter(t => {
            if (t.description && t.description.toLowerCase().includes(searchTerm)) return true;
            // also check spendings descriptions when t is a bill
            if (t.type === 'bill' && Array.isArray(t.spendings)) {
                return t.spendings.some(s => s.description && s.description.toLowerCase().includes(searchTerm));
            }
            return false;
        });
    }

    return filtered;
}

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

    // Build rows: each bill is a single row; spendings are displayed inside the spendings cell
    const rows = filteredData.map(t => {
        if (t.type === 'bill') {
            // build spendings HTML
            let spendingsHtml = '';
            if (Array.isArray(t.spendings) && t.spendings.length > 0) {
                spendingsHtml = t.spendings.map(s => {
                    const sDesc = `${s.description} ($${parseFloat(s.total).toFixed(2)})`;
                    // delete button for spending calls deleteTransaction(spendId, 'spending', parentBillId)
                    return `<div class="spending-item">${escapeHtml(sDesc)}</div>`;
                }).join('');
            } else {
                spendingsHtml = '<em>No spendings</em>';
            }

            return `
                <tr class="bill-row">
                    <td><span class="type-badge bill">bill</span></td>
                    <td>${escapeHtml(t.description)}</td>
                    <td>$${parseFloat(t.amount).toFixed(2)}</td>
                    <td>${t.quantity}</td>
                    <td>$${parseFloat(t.rate).toFixed(2)}</td>
                    <td>${t.tax}% Tax</td>
                    <td><strong>$${parseFloat(t.total).toFixed(2)}</strong></td>
                    <td>${t.date}</td>
                    <td>
                        ${spendingsHtml}
                        <div style="margin-top:6px">
                            <button class="btn-edit" onclick="editBill(${t.id})">Edit</button>
                            <button class="btn-delete" onclick="deleteTransaction(${t.id}, 'bill')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }

        // standalone spending (no parent) - show as separate row
        const taxOrDisc = t.type === 'spending' ? `${t.discount ?? ''}% Disc` : '';
        return `
            <tr class="spending-row">
                <td><span class="type-badge spending">spending</span></td>
                <td>${escapeHtml(t.description)}</td>
                <td>$${parseFloat(t.amount).toFixed(2)}</td>
                <td>${t.quantity}</td>
                <td>$${parseFloat(t.rate).toFixed(2)}</td>
                <td>${taxOrDisc}</td>
                <td><strong>$${parseFloat(t.total).toFixed(2)}</strong></td>
                <td>${t.date}</td>
                <td>
                    <button class="btn-delete" onclick="deleteTransaction(${t.id}, 'spending', null)">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rows;
    if (recordCount) recordCount.textContent = `${filteredData.length} record${filteredData.length !== 1 ? 's' : ''}`;
}

// delete - calls IPC and refreshes
async function deleteTransaction(id, type, parentId) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
        const ok = await ipcRenderer.invoke('delete-transaction', id, type, parentId);
        if (!ok) throw new Error('Delete failed');
        await loadTransactions();
        combineTransactions();
        renderTable();
        updateSummary();
    } catch (err) {
        console.error(err);
        showError('Failed to delete.');
    }
}

function editBill(id) {
    // navigate to addBill with editId param
    window.location.href = `./addBill.html?editId=${id}`;
}

// small helper to escape HTML inserted into table cells
function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function updateSummary() {
    // compute totals from transactions structure (bills and nested spendings)
    const bills = transactions.filter(t => t.type === 'bill');
    let spendings = [];
    bills.forEach(b => { if (Array.isArray(b.spendings)) spendings = spendings.concat(b.spendings); });
    // include standalone spendings too
    spendings = spendings.concat(transactions.filter(t => t.type === 'spending' && !t.parentId));

    const totalBillsCount = bills.length;
    const totalSpendingsCount = spendings.length;
    const totalBillsAmount = bills.reduce((sum, b) => sum + parseFloat(b.total || 0), 0);
    const totalSpendingsAmount = spendings.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
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
    try {
        await ipcRenderer.invoke('clear-all-data');
        transactions = [];
        combineTransactions();
        renderTable();
        updateSummary();
    } catch (err) {
        console.error(err);
        showError('Failed to clear data');
    }
}

function showError(message) {
    alert(message);
}