/**
 * إدارة المخزون والمواد الخام
 * مع دعم سعر البيع والوحدات المخصصة
 */

/**
 * تحميل المخزون
 */
async function loadInventory() {
    try {
        await loadInventorySelects();
        await refreshInventoryTable();
        initInventoryFilters();
        initUnitSelectHandler();
    } catch (error) {
        console.error('خطأ في تحميل المخزون:', error);
        showToast('حدث خطأ في تحميل المخزون', 'error');
    }
}

/**
 * تحميل القوائم المنسدلة للمخزون
 */
async function loadInventorySelects() {
    // تحميل المواد لقائمة الشراء
    const materials = await DB.getAll(DB.STORES.materials);
    const materialSelect = document.getElementById('purchaseMaterial');
    
    if (materialSelect) {
        materialSelect.innerHTML = '<option value="">اختر المادة</option>';
        materials.forEach(material => {
            const option = document.createElement('option');
            option.value = material.id;
            option.textContent = `${material.name} (${material.quantity} ${getUnitText(material.customUnit || material.unit)})`;
            materialSelect.appendChild(option);
        });
    }
    
    // تحميل الموردين لقائمة الشراء
    const suppliers = await DB.getAll(DB.STORES.suppliers);
    const supplierSelect = document.getElementById('purchaseSupplier');
    
    if (supplierSelect) {
        supplierSelect.innerHTML = '<option value="">اختر المورد (اختياري)</option>';
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            supplierSelect.appendChild(option);
        });
    }
    
    // تحديث قائمة الوحدات بالوحدات المخصصة
    await updateUnitSelect();
}

/**
 * تحديث قائمة الوحدات
 */
async function updateUnitSelect() {
    const unitSelect = document.getElementById('materialUnit');
    if (!unitSelect) return;
    
    const customUnits = await DB.getSetting('customUnits') || [];
    
    // إضافة الوحدات المخصصة إن وجدت
    customUnits.forEach(unit => {
        // تحقق من عدم وجود الوحدة مسبقاً
        if (!Array.from(unitSelect.options).some(opt => opt.value === unit.key)) {
            const option = document.createElement('option');
            option.value = unit.key;
            option.textContent = unit.name;
            unitSelect.insertBefore(option, unitSelect.querySelector('option[value="custom"]'));
        }
    });
}

/**
 * تهيئة معالج تغيير الوحدة
 */
function initUnitSelectHandler() {
    const unitSelect = document.getElementById('materialUnit');
    const customUnitGroup = document.getElementById('customUnitGroup');
    
    if (unitSelect && customUnitGroup) {
        unitSelect.addEventListener('change', () => {
            if (unitSelect.value === 'custom') {
                customUnitGroup.style.display = 'block';
            } else {
                customUnitGroup.style.display = 'none';
            }
        });
    }
}

/**
 * تحديث جدول المخزون
 */
async function refreshInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    
    const materials = await DB.getAll(DB.STORES.materials);
    
    // تطبيق الفلاتر
    const searchQuery = document.getElementById('inventorySearch')?.value?.toLowerCase() || '';
    const lowStockOnly = document.getElementById('lowStockOnly')?.checked || false;
    const needsCheckOnly = document.getElementById('needsCheckOnly')?.checked || false;
    
    let filteredMaterials = materials;
    
    if (searchQuery) {
        filteredMaterials = filteredMaterials.filter(m => 
            m.name?.toLowerCase().includes(searchQuery) ||
            m.notes?.toLowerCase().includes(searchQuery)
        );
    }
    
    if (lowStockOnly) {
        filteredMaterials = filteredMaterials.filter(m => 
            m.minStock && parseFloat(m.quantity) <= parseFloat(m.minStock)
        );
    }
    
    if (needsCheckOnly) {
        filteredMaterials = filteredMaterials.filter(m => m.needsCheck);
    }
    
    if (filteredMaterials.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-boxes"></i>
                    <p>لا توجد مواد</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredMaterials.map(material => {
        const isLowStock = material.minStock && parseFloat(material.quantity) <= parseFloat(material.minStock);
        const stockStatus = isLowStock ? 'low' : 'ok';
        const unitText = getUnitText(material.customUnit || material.unit);
        const totalValue = (parseFloat(material.quantity) || 0) * (parseFloat(material.price) || 0);
        
        return `
            <tr class="${isLowStock ? 'low-stock-row' : ''}">
                <td>
                    <strong>${material.name}</strong>
                    ${material.needsCheck ? '<i class="fas fa-exclamation-triangle text-warning" title="تحتاج مراجعة"></i>' : ''}
                </td>
                <td>${unitText}</td>
                <td>
                    <span class="${isLowStock ? 'text-danger' : ''}">${material.quantity || 0}</span>
                    ${material.minStock ? `<small class="text-muted">/ ${material.minStock}</small>` : ''}
                </td>
                <td>${material.price ? formatCurrency(material.price) : '-'}</td>
                <td>${material.sellPrice ? formatCurrency(material.sellPrice) : '-'}</td>
                <td>${formatCurrency(totalValue)}</td>
                <td>
                    <span class="status-badge ${stockStatus === 'low' ? 'high' : 'completed'}">
                        ${stockStatus === 'low' ? 'منخفض' : 'جيد'}
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn ${material.needsCheck ? 'warning' : 'success'}" 
                                onclick="toggleNeedsCheck(${material.id})"
                                title="${material.needsCheck ? 'إلغاء علامة المراجعة' : 'تحديد للمراجعة'}">
                            <i class="fas ${material.needsCheck ? 'fa-exclamation-triangle' : 'fa-check'}"></i>
                        </button>
                        <button class="action-btn edit" onclick="editMaterial(${material.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteMaterial(${material.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * تهيئة فلاتر المخزون
 */
function initInventoryFilters() {
    document.getElementById('inventorySearch')?.addEventListener('input', debounce(refreshInventoryTable, 300));
    document.getElementById('lowStockOnly')?.addEventListener('change', refreshInventoryTable);
    document.getElementById('needsCheckOnly')?.addEventListener('change', refreshInventoryTable);
}

/**
 * عرض نافذة إضافة مادة
 */
async function showMaterialModal(materialId = null) {
    document.getElementById('materialModalTitle').textContent = materialId ? 'تعديل المادة' : 'إضافة مادة';
    document.getElementById('materialId').value = materialId || '';
    
    // تحديث قائمة الوحدات
    await updateUnitSelect();
    
    const customUnitGroup = document.getElementById('customUnitGroup');
    
    if (materialId) {
        const material = await DB.get(DB.STORES.materials, materialId);
        if (material) {
            document.getElementById('materialName').value = material.name || '';
            document.getElementById('materialQuantity').value = material.quantity || '';
            document.getElementById('materialPrice').value = material.price || '';
            document.getElementById('materialSellPrice').value = material.sellPrice || '';
            document.getElementById('materialMinStock').value = material.minStock || '';
            document.getElementById('materialNeedsCheck').checked = material.needsCheck || false;
            document.getElementById('materialNotes').value = material.notes || '';
            
            // التعامل مع الوحدة
            if (material.customUnit) {
                // تحقق هل هي وحدة مخصصة
                const unitSelect = document.getElementById('materialUnit');
                const existingOption = Array.from(unitSelect.options).find(opt => opt.value === material.unit);
                if (existingOption) {
                    document.getElementById('materialUnit').value = material.unit;
                    customUnitGroup.style.display = 'none';
                } else {
                    document.getElementById('materialUnit').value = 'custom';
                    document.getElementById('materialCustomUnit').value = material.customUnit;
                    customUnitGroup.style.display = 'block';
                }
            } else {
                document.getElementById('materialUnit').value = material.unit || 'piece';
                customUnitGroup.style.display = 'none';
            }
        }
    } else {
        document.getElementById('materialForm').reset();
        customUnitGroup.style.display = 'none';
    }
    
    openModal('materialModal');
}

/**
 * حفظ المادة
 */
async function saveMaterial() {
    const id = document.getElementById('materialId').value;
    const unitSelect = document.getElementById('materialUnit');
    
    let unit = unitSelect.value;
    let customUnit = null;
    
    // التعامل مع الوحدة المخصصة
    if (unit === 'custom') {
        customUnit = document.getElementById('materialCustomUnit').value.trim();
        if (!customUnit) {
            showToast('أدخل اسم الوحدة المخصصة', 'warning');
            return;
        }
        unit = customUnit; // استخدم اسم الوحدة المخصصة كمفتاح
    }
    
    const materialData = {
        name: document.getElementById('materialName').value.trim(),
        unit: unit,
        customUnit: customUnit,
        quantity: parseFloat(document.getElementById('materialQuantity').value) || 0,
        price: parseFloat(document.getElementById('materialPrice').value) || 0,
        sellPrice: parseFloat(document.getElementById('materialSellPrice').value) || 0,
        minStock: parseFloat(document.getElementById('materialMinStock').value) || 0,
        needsCheck: document.getElementById('materialNeedsCheck').checked,
        notes: document.getElementById('materialNotes').value
    };
    
    if (!materialData.name) {
        showToast('أدخل اسم المادة', 'warning');
        return;
    }
    
    try {
        if (id) {
            const existingMaterial = await DB.get(DB.STORES.materials, parseInt(id));
            materialData.id = parseInt(id);
            materialData.createdAt = existingMaterial.createdAt;
            await DB.update(DB.STORES.materials, materialData);
            showToast('تم تحديث المادة بنجاح', 'success');
        } else {
            await DB.add(DB.STORES.materials, materialData);
            showToast('تم إضافة المادة بنجاح', 'success');
        }
        
        closeModal('materialModal');
        await refreshInventoryTable();
        await loadInventorySelects();
        await loadDashboard();
    } catch (error) {
        console.error('خطأ في حفظ المادة:', error);
        showToast('حدث خطأ في حفظ المادة', 'error');
    }
}

/**
 * تعديل مادة
 */
async function editMaterial(id) {
    await showMaterialModal(id);
}

/**
 * حذف مادة
 */
async function deleteMaterial(id) {
    if (!confirm('هل تريد حذف هذه المادة؟')) return;
    
    try {
        await DB.delete(DB.STORES.materials, id);
        showToast('تم حذف المادة', 'success');
        await refreshInventoryTable();
        await loadDashboard();
    } catch (error) {
        showToast('حدث خطأ في حذف المادة', 'error');
    }
}

/**
 * تبديل حالة المراجعة
 */
async function toggleNeedsCheck(id) {
    try {
        const material = await DB.get(DB.STORES.materials, id);
        material.needsCheck = !material.needsCheck;
        await DB.update(DB.STORES.materials, material);
        await refreshInventoryTable();
        showToast(material.needsCheck ? 'تم تحديد المادة للمراجعة' : 'تم إلغاء علامة المراجعة', 'info');
    } catch (error) {
        showToast('حدث خطأ', 'error');
    }
}

/**
 * عرض نافذة تسجيل شراء
 */
async function showPurchaseModal() {
    await loadInventorySelects();
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    
    // حساب الإجمالي عند تغيير الكمية أو السعر
    const quantityInput = document.getElementById('purchaseQuantity');
    const priceInput = document.getElementById('purchaseUnitPrice');
    
    // إزالة المستمعين القدامى وإضافة جدد
    quantityInput.removeEventListener('input', calculatePurchaseTotal);
    priceInput.removeEventListener('input', calculatePurchaseTotal);
    quantityInput.addEventListener('input', calculatePurchaseTotal);
    priceInput.addEventListener('input', calculatePurchaseTotal);
    
    openModal('purchaseModal');
}

/**
 * حساب إجمالي الشراء
 */
function calculatePurchaseTotal() {
    const quantity = parseFloat(document.getElementById('purchaseQuantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('purchaseUnitPrice').value) || 0;
    const total = quantity * unitPrice;
    document.getElementById('purchaseTotal').value = total.toFixed(2);
}

/**
 * حفظ عملية الشراء
 */
async function savePurchase() {
    const materialId = parseInt(document.getElementById('purchaseMaterial').value);
    const supplierId = parseInt(document.getElementById('purchaseSupplier').value) || null;
    const quantity = parseFloat(document.getElementById('purchaseQuantity').value) || 0;
    const unitPrice = parseFloat(document.getElementById('purchaseUnitPrice').value) || 0;
    const total = parseFloat(document.getElementById('purchaseTotal').value) || 0;
    const date = document.getElementById('purchaseDate').value;
    const notes = document.getElementById('purchaseNotes').value;
    
    if (!materialId) {
        showToast('اختر المادة', 'warning');
        return;
    }
    
    if (quantity <= 0) {
        showToast('أدخل الكمية', 'warning');
        return;
    }
    
    try {
        // تسجيل عملية الشراء
        await DB.add(DB.STORES.purchases, {
            materialId,
            supplierId,
            quantity,
            unitPrice,
            total,
            date,
            notes
        });
        
        // تحديث كمية المادة وسعر الشراء
        const material = await DB.get(DB.STORES.materials, materialId);
        material.quantity = (parseFloat(material.quantity) || 0) + quantity;
        material.price = unitPrice; // تحديث سعر الشراء الأخير
        await DB.update(DB.STORES.materials, material);
        
        // تسجيل كمصروف (مشتريات)
        await DB.add(DB.STORES.expenses, {
            description: `شراء ${material.name}`,
            category: 'purchases',
            amount: total,
            date,
            notes
        });
        
        closeModal('purchaseModal');
        await refreshInventoryTable();
        await loadDashboard();
        showToast('تم تسجيل عملية الشراء بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في حفظ عملية الشراء:', error);
        showToast('حدث خطأ في تسجيل الشراء', 'error');
    }
}

/**
 * إضافة وحدة قياس مخصصة
 */
async function addCustomUnit() {
    const keyInput = document.getElementById('newUnitKey');
    const nameInput = document.getElementById('newUnitName');
    
    const key = keyInput.value.trim().toLowerCase().replace(/\s+/g, '_');
    const name = nameInput.value.trim();
    
    if (!key || !name) {
        showToast('أدخل رمز واسم الوحدة', 'warning');
        return;
    }
    
    try {
        let customUnits = await DB.getSetting('customUnits') || [];
        
        // التحقق من عدم التكرار
        if (customUnits.some(u => u.key === key)) {
            showToast('هذه الوحدة موجودة مسبقاً', 'warning');
            return;
        }
        
        customUnits.push({ key, name });
        await DB.saveSetting('customUnits', customUnits);
        
        keyInput.value = '';
        nameInput.value = '';
        
        await loadCustomUnitsList();
        showToast('تم إضافة الوحدة بنجاح', 'success');
    } catch (error) {
        showToast('حدث خطأ في إضافة الوحدة', 'error');
    }
}

/**
 * حذف وحدة قياس مخصصة
 */
async function deleteCustomUnit(key) {
    if (!confirm('هل تريد حذف هذه الوحدة؟')) return;
    
    try {
        let customUnits = await DB.getSetting('customUnits') || [];
        customUnits = customUnits.filter(u => u.key !== key);
        await DB.saveSetting('customUnits', customUnits);
        
        await loadCustomUnitsList();
        showToast('تم حذف الوحدة', 'success');
    } catch (error) {
        showToast('حدث خطأ في حذف الوحدة', 'error');
    }
}

/**
 * تحميل قائمة الوحدات المخصصة
 */
async function loadCustomUnitsList() {
    const container = document.getElementById('customUnitsList');
    if (!container) return;
    
    const customUnits = await DB.getSetting('customUnits') || [];
    
    if (customUnits.length === 0) {
        container.innerHTML = '<p class="text-muted">لا توجد وحدات مخصصة</p>';
        return;
    }
    
    container.innerHTML = customUnits.map(unit => `
        <span class="unit-tag">
            <strong>${unit.name}</strong> (${unit.key})
            <button onclick="deleteCustomUnit('${unit.key}')">&times;</button>
        </span>
    `).join('');
}

// تصدير الدوال
window.loadInventory = loadInventory;
window.showMaterialModal = showMaterialModal;
window.saveMaterial = saveMaterial;
window.editMaterial = editMaterial;
window.deleteMaterial = deleteMaterial;
window.toggleNeedsCheck = toggleNeedsCheck;
window.showPurchaseModal = showPurchaseModal;
window.savePurchase = savePurchase;
window.calculatePurchaseTotal = calculatePurchaseTotal;
window.addCustomUnit = addCustomUnit;
window.deleteCustomUnit = deleteCustomUnit;
window.loadCustomUnitsList = loadCustomUnitsList;
