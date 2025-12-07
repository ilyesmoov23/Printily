/**
 * إدارة الطباعة والفواتير
 */

/**
 * إنشاء فاتورة
 */
async function generateInvoice(orderId) {
    try {
        const order = await DB.get(DB.STORES.orders, orderId);
        if (!order) {
            showToast('الطلب غير موجود', 'error');
            return;
        }
        
        const clients = await DB.getAll(DB.STORES.clients);
        const client = clients.find(c => c.id === order.clientId);
        
        // الحصول على معلومات المطبعة
        const shopName = await DB.getSetting('shopName') || 'المطبعة';
        const shopAddress = await DB.getSetting('shopAddress') || '';
        const shopPhone = await DB.getSetting('shopPhone') || '';
        const shopEmail = await DB.getSetting('shopEmail') || '';
        
        const invoiceNumber = `INV-${order.id}-${Date.now().toString(36).toUpperCase()}`;
        
        const invoiceHTML = `
            <div class="invoice" id="invoicePrint">
                <div class="invoice-header">
                    <h1>${shopName}</h1>
                    <p>${shopAddress}</p>
                    <p>${shopPhone ? 'هاتف: ' + shopPhone : ''} ${shopEmail ? '| ' + shopEmail : ''}</p>
                </div>
                
                <div style="text-align: center; margin: 1.5rem 0; padding: 1rem; background: var(--gray-50); border-radius: var(--radius);">
                    <h2 style="color: var(--primary-dark); margin-bottom: 0.5rem;">فاتورة</h2>
                    <p style="color: var(--gray-500);">رقم: ${invoiceNumber}</p>
                </div>
                
                <div class="invoice-details">
                    <div>
                        <h3>معلومات العميل</h3>
                        <p><strong>${client?.name || 'عميل'}</strong></p>
                        ${client?.phone ? `<p>هاتف: ${client.phone}</p>` : ''}
                        ${client?.address ? `<p>العنوان: ${client.address}</p>` : ''}
                    </div>
                    <div>
                        <h3>معلومات الطلب</h3>
                        <p>رقم الطلب: #${order.id}</p>
                        <p>تاريخ الطلب: ${formatDate(order.orderDate)}</p>
                        <p>تاريخ التسليم: ${formatDate(order.deliveryDate)}</p>
                        <p>الحالة: ${getStatusText(order.status)}</p>
                    </div>
                </div>
                
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>الخدمة</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${order.service || '-'}</td>
                            <td>${order.quantity || '-'}</td>
                            <td>${formatCurrency(order.price / order.quantity || order.price)}</td>
                            <td>${formatCurrency(order.price)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="invoice-total">
                    <p style="font-size: 1.5rem;">الإجمالي: <strong>${formatCurrency(order.price)}</strong></p>
                </div>
                
                ${order.notes ? `
                    <div style="padding: 1rem; background: var(--gray-50); border-radius: var(--radius); margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.875rem; color: var(--gray-600); margin-bottom: 0.5rem;">ملاحظات:</h3>
                        <p style="font-size: 0.875rem;">${order.notes}</p>
                    </div>
                ` : ''}
                
                <div class="invoice-footer">
                    <p>شكراً لتعاملكم معنا</p>
                    <p style="font-size: 0.75rem; margin-top: 0.5rem;">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}</p>
                </div>
            </div>
        `;
        
        document.getElementById('invoiceContent').innerHTML = invoiceHTML;
        document.getElementById('invoiceModal').querySelector('.modal-header h2').textContent = 'الفاتورة';
        document.getElementById('invoiceModal').querySelector('.modal-footer').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('invoiceModal')">إغلاق</button>
            <button class="btn btn-primary" onclick="printInvoice()">
                <i class="fas fa-print"></i> طباعة
            </button>
        `;
        
        openModal('invoiceModal');
        
    } catch (error) {
        console.error('خطأ في إنشاء الفاتورة:', error);
        showToast('حدث خطأ في إنشاء الفاتورة', 'error');
    }
}

/**
 * طباعة الفاتورة
 */
function printInvoice() {
    const printContent = document.getElementById('invoiceContent').innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Tajawal', sans-serif;
                    padding: 20px;
                    direction: rtl;
                    color: #1e293b;
                }
                .invoice {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .invoice-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #e2e8f0;
                }
                .invoice-header h1 {
                    font-size: 24px;
                    color: #1a365d;
                    margin-bottom: 5px;
                }
                .invoice-header p {
                    font-size: 12px;
                    color: #64748b;
                }
                .invoice-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .invoice-details h3 {
                    font-size: 12px;
                    color: #64748b;
                    margin-bottom: 8px;
                }
                .invoice-details p {
                    font-size: 13px;
                    margin-bottom: 4px;
                }
                .invoice-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                .invoice-table th,
                .invoice-table td {
                    padding: 10px;
                    text-align: right;
                    border-bottom: 1px solid #e2e8f0;
                }
                .invoice-table th {
                    background-color: #f8fafc;
                    font-weight: 600;
                    font-size: 12px;
                    color: #475569;
                }
                .invoice-total {
                    text-align: left;
                    margin-bottom: 20px;
                    padding: 15px;
                    background-color: #f8fafc;
                    border-radius: 8px;
                }
                .invoice-footer {
                    text-align: center;
                    padding-top: 15px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 13px;
                }
                @media print {
                    body { padding: 0; }
                    .invoice { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${printContent}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

/**
 * إنشاء إيصال استلام
 */
async function generateReceipt(orderId) {
    try {
        const order = await DB.get(DB.STORES.orders, orderId);
        if (!order) {
            showToast('الطلب غير موجود', 'error');
            return;
        }
        
        const clients = await DB.getAll(DB.STORES.clients);
        const client = clients.find(c => c.id === order.clientId);
        
        const shopName = await DB.getSetting('shopName') || 'المطبعة';
        
        const receiptHTML = `
            <div class="invoice" id="receiptPrint">
                <div class="invoice-header">
                    <h1>${shopName}</h1>
                    <h2 style="color: var(--success); margin-top: 1rem;">إيصال استلام</h2>
                </div>
                
                <div style="padding: 1.5rem 0;">
                    <p style="margin-bottom: 0.75rem;"><strong>رقم الطلب:</strong> #${order.id}</p>
                    <p style="margin-bottom: 0.75rem;"><strong>العميل:</strong> ${client?.name || 'غير معروف'}</p>
                    <p style="margin-bottom: 0.75rem;"><strong>الخدمة:</strong> ${order.service}</p>
                    <p style="margin-bottom: 0.75rem;"><strong>الكمية:</strong> ${order.quantity}</p>
                    <p style="margin-bottom: 0.75rem;"><strong>المبلغ المدفوع:</strong> ${formatCurrency(order.price)}</p>
                    <p style="margin-bottom: 0.75rem;"><strong>تاريخ التسليم:</strong> ${formatDate(order.deliveryDate)}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem; padding-top: 1rem; border-top: 1px dashed var(--gray-300);">
                    <div style="text-align: center;">
                        <p style="margin-bottom: 3rem;">توقيع المُسلِّم</p>
                        <p style="border-top: 1px solid var(--gray-300); padding-top: 0.5rem;">_______________</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="margin-bottom: 3rem;">توقيع المُستلِم</p>
                        <p style="border-top: 1px solid var(--gray-300); padding-top: 0.5rem;">_______________</p>
                    </div>
                </div>
                
                <div class="invoice-footer" style="margin-top: 2rem;">
                    <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}</p>
                </div>
            </div>
        `;
        
        document.getElementById('invoiceContent').innerHTML = receiptHTML;
        document.getElementById('invoiceModal').querySelector('.modal-header h2').textContent = 'إيصال استلام';
        document.getElementById('invoiceModal').querySelector('.modal-footer').innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal('invoiceModal')">إغلاق</button>
            <button class="btn btn-primary" onclick="printInvoice()">
                <i class="fas fa-print"></i> طباعة
            </button>
        `;
        
        openModal('invoiceModal');
        
    } catch (error) {
        console.error('خطأ في إنشاء الإيصال:', error);
        showToast('حدث خطأ في إنشاء الإيصال', 'error');
    }
}

// تصدير الدوال
window.generateInvoice = generateInvoice;
window.printInvoice = printInvoice;
window.generateReceipt = generateReceipt;
