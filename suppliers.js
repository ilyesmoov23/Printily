/**
 * إدارة الموردين
 */

/**
 * تحميل الموردين
 */
async function loadSuppliers() {
    try {
        await refreshSuppliersGrid();
        initSupplierFilters();
    } catch (error) {
        console.error('خطأ في تحميل الموردين:', error);
        showToast('حدث خطأ في تحميل الموردين', 'error');
    }
}

/**
 * تحديث شبكة الموردين
 */
async function refreshSuppliersGrid() {
    const container = document.getElementById('suppliersGrid');
    const suppliers = await DB.getAll(DB.STORES.suppliers);
    const purchases = await DB.getAll(DB.STORES.purchases);
    
    // تطبيق الفلتر
    const searchQuery = document.getElementById('suppliersSearch')?.value?.toLowerCase() || '';
    
    let filteredSuppliers = suppliers;
    
    if (searchQuery) {
        filteredSuppliers = filteredSuppliers.filter(supplier => 
            supplier.name?.toLowerCase().includes(searchQuery) ||
            supplier.phone?.includes(searchQuery) ||
            supplier.email?.toLowerCase().includes(searchQuery) ||
            supplier.address?.toLowerCase().includes(searchQuery)
        );
    }
    
    if (filteredSuppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-truck"></i>
                <p>لا يوجد موردين</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredSuppliers.map(supplier => {
        // حساب إجمالي المشتريات
        const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
        const totalPurchases = supplierPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
        
        return `
            <div class="contact-card">
                <div class="contact-card-header">
                    <div class="contact-info">
                        <h3>${supplier.name || 'بدون اسم'}</h3>
                        <p>مورد</p>
                    </div>
                </div>
                <div class="contact-card-body">
                    ${supplier.phone ? `<p><i class="fas fa-phone"></i> ${supplier.phone}</p>` : ''}
                    ${supplier.email ? `<p><i class="fas fa-envelope"></i> ${supplier.email}</p>` : ''}
                    ${supplier.address ? `<p><i class="fas fa-map-marker-alt"></i> ${supplier.address}</p>` : ''}
                    <p><i class="fas fa-shopping-bag"></i> ${supplierPurchases.length} عمليات شراء</p>
                    <p><i class="fas fa-money-bill"></i> إجمالي: ${formatCurrency(totalPurchases)}</p>
                </div>
                <div class="contact-card-footer">
                    <button class="action-btn view" onclick="showSupplierHistory(${supplier.id})" title="سجل المشتريات">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="action-btn edit" onclick="editSupplier(${supplier.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteSupplier(${supplier.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * تهيئة فلاتر الموردين
 */
function initSupplierFilters() {
    document.getElementById('suppliersSearch')?.addEventListener('input', debounce(refreshSuppliersGrid, 300));
}

/**
 * عرض نافذة إضافة مورد
 */
async function showSupplierModal(supplierId = null) {
    document.getElementById('supplierModalTitle').textContent = supplierId ? 'تعديل المورد' : 'إضافة مورد';
    document.getElementById('supplierId').value = supplierId || '';
    
    if (supplierId) {
        const supplier = await DB.get(DB.STORES.suppliers, supplierId);
        if (supplier) {
            document.getElementById('supplierName').value = supplier.name || '';
            document.getElementById('supplierPhone').value = supplier.phone || '';
            document.getElementById('supplierEmail').value = supplier.email || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierNotes').value = supplier.notes || '';
        }
    } else {
        document.getElementById('supplierForm').reset();
    }
    
    openModal('supplierModal');
}

/**
 * حفظ المورد
 */
async function saveSupplier() {
    const id = document.getElementById('supplierId').value;
    
    const supplierData = {
        name: document.getElementById('supplierName').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        address: document.getElementById('supplierAddress').value.trim(),
        notes: document.getElementById('supplierNotes').value
    };
    
    // التحقق من وجود اسم أو هاتف
    if (!supplierData.name && !supplierData.phone) {
        showToast('أدخل اسم المورد أو رقم الهاتف', 'warning');
        return;
    }
    
    try {
        if (id) {
            const existingSupplier = await DB.get(DB.STORES.suppliers, parseInt(id));
            supplierData.id = parseInt(id);
            supplierData.createdAt = existingSupplier.createdAt;
            await DB.update(DB.STORES.suppliers, supplierData);
            showToast('تم تحديث المورد بنجاح', 'success');
        } else {
            await DB.add(DB.STORES.suppliers, supplierData);
            showToast('تم إضافة المورد بنجاح', 'success');
        }
        
        closeModal('supplierModal');
        await refreshSuppliersGrid();
        await loadInventorySelects();
    } catch (error) {
        console.error('خطأ في حفظ المورد:', error);
        showToast('حدث خطأ في حفظ المورد', 'error');
    }
}

/**
 * تعديل مورد
 */
async function editSupplier(id) {
    await showSupplierModal(id);
}

/**
 * حذف مورد
 */
async function deleteSupplier(id) {
    if (!confirm('هل تريد حذف هذا المورد؟')) return;
    
    try {
        await DB.delete(DB.STORES.suppliers, id);
        showToast('تم حذف المورد', 'success');
        await refreshSuppliersGrid();
    } catch (error) {
        showToast('حدث خطأ في حذف المورد', 'error');
    }
}

/**
 * عرض سجل المورد
 */
async function showSupplierHistory(supplierId) {
    const supplier = await DB.get(DB.STORES.suppliers, supplierId);
    const purchases = await DB.getAll(DB.STORES.purchases);
    const materials = await DB.getAll(DB.STORES.materials);
    
    const supplierPurchases = purchases.filter(p => p.supplierId === supplierId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const totalPurchases = supplierPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
    
    const content = `
        <div class="client-summary">
            <h3><i class="fas fa-truck"></i> ${supplier.name || 'بدون اسم'}</h3>
            <div class="summary-stats">
                <div class="summary-stat">
                    <span class="stat-value">${supplierPurchases.length}</span>
                    <span class="stat-label">عمليات الشراء</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value">${formatCurrency(totalPurchases)}</span>
                    <span class="stat-label">إجمالي المشتريات</span>
                </div>
            </div>
        </div>
        
        <div class="day-details-section">
            <h3><i class="fas fa-shopping-bag"></i> سجل المشتريات</h3>
            ${supplierPurchases.length > 0 ? `
                <table class="data-table" style="font-size: 0.875rem;">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المادة</th>
                            <th>الكمية</th>
                            <th>سعر الوحدة</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${supplierPurchases.map(purchase => {
                            const material = materials.find(m => m.id === purchase.materialId);
                            return `
                                <tr>
                                    <td>${formatDate(purchase.date)}</td>
                                    <td>${material?.name || 'غير معروف'}</td>
                                    <td>${purchase.quantity}</td>
                                    <td>${formatCurrency(purchase.unitPrice)}</td>
                                    <td>${formatCurrency(purchase.total)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            ` : '<p class="empty-state">لا توجد عمليات شراء</p>'}
        </div>
    `;
    
    document.getElementById('supplierHistoryTitle').textContent = `سجل المورد: ${supplier.name || 'غير معروف'}`;
    document.getElementById('supplierHistoryContent').innerHTML = content;
    openModal('supplierHistoryModal');
}

// تصدير الدوال
window.loadSuppliers = loadSuppliers;
window.showSupplierModal = showSupplierModal;
window.saveSupplier = saveSupplier;
window.editSupplier = editSupplier;
window.deleteSupplier = deleteSupplier;
window.showSupplierHistory = showSupplierHistory;
window.refreshSuppliersGrid = refreshSuppliersGrid;
