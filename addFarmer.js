const { ipcRenderer } = require('electron');

let farmers = [];
let editId = null;

document.addEventListener('DOMContentLoaded', async() => {
    await loadFarmers();
    attachListeners();
    initializeEditMode();
});

async function loadFarmers() {
    try {
        farmers = await ipcRenderer.invoke('load-farmers');
    } catch (err) {
        console.error('Failed to load farmers', err);
        farmers = [];
    }
}

function attachListeners() {
    ['bori', 'bharti', 'kad', 'bhav'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateComputedFields);
    });
    const submitBtn = document.getElementById('submitFarmerBtn');
    if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
    const closeMsg = document.querySelector('.close-msg');
    if (closeMsg) closeMsg.addEventListener('click', hideMessage);
}

function initializeEditMode() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    const numericId = parseInt(id, 10);
    const f = farmers.find(x => x.id === numericId);
    if (!f) return;
    editId = f.id;
    document.getElementById('farmerName').value = f.name || '';
    document.getElementById('bori').value = f.bori || 0;
    document.getElementById('bharti').value = f.bharti || 0;
    document.getElementById('kad').value = f.kad || 0;
    document.getElementById('bhav').value = f.bhav || 0;
    updateComputedFields();
}

function readNumber(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
}

function updateComputedFields() {
    const bori = readNumber('bori');
    const bharti = readNumber('bharti');
    const kad = readNumber('kad');
    const bhav = readNumber('bhav');

    const man = bori * (bharti - kad);
    const totalHisaab = man * bhav;

    document.getElementById('man').textContent = Number.isFinite(man) ? man.toFixed(2) : '0';
    document.getElementById('totalHisaab').textContent = Number.isFinite(totalHisaab) ? totalHisaab.toFixed(2) : '0';
}

async function handleSubmit() {
    const name = document.getElementById('farmerName').value.trim();
    if (!name) return showMessage('કૃપા કરીને કિસાનનું નામ દાખલ કરો');
    const bori = readNumber('bori');
    const bharti = readNumber('bharti');
    const kad = readNumber('kad');
    const bhav = readNumber('bhav');

    const man = bori * (bharti - kad);
    const totalHisaab = man * bhav;

    const farmerObj = {
        id: editId || Date.now(),
        name,
        bori,
        bharti,
        kad,
        bhav,
        man: Number.isFinite(man) ? parseFloat(man.toFixed(2)) : 0,
        totalHisaab: Number.isFinite(totalHisaab) ? parseFloat(totalHisaab.toFixed(2)) : 0,
        createdAt: new Date().toISOString()
    };

    try {
        if (editId) {
            const ok = await ipcRenderer.invoke('update-farmer', farmerObj);
            if (!ok) throw new Error('update failed');
            showMessage('કિસાન સફળતાપૂર્વક અપડેટ થયો');
        } else {
            const created = await ipcRenderer.invoke('add-farmer', farmerObj);
            if (!created) throw new Error('create failed');
            showMessage('કિસાન સફળતાપૂર્વક ઉમેરાયો');
        }
        await loadFarmers();
        // reset form for new entries
        if (!editId) document.getElementById('farmerForm').reset();
        updateComputedFields();
    } catch (err) {
        console.error(err);
        showMessage('કિસાન સાચવવામાં નિષ્ફળતા');
    }
}

function showMessage(text) {
    const el = document.getElementById('message');
    const textEl = document.getElementById('messageText');
    if (!el || !textEl) return;
    textEl.textContent = text;
    el.classList.remove('hidden');
    setTimeout(hideMessage, 2500);
}

function hideMessage() {
    const el = document.getElementById('message');
    if (el) el.classList.add('hidden');
}