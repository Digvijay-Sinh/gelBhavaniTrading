const { ipcRenderer } = require('electron');
let farmers = [];

document.addEventListener('DOMContentLoaded', async () => {
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
                  <button class="btn-download" onclick="downloadInvoice(${f.id})">ડાઉનલોડ</button>
                  <button class="btn-download" onclick="printInvoice(${f.id})">Print</button>

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

function downloadInvoice(farmerId) {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) {
        alert('કિસાનની માહિતી મળી નથી');
        return;
    }

    try {
        const dateStr = new Date().toLocaleDateString('gu-IN');
        const timestamp = new Date().toISOString().split('T')[0];

        // Create HTML content for invoice
        const invoiceHTML = `
            <div style="font-family: 'Noto Sans Gujarati', Arial, sans-serif; padding: 20px; width: 190mm; background: white; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 12px;">
                    <h1 style="font-size: 24px; color: #000; margin: 0 0 8px 0; font-weight: bold;">રામાધણી એન્ટરપ્રાઇઝ</h1>
                    <p style="font-size: 12px; color: #000; margin: 4px 0;">GST: 24BOFPC2636N1ZZ</p>
                    <p style="font-size: 11px; color: #000; margin: 4px 0;">ફોન: 9687276849 | માલિક: Raghuvirsinh Chauhan</p>
                </div>

                <h2 style="font-size: 18px; color: #000; margin-bottom: 15px; font-weight: bold;">કિસાનનો હિસાબ</h2>

                <div style="margin-bottom: 15px; font-size: 13px;">
                    <p style="margin: 4px 0;"><strong>કિસાનનું નામ:</strong> ${escapeHtml(farmer.name)}</p>
                    <p style="margin: 4px 0;"><strong>તારીખ:</strong> ${dateStr}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">બોરી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભરતી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">કડ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 12%;">મણ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભાવ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 18%;">કુલ હિસાબ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.bori}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.bharti}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.kad}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(farmer.man).toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.bhav}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹ ${Number(farmer.totalHisaab).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 25px; background-color: #f9f9f9; padding: 12px; border: 1px solid #000;">
                    <h3 style="font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">સારાંશ:</h3>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>કુલ હિસાબ:</strong> ₹ ${Number(farmer.totalHisaab).toFixed(2)}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>કુલ બોરી:</strong> ${farmer.bori}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>કુલ મણ:</strong> ${Number(farmer.man).toFixed(2)}</p>
                </div>

                <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #000; text-align: center; font-size: 10px; color: #000;">
                    <p style="margin: 4px 0;">આ હિસાબ સૃષ્ટ: ${new Date().toLocaleString('gu-IN')}</p>
                    <p style="margin: 4px 0;">રામાધણી એન્ટરપ્રાઇઝ દ્વારા</p>
                </div>
            </div>
        `;

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            overflow: auto;
        `;

        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            background: white;
            max-height: 90vh;
            overflow: auto;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        contentWrapper.innerHTML = invoiceHTML;

        overlay.appendChild(contentWrapper);
        document.body.appendChild(overlay);

        // Generate filename
        const filename = `Invoice_${escapeHtml(farmer.name).replace(/\s+/g, '_')}_${timestamp}.pdf`;

        // Get the actual content div
        const element = contentWrapper.firstElementChild;

        // Options for html2pdf
        const opt = {
            margin: [10, 10, 10, 10],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        // Generate PDF with a delay
        setTimeout(() => {
            html2pdf()
                .set(opt)
                .from(element)
                .save()
                .then(() => {
                    document.body.removeChild(overlay);
                })
                .catch(err => {
                    console.error('PDF generation error:', err);
                    document.body.removeChild(overlay);
                    alert('PDF બનાવવામાં નિષ્ફળતા: ' + err.message);
                });
        }, 1000);

    } catch (err) {
        console.error('Error:', err);
        alert('PDF બનાવવામાં નિષ્ફળતા: ' + err.message);
    }
}

function printInvoice(farmerId) {
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) {
        alert('કિસાનની માહિતી મળી નથી');
        return;
    }

    try {
        const dateStr = new Date().toLocaleDateString('gu-IN');

        // Use the exact same HTML structure as your download function
        const invoiceHTML = `
            <div style="font-family: 'Noto Sans Gujarati', Arial, sans-serif; padding: 20px; width: 190mm; background: white; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 12px;">
                    <h1 style="font-size: 24px; color: #000; margin: 0 0 8px 0; font-weight: bold;">રામાધણી એન્ટરપ્રાઇઝ</h1>
                    <p style="font-size: 12px; color: #000; margin: 4px 0;">GST: 24BOFPC2636N1ZZ</p>
                    <p style="font-size: 11px; color: #000; margin: 4px 0;">ફોન: 9687276849 | માલિક: Raghuvirsinh Chauhan</p>
                </div>

                <h2 style="font-size: 18px; color: #000; margin-bottom: 15px; font-weight: bold;">કિસાનનો હિસાબ</h2>

                <div style="margin-bottom: 15px; font-size: 13px;">
                    <p style="margin: 4px 0;"><strong>કિસાનનું નામ:</strong> ${escapeHtml(farmer.name)}</p>
                    <p style="margin: 4px 0;"><strong>તારીખ:</strong> ${dateStr}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">બોરી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભરતી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">કડ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 12%;">મણ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભાવ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 18%;">કુલ હિસાબ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.bori}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.bharti}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.kad}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(farmer.man).toFixed(2)}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${farmer.bhav}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹ ${Number(farmer.totalHisaab).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 25px; background-color: #f9f9f9; padding: 12px; border: 1px solid #000;">
                    <h3 style="font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">સારાંશ:</h3>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>કુલ હિસાબ:</strong> ₹ ${Number(farmer.totalHisaab).toFixed(2)}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>કુલ બોરી:</strong> ${farmer.bori}</p>
                    <p style="margin: 4px 0; font-size: 13px;"><strong>કુલ મણ:</strong> ${Number(farmer.man).toFixed(2)}</p>
                </div>

                <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #000; text-align: center; font-size: 10px; color: #000;">
                    <p style="margin: 4px 0;">આ હિસાબ સૃષ્ટ: ${new Date().toLocaleString('gu-IN')}</p>
                    <p style="margin: 4px 0;">રામાધણી એન્ટરપ્રાઇઝ દ્વારા</p>
                </div>
            </div>
        `;

        // Create a hidden iframe
        const printIframe = document.createElement('iframe');
        printIframe.style.position = 'absolute';
        printIframe.style.width = '0px';
        printIframe.style.height = '0px';
        printIframe.style.border = 'none';

        document.body.appendChild(printIframe);

        // Wrap the invoice HTML in a basic document structure to ensure print styles are applied
        const printDocumentHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Invoice</title>
                <style>
                    @media print {
                        @page { margin: 0; }
                        body { margin: 1cm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${invoiceHTML}
            </body>
            </html>
        `;

        // Write content to iframe and trigger print
        const iframeDoc = printIframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printDocumentHTML);
        iframeDoc.close();

        // Wait for the iframe content to fully load before printing
        printIframe.onload = function () {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();

            // Clean up the iframe after the print dialog closes
            setTimeout(() => {
                document.body.removeChild(printIframe);
            }, 1000);
        };

    } catch (err) {
        console.error('Print Error:', err);
        alert('પ્રિન્ટ કરવામાં નિષ્ફળતા: ' + err.message);
    }
}