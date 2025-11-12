const { ipcRenderer } = require('electron');
let farmers = [];

document.addEventListener('DOMContentLoaded', async() => {
    await loadFarmers();
    renderTable();
    attachListeners();
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
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.addEventListener('change', toggleSelectAll);
    const sellBtn = document.getElementById('sellTogetherBtn');
    if (sellBtn) sellBtn.addEventListener('click', handleSellTogether);
}

function renderTable() {
    const tbody = document.getElementById('farmersBody');
    if (!tbody) return;
    // filter out farmers that are part of an active sellTogether (hiddenInSellTogether flag)
    const visibleFarmers = (farmers || []).filter(f => !f.hiddenInSellTogether);
    if (!visibleFarmers || visibleFarmers.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="9">કોઈ કિસાન નથી. <a href="./addFarmer.html">હવે ઉમેરો</a></td></tr>';
        document.getElementById('sellTogetherBtn').setAttribute('disabled', 'true');
        return;
    }

    const rows = visibleFarmers.map(f => {
        return `
            <tr data-id="${f.id}">
                <td><input type="checkbox" class="rowCheck" data-id="${f.id}"></td>
                <td>${escapeHtml(f.name)}</td>
                <td>${f.bori}</td>
                <td>${f.bharti}</td>
                <td>${f.kad}</td>
                <td>${Number(f.man).toFixed(2)}</td>
                <td>${f.bhav}</td>
                <td>${Number(f.totalHisaab).toFixed(2)}</td>
                <td>
                  <button class="btn-edit" onclick="editFarmer(${f.id})">સંપાદિત</button>
                  <button class="btn-delete" onclick="deleteFarmer(${f.id})">કાઢો</button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
    attachRowChecks();
}

function attachRowChecks() {
    const checks = document.querySelectorAll('.rowCheck');
    checks.forEach(ch => ch.addEventListener('change', updateSellButtonState));
}

function toggleSelectAll(e) {
    const checked = e.target.checked;
    document.querySelectorAll('.rowCheck').forEach(ch => ch.checked = checked);
    updateSellButtonState();
}

function updateSellButtonState() {
    const anyChecked = Array.from(document.querySelectorAll('.rowCheck')).some(c => c.checked);
    const btn = document.getElementById('sellTogetherBtn');
    if (anyChecked) btn.removeAttribute('disabled');
    else btn.setAttribute('disabled', 'true');
}

function handleSellTogether() {
    const selected = Array.from(document.querySelectorAll('.rowCheck')).filter(c => c.checked).map(c => c.getAttribute('data-id'));
    if (!selected || selected.length === 0) return alert('કૃપા કરીને ઓછામાં ઓછા એક કિસાન પસંદ કરો');
    // navigate with selected ids in query string
    window.location.href = `./sellTogether.html?ids=${selected.join(',')}`;
}

function editFarmer(id) {
    window.location.href = `./addFarmer.html?id=${id}`;
}

async function deleteFarmer(id) {
    if (!confirm('શું તમે આ કિસાનને કાઢી નાખવા માંગો છો?')) return;
    try {
        const ok = await ipcRenderer.invoke('delete-farmer', id);
        if (!ok) throw new Error('delete failed');
        await loadFarmers();
        renderTable();
    } catch (err) {
        console.error(err);
    alert('કાઢવામાં નિષ્ફળતા');
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