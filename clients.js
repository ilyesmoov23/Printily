/**
 * إدارة العملاء
 */

/**
 * تحميل العملاء
 */
async function loadClients() {
    try {
        await refreshClientsGrid();
        initClientFilters();
    } catch (error) {
        console.error('خطأ في تحميل العملاء:', error);
        showToast('حدث خطأ في تحميل العملاء', 'error');
    }
}

/**
 * تحديث شبكة العملاء
 */
async function refreshClientsGrid() {
    const container = document.getElementById('clientsGrid');
    const clients = await DB.getAll(DB.STORES.clients);
    const orders = await DB.getAll(DB.STORES.orders);
    
    // تطبيق الفلاتر
    const searchQuery = document.getElementById('clientsSearch')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('clientTypeFilter')?.value || '';
    
    let filteredClients = clients;
    
    if (searchQuery) {
        filteredClients = filteredClients.filter(client => 
            client.name?.toLowerCase().includes(searchQuery) ||
            client.phone?.includes(searchQuery) ||
            client.email?.toLowerCase().includes(searchQuery) ||
            client.address?.toLowerCase().includes(searchQuery)
        );
    }
    
    if (typeFilter) {
        filteredClients = filteredClients.filter(c => c.type === typeFilter);
    }
    
    if (filteredClients.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-users"></i>
                <p>لا يوجد عملاء</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredClients.map(client => {
        // حساب عدد الطلبات وإجمالي المشتريات
        const clientOrders = orders.filter(o => o.clientId === client.id);
        const totalSpent = clientOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
        
        return `
            <div class="contact-card">
                <div class="contact-card-header">
                    <div class="contact-info">
                        <h3>${client.name || 'بدون اسم'}</h3>
                        <p>${client.type ? getClientTypeText(client.type) : 'غير مصنف'}</p>
                    </div>
                    <span class="status-badge ${client.type || 'pending'}">${getClientTypeText(client.type)}</span>
                </div>
                <div class="contact-card-body">
                    ${client.phone ? `<p><i class="fas fa-phone"></i> ${client.phone}</p>` : ''}
                    ${client.email ? `<p><i class="fas fa-envelope"></i> ${client.email}</p>` : ''}
                    ${client.address ? `<p><i class="fas fa-map-marker-alt"></i> ${client.address}</p>` : ''}
                    <p><i class="fas fa-shopping-cart"></i> ${clientOrders.length} طلبات</p>
                    <p><i class="fas fa-money-bill"></i> إجمالي: ${formatCurrency(totalSpent)}</p>
                </div>
                <div class="contact-card-footer">
                    <button class="action-btn view" onclick="showClientHistory(${client.id})" title="سجل الطلبات">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="action-btn edit" onclick="editClient(${client.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteClient(${client.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * تهيئة فلاتر العملاء
 */
function initClientFilters() {
    document.getElementById('clientsSearch')?.addEventListener('input', debounce(refreshClientsGrid, 300));
    document.getElementById('clientTypeFilter')?.addEventListener('change', refreshClientsGrid);
}

/**
 * عرض نافذة إضافة عميل
 */
async function showClientModal(clientId = null) {
    document.getElementById('clientModalTitle').textContent = clientId ? 'تعديل العميل' : 'عميل جديد';
    document.getElementById('clientId').value = clientId || '';
    
    if (clientId) {
        const client = await DB.get(DB.STORES.clients, clientId);
        if (client) {
            document.getElementById('clientName').value = client.name || '';
            document.getElementById('clientPhone').value = client.phone || '';
            document.getElementById('clientEmail').value = client.email || '';
            document.getElementById('clientAddress').value = client.address || '';
            document.getElementById('clientType').value = client.type || '';
            document.getElementById('clientNotes').value = client.notes || '';
        }
    } else {
        document.getElementById('clientForm').reset();
    }
    
    openModal('clientModal');
}

/**
 * حفظ العميل
 */
async function saveClient() {
    const id = document.getElementById('clientId').value;
    
    const clientData = {
        name: document.getElementById('clientName').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        address: document.getElementById('clientAddress').value.trim(),
        type: document.getElementById('clientType').value,
        notes: document.getElementById('clientNotes').value
    };
    
    // التحقق من وجود اسم أو هاتف على الأقل
    if (!clientData.name && !clientData.phone) {
        showToast('أدخل اسم العميل أو رقم الهاتف', 'warning');
        return;
    }
    
    try {
        if (id) {
            const existingClient = await DB.get(DB.STORES.clients, parseInt(id));
            clientData.id = parseInt(id);
            clientData.createdAt = existingClient.createdAt;
            await DB.update(DB.STORES.clients, clientData);
            showToast('تم تحديث العميل بنجاح', 'success');
        } else {
            await DB.add(DB.STORES.clients, clientData);
            showToast('تم إضافة العميل بنجاح', 'success');
        }
        
        closeModal('clientModal');
        await refreshClientsGrid();
        await loadDashboard();
    } catch (error) {
        console.error('خطأ في حفظ العميل:', error);
        showToast('حدث خطأ في حفظ العميل', 'error');
    }
}

/**
 * تعديل عميل
 */
async function editClient(id) {
    await showClientModal(id);
}

/**
 * حذف عميل
 */
async function deleteClient(id) {
    if (!confirm('هل تريد حذف هذا العميل؟')) return;
    
    try {
        await DB.delete(DB.STORES.clients, id);
        showToast('تم حذف العميل', 'success');
        await refreshClientsGrid();
        await loadDashboard();
    } catch (error) {
        showToast('حدث خطأ في حذف العميل', 'error');
    }
}

/**
 * عرض سجل العميل
 */
async function showClientHistory(clientId) {
    const client = await DB.get(DB.STORES.clients, clientId);
    const orders = await DB.getAll(DB.STORES.orders);
    const notes = await DB.getAll(DB.STORES.notes);
    
    const clientOrders = orders.filter(o => o.clientId === clientId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const clientNotes = notes.filter(n => n.linkType === 'client' && n.linkId === clientId);
    
    const totalSpent = clientOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
    const deliveredOrders = clientOrders.filter(o => o.status === 'delivered').length;
    
    const content = `
        <div class="client-summary">
            <h3><i class="fas fa-user"></i> ${client.name || 'بدون اسم'}</h3>
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="stat-value">${clientOrders.length}</span>
                    <span class="stat-label">إجمالي الطلبات</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value">${deliveredOrders}</span>
                    <span class="stat-label">طلبات مسلمة</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value">${formatCurrency(totalSpent)}</span>
                    <span class="stat-label">إجمالي المشتريات</span>
                </div>
            </div>
        </div>
        
        <div class="day-details-section">
            <h3><i class="fas fa-shopping-cart"></i> سجل الطلبات</h3>
            ${clientOrders.length > 0 ? `
                <div class="day-details-list">
                    ${clientOrders.map(order => `
                        <div class="day-details-item">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span><strong>#${order.id}</strong> - ${order.service}</span>
                                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; color: var(--gray-500); font-size: 0.8rem;">
                                <span>${formatDate(order.orderDate)}</span>
                                <span>${formatCurrency(order.price)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="empty-state">لا توجد طلبات</p>'}
        </div>
        
        ${clientNotes.length > 0 ? `
            <div class="day-details-section">
                <h3><i class="fas fa-sticky-note"></i> الملاحظات المرتبطة</h3>
                <div class="day-details-list">
                    ${clientNotes.map(note => `
                        <div class="day-details-item">
                            <strong>${note.title || 'بدون عنوان'}</strong>
                            <p style="margin-top: 0.25rem; color: var(--gray-500);">${note.content?.substring(0, 100) || ''}...</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    document.getElementById('clientHistoryTitle').textContent = `سجل العميل: ${client.name || client.phone || 'غير معروف'}`;
    document.getElementById('clientHistoryContent').innerHTML = content;
    openModal('clientHistoryModal');
}

// تصدير الدوال
window.loadClients = loadClients;
window.showClientModal = showClientModal;
window.saveClient = saveClient;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.showClientHistory = showClientHistory;
window.refreshClientsGrid = refreshClientsGrid;
