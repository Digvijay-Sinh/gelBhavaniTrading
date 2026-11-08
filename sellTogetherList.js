const { ipcRenderer } = require('electron');
let entries = [];
let farmers = {};

document.addEventListener('DOMContentLoaded', async () => {
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
                <td style="color:${e.profitOrLoss >= 0 ? 'green' : 'red'}">${Number(e.profitOrLoss).toFixed(2)}</td>
                <td>
                    <button onclick="viewDetail(${e.id})" class="btn-edit">જુઓ</button>
                    <button onclick="deleteEntry(${e.id})" class="btn-delete">કાઢો</button>
                    <button class="btn-download" onclick="downloadInvoice(${e.id})">ડાઉનલોડ</button>
                    <button class="btn-download" onclick="printInvoice(${e.id})">Print</button> 
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

async function downloadInvoice(entryId) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
        alert('પ્રવેશની માહિતી મળી નથી');
        return;
    }

    try {
        const dateStr = new Date().toLocaleDateString('gu-IN');
        const timestamp = new Date().toISOString().split('T')[0];

        // Build farmers rows
        const farmersRows = (entry.farmerIds || []).map(id => {
            const f = farmers[id];
            if (!f) return '';
            return `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(f.name)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.bori).toFixed(0)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.bharti).toFixed(0)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.kad).toFixed(0)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.man).toFixed(2)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.bhav).toFixed(2)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹ ${Number(f.totalHisaab).toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // Create HTML content for invoice
        const invoiceHTML = `
            <div style="font-family: 'Noto Sans Gujarati', Arial, sans-serif; padding: 20px; width: 190mm; background: white; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 12px;">
                    <h1 style="font-size: 24px; color: #000; margin: 0 0 8px 0; font-weight: bold;">રામાધણી એન્ટરપ્રાઇઝ</h1>
                    <p style="font-size: 12px; color: #000; margin: 4px 0;">GST: 24BOFPC2636N1ZZ</p>
                    <p style="font-size: 11px; color: #000; margin: 4px 0;">ફોન: 9687276849 | માલિક: Raghuvirsinh Chauhan</p>
                </div>

                <h2 style="font-size: 18px; color: #000; margin-bottom: 15px; font-weight: bold;">સંયુક્ત વેચાણ બિલ</h2>

                <div style="margin-bottom: 15px; font-size: 13px;">
                    <p style="margin: 4px 0;"><strong>બિલ નંબર:</strong> ${escapeHtml(entry.id)}</p>
                    <p style="margin: 4px 0;"><strong>તારીખ:</strong> ${dateStr}</p>
                    <p style="margin: 4px 0;"><strong>બનાવ્યું:</strong> ${new Date(entry.createdAt).toLocaleString('gu-IN')}</p>
                </div>

                <h3 style="font-size: 16px; color: #000; margin: 20px 0 10px 0; font-weight: bold;">કિસાનોની વિગતો</h3>

                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 22%;">કિસાન</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">બોરી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભરતી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">કડ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 12%;">મણ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભાવ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 16%;">કુલ હિસાબ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${farmersRows}
                    </tbody>
                </table>

                <div style="margin-top: 25px; border: 2px solid #000; padding: 15px;">
                    <h3 style="font-size: 16px; margin: 0 0 12px 0; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 8px;">આર્થિક સારાંશ</h3>
                    
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; border-bottom: 1px solid #ddd;"><strong>કુલ રકમ (વેચાણ):</strong></td>
                            <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #ddd;">₹ ${Number(entry.kulRakam).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; border-bottom: 1px solid #ddd;"><strong>ખેડૂતને આપવામાં આવેલ:</strong></td>
                            <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #ddd;">₹ ${Number(entry.totalHisaab).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; border-bottom: 1px solid #ddd;"><strong>કુલ ખર્ચ:</strong></td>
                            <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #ddd;">₹ ${Number(entry.totalKharch).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 15px;"><strong>નફો / નુકસાન:</strong></td>
                            <td style="padding: 10px 0; text-align: right; font-size: 15px; font-weight: bold; color: ${entry.profitOrLoss >= 0 ? '#006400' : '#8B0000'};">
                                ₹ ${Number(entry.profitOrLoss).toFixed(2)}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #000; text-align: center; font-size: 10px; color: #000;">
                    <p style="margin: 4px 0;">આ બિલ સૃષ્ટ: ${new Date().toLocaleString('gu-IN')}</p>
                    <p style="margin: 4px 0;">રામાધણી એન્ટરપ્રાઇઝ વ્યવસ્થાપન સિસ્ટમ દ્વારા</p>
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
        const filename = `SellTogether_Bill_${entry.id}_${timestamp}.pdf`;

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

async function printInvoice(entryId) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
        alert('પ્રવેશની માહિતી મળી નથી');
        return;
    }

    try {
        const dateStr = new Date().toLocaleDateString('gu-IN');

        // Build farmers rows
        const farmersRows = (entry.farmerIds || []).map(id => {
            const f = farmers[id];
            if (!f) return '';
            return `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px;">${escapeHtml(f.name)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.bori).toFixed(0)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.bharti).toFixed(0)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.kad).toFixed(0)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.man).toFixed(2)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${Number(f.bhav).toFixed(2)}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹ ${Number(f.totalHisaab).toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // Create HTML content for invoice
        const invoiceHTML = `
            <div style="font-family: 'Noto Sans Gujarati', Arial, sans-serif; padding: 20px; width: 190mm; background: white; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 12px;">
                    <h1 style="font-size: 24px; color: #000; margin: 0 0 8px 0; font-weight: bold;">રામાધણી એન્ટરપ્રાઇઝ</h1>
                    <p style="font-size: 12px; color: #000; margin: 4px 0;">GST: 24BOFPC2636N1ZZ</p>
                    <p style="font-size: 11px; color: #000; margin: 4px 0;">ફોન: 9687276849 | માલિક: Raghuvirsinh Chauhan</p>
                </div>

                <h2 style="font-size: 18px; color: #000; margin-bottom: 15px; font-weight: bold;">સંયુક્ત વેચાણ બિલ</h2>

                <div style="margin-bottom: 15px; font-size: 13px;">
                    <p style="margin: 4px 0;"><strong>બિલ નંબર:</strong> ${escapeHtml(entry.id)}</p>
                    <p style="margin: 4px 0;"><strong>તારીખ:</strong> ${dateStr}</p>
                    <p style="margin: 4px 0;"><strong>બનાવ્યું:</strong> ${new Date(entry.createdAt).toLocaleString('gu-IN')}</p>
                </div>

                <h3 style="font-size: 16px; color: #000; margin: 20px 0 10px 0; font-weight: bold;">કિસાનોની વિગતો</h3>

                <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 22%;">કિસાન</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">બોરી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભરતી</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">કડ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 12%;">મણ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 10%;">ભાવ</th>
                            <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 16%;">કુલ હિસાબ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${farmersRows}
                    </tbody>
                </table>

                <div style="margin-top: 25px; border: 2px solid #000; padding: 15px;">
                    <h3 style="font-size: 16px; margin: 0 0 12px 0; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 8px;">આર્થિક સારાંશ</h3>
                    
                    <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; border-bottom: 1px solid #ddd;"><strong>કુલ રકમ (વેચાણ):</strong></td>
                            <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #ddd;">₹ ${Number(entry.kulRakam).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; border-bottom: 1px solid #ddd;"><strong>ખેડૂતને આપવામાં આવેલ:</strong></td>
                            <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #ddd;">₹ ${Number(entry.totalHisaab).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; border-bottom: 1px solid #ddd;"><strong>કુલ ખર્ચ:</strong></td>
                            <td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #ddd;">₹ ${Number(entry.totalKharch).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 15px;"><strong>નફો / નુકસાન:</strong></td>
                            <td style="padding: 10px 0; text-align: right; font-size: 15px; font-weight: bold; color: ${entry.profitOrLoss >= 0 ? '#006400' : '#8B0000'};">
                                ₹ ${Number(entry.profitOrLoss).toFixed(2)}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #000; text-align: center; font-size: 10px; color: #000;">
                    <p style="margin: 4px 0;">આ બિલ સૃષ્ટ: ${new Date().toLocaleString('gu-IN')}</p>
                    <p style="margin: 4px 0;">રામાધણી એન્ટરપ્રાઇઝ વ્યવસ્થાપન સિસ્ટમ દ્વારા</p>
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

        // Wrap the invoice HTML in a basic document structure
        const printDocumentHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Joint Bill</title>
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

function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}