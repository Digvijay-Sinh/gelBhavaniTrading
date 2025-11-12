const { ipcRenderer } = require('electron');
let selectedFarmers = [];
let farmersMap = {};

document.addEventListener('DOMContentLoaded', async() => {
    await loadFarmers();
    parseSelectedIds();
    attachListeners();
    updateSummary();
});

async function loadFarmers() {
    try {
        const list = await ipcRenderer.invoke('load-farmers');
        list.forEach(f => farmersMap[f.id] = f);
    } catch (err) {
        console.error('Failed to load farmers', err);
        farmersMap = {};
    }
}

function parseSelectedIds() {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids');
    if (!ids) return;
    const arr = ids.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    selectedFarmers = arr.map(id => farmersMap[id]).filter(Boolean);
    renderFarmersList();
}

function renderFarmersList() {
    const container = document.getElementById('farmersList');
    if (!container) return;
    if (!selectedFarmers || selectedFarmers.length === 0) {
        container.innerHTML = '<p>કોઈ કિસાન પસંદ થયેલ નથી. <a href="./viewFarmers.html">પાછા જાઓ</a></p>';
        return;
    }
    const rows = selectedFarmers.map(f => `
        <div class="farm-row">
            <strong>${escapeHtml(f.name)}</strong> — હિસાબ: <strong>${Number(f.totalHisaab).toFixed(2)}</strong>
        </div>
    `).join('');
    container.innerHTML = `<div class="table-section">${rows}</div>`;
}

function attachListeners() {
    ['kulRakam', 'majuri', 'bardan', 'bhadu', 'kharch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateSummary);
    });
    const submitBtn = document.getElementById('submitSellBtn');
    if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
}

function readNum(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
}

function computeTotals() {
    const totalHisaab = selectedFarmers.reduce((s, f) => s + (parseFloat(f.totalHisaab) || 0), 0);
    const majuri = readNum('majuri');
    const bardan = readNum('bardan');
    const bhadu = readNum('bhadu');
    const kharch = readNum('kharch');
    const totalKharch = majuri + bardan + bhadu + kharch;
    const kulRakam = readNum('kulRakam');
    // per CR: profitOrLoss = kulRakam - totalKharch - totalHisaab
    const profitOrLoss = kulRakam - totalKharch - totalHisaab;
    return { totalHisaab, totalKharch, kulRakam, profitOrLoss };
}

function updateSummary() {
    const totals = computeTotals();
    document.getElementById('totalHisaab').textContent = totals.totalHisaab.toFixed(2);
    document.getElementById('totalKharch').textContent = totals.totalKharch.toFixed(2);
    const plEl = document.getElementById('profitLoss');
    plEl.textContent = totals.profitOrLoss.toFixed(2);
    plEl.style.color = totals.profitOrLoss >= 0 ? 'green' : 'red';
}

async function handleSubmit() {
    if (!selectedFarmers || selectedFarmers.length === 0) return alert('કોઈ કિસાન પસંદ થયેલ નથી');
    const farmerIds = selectedFarmers.map(f => f.id);
    const kulRakam = readNum('kulRakam');
    const majuri = readNum('majuri');
    const bardan = readNum('bardan');
    const bhadu = readNum('bhadu');
    const kharch = readNum('kharch');
    const totalKharch = majuri + bardan + bhadu + kharch;
    const totalHisaab = selectedFarmers.reduce((s, f) => s + (parseFloat(f.totalHisaab) || 0), 0);
    const profitOrLoss = kulRakam - totalKharch - totalHisaab;

    const entry = {
        id: Date.now(),
        farmerIds,
        kulRakam,
        majuri,
        bardan,
        bhadu,
        kharch,
        totalKharch,
        totalHisaab,
        profitOrLoss,
        createdAt: new Date().toISOString()
    };

    try {
        const created = await ipcRenderer.invoke('add-selltogether', entry);
        if (!created) throw new Error('Failed to create');
        // navigate to detail page
        window.location.href = `./sellTogetherDetail.html?id=${created.id}`;
    } catch (err) {
        console.error(err);
        alert('એકસાથે વેચાણ બનાવવું નિષ્ફળ રહ્યું');
    }
}

function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}