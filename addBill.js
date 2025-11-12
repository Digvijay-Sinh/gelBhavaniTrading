// Initialize form data storage
let billsData = [];
let spendingsData = [];

const { ipcRenderer } = require('electron');

// Load data from files on page load
document.addEventListener('DOMContentLoaded', async function() {
    await loadDataFromStorage();
    attachEventListeners();
});

// Load data from JSON files via IPC
async function loadDataFromStorage() {
    try {
        billsData = await ipcRenderer.invoke('load-bills');
        spendingsData = await ipcRenderer.invoke('load-spendings');
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load data. Please try again.');
    }
}

// Save data to JSON files via IPC
async function saveDataToStorage() {
    try {
        await ipcRenderer.invoke('save-bills', billsData);
        await ipcRenderer.invoke('save-spendings', spendingsData);
    } catch (error) {
        console.error('Error saving data:', error);
        showError('Failed to save data. Please try again.');
    }
}

// Attach event listeners
function attachEventListeners() {
    document.getElementById('submitBillBtn').addEventListener('click', handleBillSubmit);
    document.getElementById('addSpendingBtn').addEventListener('click', handleAddSpending);
    document.getElementById('submitSpendingBtn').addEventListener('click', handleSpendingSubmit);
    document.getElementById('cancelSpendingBtn').addEventListener('click', handleCancelSpending);
    document.getElementById('closeSpendingBtn').addEventListener('click', handleCancelSpending);
    const closeMsg = document.querySelector('.close-msg');
    if (closeMsg) closeMsg.addEventListener('click', hideSuccessMessage);
}

// Handle bill form submission
function handleBillSubmit(e) {
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

    const billData = {
        id: Date.now(),
        type: 'bill',
        description,
        amount,
        quantity,
        rate,
        tax,
        total: total.toFixed(2),
        date: new Date().toLocaleDateString()
    };

    billsData.push(billData);
    saveDataToStorage();
    showSuccessMessage('Bill added successfully!');
    resetBillForm();
}

// Handle spending form show
function handleAddSpending(e) {
    e.preventDefault();
    const spendingForm = document.getElementById('spendingForm');
    spendingForm.classList.remove('hidden');
}

// Handle spending form submission
function handleSpendingSubmit(e) {
    e.preventDefault();

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

    spendingsData.push(spendingData);
    saveDataToStorage();
    showSuccessMessage('Spending added successfully!');
    resetSpendingForm();
    handleCancelSpending();
}

// Handle cancel spending form
function handleCancelSpending(e) {
    const spendingForm = document.getElementById('spendingForm');
    spendingForm.classList.add('hidden');
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