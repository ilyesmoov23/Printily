/**
 * إدارة الطلبات
 */

/**
 * تحميل الطلبات
 */
async function loadOrders() {
    try {
        // تحميل القوائم المنسدلة
        await loadOrderSelects();
        
        // تحميل جدول الطلبات
        await refreshOrdersTable();
        
        // تهيئة الفلاتر
        initOrderFilters();
    } catch (error) {
        console.error('خطأ في تحميل الطلبات:', error);
        showToast('حدث خطأ في تحميل الطلبات', 'error');
    }
}

/**
 * تحميل القوائم المنسدلة للطلبات
 */
async function loadOrderSelects() {
    // تحميل العملاء
    const clients = await DB.getAll(DB.STORES.clients);
    const clientSelect = document.getElementById('orderClient');
    
    clientSelect.innerHTML = '<option value="">اختر العميل</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name || client.phone || `عميل #${client.id}`;
        clientSelect.appendChild(option);
    });
    
    // تحميل الخدمات
    const services = await DB.getAll(DB.STORES.services);
    const serviceSelect = document.getElementById('orderService');
    const serviceFilter = document.getElementById('orderServiceFilter');
    
    serviceSelect.innerHTML = '<option value="">اختر الخدمة</option>';
    serviceFilter.innerHTML = '<option value="">كل الخدمات</option>';
    
    services.forEach(service => {
        const option1 = document.createElement('option');
        option1.value = service.name;
        option1.textContent = service.name;
        serviceSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = service.name;
        option2.textContent = service.name;
        serviceFilter.appendChild(option2);
    });
    
    // تحميل الطلبات للربط بالمهام
    const orders = await DB.getAll(DB.STORES.orders);
    const taskOrderSelect = document.getElementById('taskOrderId');
    if (taskOrderSelect) {
        taskOrderSelect.innerHTML = '<option value="">بدون ربط</option>';
        orders.filter(o => o.status !== 'delivered').forEach(order => {
            const option = document.createElement('option');
            option.value = order.id;
            option.textContent = `#${order.id} - ${order.service}`;
            taskOrderSelect.appendChild(option);
        });
    }
}

/**
 * تحديث جدول الطلبات
 */
async function refreshOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    const orders = await DB.getAll(DB.STORES.orders);
    const clients = await DB.getAll(DB.STORES.clients);
    
    // تطبيق الفلاتر
    const searchQuery = document.getElementById('ordersSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
    const serviceFilter = document.getElementById('orderServiceFilter')?.value || '';
    const dateFilter = document.getElementById('orderDateFilter')?.value || '';
    
    let filteredOrders = orders;
    
    if (searchQuery) {
        filteredOrders = filteredOrders.filter(order => {
            const client = clients.find(c => c.id === order.clientId);
            return (
                order.service?.toLowerCase().includes(searchQuery) ||
                order.notes?.toLowerCase().includes(searchQuery) ||
                client?.name?.toLowerCase().includes(searchQuery) ||
                client?.phone?.includes(searchQuery) ||
                String(order.id).includes(searchQuery)
            );
        });
    }
    
    if (statusFilter) {
        filteredOrders = filteredOrders.filter(o => o.status === statusFilter);
    }
    
    if (serviceFilter) {
        filteredOrders = filteredOrders.filter(o => o.service === serviceFilter);
    }
    
    if (dateFilter) {
        filteredOrders = filteredOrders.filter(o => 
            o.orderDate?.split('T')[0] === dateFilter ||
            o.deliveryDate?.split('T')[0] === dateFilter
        );
    }
    
    // ترتيب حسب تاريخ الإنشاء (الأحدث أولاً)
    filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>لا توجد طلبات</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredOrders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${client?.name || 'غير معروف'}</td>
                <td>${order.service || '-'}</td>
                <td>${order.quantity || '-'}</td>
                <td>${formatCurrency(order.price || 0)}</td>
                <td>${order.deliveryDate ? formatDate(order.deliveryDate) : '-'}</td>
                <td><span class="status-badge ${order.status}">${getStatusText(order.status)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" onclick="viewOrder(${order.id})" title="عرض">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editOrder(${order.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn print" onclick="printOrderInvoice(${order.id})" title="طباعة فاتورة">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteOrder(${order.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * تهيئة فلاتر الطلبات
 */
function initOrderFilters() {
    document.getElementById('ordersSearch')?.addEventListener('input', debounce(refreshOrdersTable, 300));
    document.getElementById('orderStatusFilter')?.addEventListener('change', refreshOrdersTable);
    document.getElementById('orderServiceFilter')?.addEventListener('change', refreshOrdersTable);
    document.getElementById('orderDateFilter')?.addEventListener('change', refreshOrdersTable);
}

/**
 * عرض نافذة إضافة طلب
 */
async function showOrderModal(orderId = null) {
    document.getElementById('orderModalTitle').textContent = orderId ? 'تعديل الطلب' : 'طلب جديد';
    document.getElementById('orderId').value = orderId || '';
    
    // إعادة تحميل القوائم
    await loadOrderSelects();
    
    if (orderId) {
        const order = await DB.get(DB.STORES.orders, orderId);
        if (order) {
            document.getElementById('orderClient').value = order.clientId || '';
            document.getElementById('orderService').value = order.service || '';
            document.getElementById('orderQuantity').value = order.quantity || '';
            document.getElementById('orderPrice').value = order.price || '';
            document.getElementById('orderDate').value = order.orderDate?.split('T')[0] || '';
            document.getElementById('orderDeliveryDate').value = order.deliveryDate?.split('T')[0] || '';
            document.getElementById('orderStatus').value = order.status || 'pending';
            document.getElementById('orderNotes').value = order.notes || '';
        }
    } else {
        // تعيين القيم الافتراضية
        document.getElementById('orderForm').reset();
        document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('orderStatus').value = 'pending';
    }
    
    openModal('orderModal');
}

/**
 * حفظ الطلب
 */
async function saveOrder() {
    const id = document.getElementById('orderId').value;
    
    const orderData = {
        clientId: parseInt(document.getElementById('orderClient').value) || null,
        service: document.getElementById('orderService').value,
        quantity: parseFloat(document.getElementById('orderQuantity').value) || 0,
        price: parseFloat(document.getElementById('orderPrice').value) || 0,
        orderDate: document.getElementById('orderDate').value,
        deliveryDate: document.getElementById('orderDeliveryDate').value,
        status: document.getElementById('orderStatus').value,
        notes: document.getElementById('orderNotes').value
    };
    
    // التحقق من البيانات
    if (!orderData.service) {
        showToast('اختر نوع الخدمة', 'warning');
        return;
    }
    
    if (!orderData.quantity || orderData.quantity <= 0) {
        showToast('أدخل الكمية', 'warning');
        return;
    }
    
    try {
        if (id) {
            // تحديث طلب موجود
            const existingOrder = await DB.get(DB.STORES.orders, parseInt(id));
            orderData.id = parseInt(id);
            orderData.createdAt = existingOrder.createdAt;
            await DB.update(DB.STORES.orders, orderData);
            showToast('تم تحديث الطلب بنجاح', 'success');
        } else {
            // إضافة طلب جديد
            await DB.add(DB.STORES.orders, orderData);
            showToast('تم إضافة الطلب بنجاح', 'success');
        }
        
        closeModal('orderModal');
        await refreshOrdersTable();
        await loadDashboard();
    } catch (error) {
        console.error('خطأ في حفظ الطلب:', error);
        showToast('حدث خطأ في حفظ الطلب', 'error');
    }
}

/**
 * تعديل طلب
 */
async function editOrder(id) {
    await showOrderModal(id);
}

/**
 * عرض تفاصيل الطلب
 */
async function viewOrder(id) {
    const order = await DB.get(DB.STORES.orders, id);
    if (!order) {
        showToast('الطلب غير موجود', 'error');
        return;
    }
    
    const clients = await DB.getAll(DB.STORES.clients);
    const client = clients.find(c => c.id === order.clientId);
    
    const content = `
        <div class="order-details">
            <div class="detail-group">
                <label>رقم الطلب:</label>
                <span>#${order.id}</span>
            </div>
            <div class="detail-group">
                <label>العميل:</label>
                <span>${client?.name || 'غير معروف'}</span>
            </div>
            <div class="detail-group">
                <label>الخدمة:</label>
                <span>${order.service}</span>
            </div>
            <div class="detail-group">
                <label>الكمية:</label>
                <span>${order.quantity}</span>
            </div>
            <div class="detail-group">
                <label>السعر:</label>
                <span>${formatCurrency(order.price)}</span>
            </div>
            <div class="detail-group">
                <label>تاريخ الطلب:</label>
                <span>${formatDate(order.orderDate)}</span>
            </div>
            <div class="detail-group">
                <label>تاريخ التسليم:</label>
                <span>${formatDate(order.deliveryDate)}</span>
            </div>
            <div class="detail-group">
                <label>الحالة:</label>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
            ${order.notes ? `
            <div class="detail-group">
                <label>الملاحظات:</label>
                <span>${order.notes}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('invoiceContent').innerHTML = content;
    document.getElementById('invoiceModal').querySelector('.modal-header h2').textContent = 'تفاصيل الطلب';
    document.getElementById('invoiceModal').querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('invoiceModal')">إغلاق</button>
        <button class="btn btn-primary" onclick="editOrder(${id}); closeModal('invoiceModal');">
            <i class="fas fa-edit"></i> تعديل
        </button>
    `;
    openModal('invoiceModal');
}

/**
 * حذف طلب
 */
async function deleteOrder(id) {
    if (!confirm('هل تريد حذف هذا الطلب؟')) return;
    
    try {
        await DB.delete(DB.STORES.orders, id);
        showToast('تم حذف الطلب', 'success');
        await refreshOrdersTable();
        await loadDashboard();
    } catch (error) {
        showToast('حدث خطأ في حذف الطلب', 'error');
    }
}

/**
 * طباعة فاتورة الطلب
 */
async function printOrderInvoice(id) {
    await generateInvoice(id);
}

// تصدير الدوال
window.loadOrders = loadOrders;
window.showOrderModal = showOrderModal;
window.saveOrder = saveOrder;
window.editOrder = editOrder;
window.viewOrder = viewOrder;
window.deleteOrder = deleteOrder;
window.printOrderInvoice = printOrderInvoice;
window.refreshOrdersTable = refreshOrdersTable;
