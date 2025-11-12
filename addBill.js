// Unified transactions model: a bill has an array `spendings`
let transactions = [];
let currentBillId = null; // id of bill being edited or just created
let currentSpendingId = null; // id of spending being edited under current bill

const { ipcRenderer } = require('electron');

// Load data and set up UI
document.addEventListener('DOMContentLoaded', async function() {
    await loadTransactions();
    attachEventListeners();
    await initializeEditMode();
});

async function loadTransactions() {
    try {
        transactions = await ipcRenderer.invoke('load-transactions');
    } catch (err) {
        console.error('Error loading transactions:', err);
        transactions = [];
    }
}

async function saveTransactionsToStorage() {
    try {
        await ipcRenderer.invoke('save-transactions', transactions);
    } catch (err) {
        console.error('Error saving transactions:', err);
        showError('Failed to save data. Please try again.');
    }
}

// Attach event listeners
function attachEventListeners() {
    const submitBtn = document.getElementById('submitBillBtn');
    if (submitBtn) submitBtn.addEventListener('click', handleBillSubmit);
    const addSpendingBtn = document.getElementById('addSpendingBtn');
    if (addSpendingBtn) addSpendingBtn.addEventListener('click', handleAddSpending);
    const submitSpendingBtn = document.getElementById('submitSpendingBtn');
    if (submitSpendingBtn) submitSpendingBtn.addEventListener('click', handleSpendingSubmit);
    const cancelSpendingBtn = document.getElementById('cancelSpendingBtn');
    if (cancelSpendingBtn) cancelSpendingBtn.addEventListener('click', handleCancelSpending);
    const closeSpendingBtn = document.getElementById('closeSpendingBtn');
    if (closeSpendingBtn) closeSpendingBtn.addEventListener('click', handleCancelSpending);
    const closeMsg = document.querySelector('.close-msg');
    if (closeMsg) closeMsg.addEventListener('click', hideSuccessMessage);

    // disable Add Spending until a bill exists/selected
    toggleAddSpendingButton();
}

// Initialize edit mode (pre-fill if editId present)
async function initializeEditMode() {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('editId');
    if (editId) {
        const id = parseInt(editId, 10);
        const bill = transactions.find(t => t.type === 'bill' && t.id === id);
        if (bill) {
            currentBillId = bill.id;
            prefillBillForm(bill);
            // if bill has spendings, prefill the spending form with the first spending
            if (Array.isArray(bill.spendings) && bill.spendings.length > 0) {
                const sp = bill.spendings[0];
                currentSpendingId = sp.id;
                prefillSpendingForm(sp);
                const spendingForm = document.getElementById('spendingForm');
                if (spendingForm) spendingForm.classList.remove('hidden');
            }
        }
    }
    toggleForEditMode();
    toggleAddSpendingButton();
}

function prefillBillForm(bill) {
    if (!bill) return;
    const descEl = document.getElementById('billDescription');
    const amountEl = document.getElementById('billAmount');
    const quantityEl = document.getElementById('billQuantity');
    const rateEl = document.getElementById('billRate');
    const taxEl = document.getElementById('billTax');
    if (descEl) descEl.value = bill.description || '';
    if (amountEl) amountEl.value = bill.amount || '';
    if (quantityEl) quantityEl.value = bill.quantity || '';
    if (rateEl) rateEl.value = bill.rate || '';
    if (taxEl) taxEl.value = bill.tax || '';
}

function prefillSpendingForm(spending) {
    if (!spending) return;
    const descEl = document.getElementById('spendDescription');
    const amountEl = document.getElementById('spendAmount');
    const quantityEl = document.getElementById('spendQuantity');
    const rateEl = document.getElementById('spendRate');
    const discountEl = document.getElementById('spendDiscount');
    if (descEl) descEl.value = spending.description || '';
    if (amountEl) amountEl.value = spending.amount || '';
    if (quantityEl) quantityEl.value = spending.quantity || '';
    if (rateEl) rateEl.value = spending.rate || '';
    if (discountEl) discountEl.value = spending.discount || '';
}

// Handle bill form submission (create or update)
async function handleBillSubmit(e) {
    e.preventDefault();

    const description = document.getElementById('billDescription').value.trim();
    const amount = parseFloat(document.getElementById('billAmount').value);
    const quantity = parseFloat(document.getElementById('billQuantity').value);
    const rate = parseFloat(document.getElementById('billRate').value);
    const tax = parseFloat(document.getElementById('billTax').value);

    if (!description || isNaN(amount) || isNaN(quantity) || isNaN(rate) || isNaN(tax)) {
        showError('Please fill all fields with valid values');
        return;
    }

    const total = (amount * quantity) + ((amount * quantity) * (tax / 100));

    const billObj = {
        id: currentBillId || Date.now(),
        type: 'bill',
        description,
        amount,
        quantity,
        rate,
        tax,
        total: total.toFixed(2),
        date: new Date().toLocaleDateString()
    };
    // For new bills include an empty spendings array; for updates leave spendings undefined so existing spendings are preserved by dataManager.updateBill
    if (!currentBillId) billObj.spendings = [];

    try {
        if (currentBillId) {
            // update
            const ok = await ipcRenderer.invoke('update-bill', billObj);
            if (!ok) throw new Error('Update failed');
            // update local transactions
            await loadTransactions();
            showSuccessMessage('Bill updated successfully!');
        } else {
            // add new
            const created = await ipcRenderer.invoke('add-bill', billObj);
            currentBillId = created && created.id ? created.id : billObj.id;
            await loadTransactions();
            showSuccessMessage('Bill added successfully!');
        }
    } catch (err) {
        console.error(err);
        showError('Failed to save bill.');
        return;
    }

    resetBillForm();
    toggleAddSpendingButton();
}

// Handle spending form show
function handleAddSpending(e) {
    e && e.preventDefault();
    if (!currentBillId) return showError('Please save a bill first to add spendings.');
    // ensure we're adding a new spending (not editing an existing one)
    currentSpendingId = null;
    const spendingForm = document.getElementById('spendingForm');
    if (spendingForm) spendingForm.classList.remove('hidden');
}

// Handle spending form submission
async function handleSpendingSubmit(e) {
    e.preventDefault();

    if (!currentBillId) {
        return showError('No bill selected. Save or select a bill first.');
    }

    const description = document.getElementById('spendDescription').value.trim();
    const amount = parseFloat(document.getElementById('spendAmount').value);
    const quantity = parseFloat(document.getElementById('spendQuantity').value);
    const rate = parseFloat(document.getElementById('spendRate').value);
    const discount = parseFloat(document.getElementById('spendDiscount').value);

    if (!description || isNaN(amount) || isNaN(quantity) || isNaN(rate) || isNaN(discount)) {
        showError('Please fill all fields with valid values');
        return;
    }

    const total = (amount * quantity) - ((amount * quantity) * (discount / 100));

    const spendingData = {
        id: Date.now(),
        type: 'spending',
        description,
        amount,
        quantity,
        rate,
        discount,
        total: total.toFixed(2),
        date: new Date().toLocaleDateString()
    };

    try {
        if (currentSpendingId) {
            // update existing spending inside the bill and save via update-bill
            const bill = transactions.find(t => t.type === 'bill' && t.id === currentBillId);
            if (!bill) throw new Error('Parent bill not found');
            bill.spendings = bill.spendings || [];
            const idx = bill.spendings.findIndex(s => s.id === currentSpendingId);
            if (idx !== -1) {
                bill.spendings[idx] = {...bill.spendings[idx], ...spendingData, id: currentSpendingId };
            } else {
                // fallback: append with same id
                bill.spendings.push({...spendingData, id: currentSpendingId });
            }
            const ok = await ipcRenderer.invoke('update-bill', bill);
            if (!ok) throw new Error('Failed to update spending');
            await loadTransactions();
            showSuccessMessage('Spending updated successfully!');
        } else {
            const ok = await ipcRenderer.invoke('add-spending-to-bill', currentBillId, spendingData);
            if (!ok) throw new Error('Failed to add spending');
            await loadTransactions();
            showSuccessMessage('Spending added successfully!');
        }
    } catch (err) {
        console.error(err);
        showError('Failed to save spending.');
        return;
    }

    // After saving, reset the spending edit state and UI
    currentSpendingId = null;
    resetSpendingForm();
    handleCancelSpending();
}

// Handle cancel spending form
function handleCancelSpending(e) {
    const spendingForm = document.getElementById('spendingForm');
    if (spendingForm) spendingForm.classList.add('hidden');
    resetSpendingForm();
}

// Reset bill form
function resetBillForm() {
    const form = document.getElementById('billForm');
    if (form) form.reset();
}

// Reset spending form
function resetSpendingForm() {
    const form = document.getElementById('spendingForm');
    if (form) form.reset();
}

// Enable/disable Add Spending button based on whether a bill exists/selected
function toggleAddSpendingButton() {
    const addSpendingBtn = document.getElementById('addSpendingBtn');
    if (!addSpendingBtn) return;
    if (currentBillId) {
        addSpendingBtn.removeAttribute('disabled');
    } else {
        addSpendingBtn.setAttribute('disabled', 'true');
    }
}

function toggleForEditMode() {
    const cancelSpendingBtn = document.getElementById('cancelSpendingBtn');
    if (!cancelSpendingBtn) return;
    if (currentBillId) {
        cancelSpendingBtn.setAttribute('hidden', 'true');
    } else {
        cancelSpendingBtn.setAttribute('disabled', 'true');
    }
}

// Show success message
function showSuccessMessage(message) {
    const messageEl = document.getElementById('successMessage');
    const textEl = document.getElementById('successText');
    if (!messageEl || !textEl) return;
    textEl.textContent = message;
    messageEl.classList.remove('hidden');

    setTimeout(() => {
        hideSuccessMessage();
    }, 3000);
}

// Hide success message
function hideSuccessMessage() {
    const el = document.getElementById('successMessage');
    if (el) el.classList.add('hidden');
}

// Show error message
function showError(message) {
    alert(message);
}