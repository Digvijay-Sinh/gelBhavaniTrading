const { ipcRenderer } = require('electron');
let entries = [];
let farmers = {};

document.addEventListener('DOMContentLoaded', async() => {
    await loadData();
    renderList();
});

async function loadData() {
    try {
        entries = await ipcRenderer.invoke('load-selltogether');
        const flist = await ipcRenderer.invoke('load-farmers');
        flist.forEach(f => farmers[f.id] = f);
    } catch (err) {
        console.error(err);
        entries = [];
    }
}

function renderList() {
    const tbody = document.getElementById('sellBody');
    if (!tbody) return;
    if (!entries || entries.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">કોઈ પ્રવેશો નથી.</td></tr>';
        return;
    }
    const rows = entries.map(e => {
        const farmerCount = Array.isArray(e.farmerIds) ? e.farmerIds.length : 0;
        return `
            <tr>
                <td>${e.id}</td>
                <td>${new Date(e.createdAt).toLocaleString()}</td>
                <td>${farmerCount}</td>
                <td>${Number(e.kulRakam).toFixed(2)}</td>
                <td>${Number(e.totalHisaab).toFixed(2)}</td>
                <td>${Number(e.totalKharch).toFixed(2)}</td>
                <td style="color:${e.profitOrLoss>=0?'green':'red'}">${Number(e.profitOrLoss).toFixed(2)}</td>
                <td>
                    <button onclick="viewDetail(${e.id})" class="btn-edit">જુઓ</button>
                    <button onclick="deleteEntry(${e.id})" class="btn-delete">કાઢો</button>
                </td>
            </tr>
        `;
    }).join('');
    tbody.innerHTML = rows;
}

function viewDetail(id) {
    window.location.href = `./sellTogetherDetail.html?id=${id}`;
}

async function deleteEntry(id) {
    if (!confirm('શું તમે આ એકસાથે વેચાણ પ્રવેશોને કાઢી નાખવા માંગો છો?')) return;
    try {
        const ok = await ipcRenderer.invoke('delete-selltogether', id);
        if (!ok) throw new Error('delete failed');
        await loadData();
        renderList();
    } catch (err) {
        console.error(err);
        alert('કાઢવામાં નિષ્ફળતા');
    }
}