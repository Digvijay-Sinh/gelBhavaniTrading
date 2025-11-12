const { ipcRenderer } = require('electron');
let entry = null;
let farmersMap = {};

document.addEventListener('DOMContentLoaded', async() => {
    await loadData();
    renderDetail();
});

async function loadData() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    try {
        const entries = await ipcRenderer.invoke('load-selltogether');
        entry = entries.find(e => String(e.id) === String(id));
        const flist = await ipcRenderer.invoke('load-farmers');
        flist.forEach(f => farmersMap[f.id] = f);
    } catch (err) {
        console.error(err);
    }
}

function renderDetail() {
    const container = document.getElementById('detail');
    if (!container) return;
    if (!entry) {
        container.innerHTML = '<p>પ્રવેશ નથી</p>';
        return;
    }
    const farmersHtml = (entry.farmerIds || []).map(id => {
        const f = farmersMap[id];
        if (!f) return `<div>કિસાન ID ${id} (ગુમ થયો)</div>`;
        // allocate share of kharch proportionally by hisaab
        return `
            <tr>
                <td>${escapeHtml(f.name)}</td>
                <td>${Number(f.bori).toFixed(2)}</td>
                <td>${Number(f.bharti).toFixed(2)}</td>
                <td>${Number(f.kad).toFixed(2)}</td>
                <td>${Number(f.man).toFixed(2)}</td>
                <td>${Number(f.bhav).toFixed(2)}</td>
                <td>${Number(f.totalHisaab).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const html = `
        <div class="summary-section">
            <div class="summary-card">
                <div class="card-label">કુલ હિસાબ</div>
                <div class="card-value">${Number(entry.totalHisaab).toFixed(2)}</div>
            </div>
            <div class="summary-card">
                <div class="card-label">કુલ ખર્ચ</div>
                <div class="card-value">${Number(entry.totalKharch).toFixed(2)}</div>
            </div>
            <div class="summary-card highlight">
                <div class="card-label">નફો / નુકસાન</div>
                <div class="card-value" style="color:${entry.profitOrLoss>=0?'green':'red'}">${Number(entry.profitOrLoss).toFixed(2)}</div>
            </div>
        </div>

        <h3>કિસાનોનું વિભાજન</h3>
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>કિસાન</th>
                        <th>બોરી</th>
                        <th>ભરતી</th>
                        <th>કડ</th>
                        <th>મણ</th>
                        <th>ભાવ</th>
                        <th>કુલ હિસાબ</th>
                    </tr>
                </thead>
                <tbody>${farmersHtml}</tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
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