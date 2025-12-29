/**
 * إدارة الطلبات - نظام متعدد الخدمات والمواد
 * يدعم إضافة طلبات متعددة لنفس العميل مع خصم تلقائي للمخزون
 * مع دعم الخدمات المرتبطة بالمواد والتكاليف الإضافية
 */

// متغير لتتبع عناصر الطلب الحالية
let currentOrderItems = [];
// متغير لتتبع التكاليف الإضافية
let currentExtraCosts = [];

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
    
    if (clientSelect) {
        clientSelect.innerHTML = '<option value="">اختر العميل</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name || client.phone || `عميل #${client.id}`;
            clientSelect.appendChild(option);
        });
    }
    
    // تحميل الخدمات
    const services = await DB.getAll(DB.STORES.services);
    const serviceFilter = document.getElementById('orderServiceFilter');
    
    if (serviceFilter) {
        serviceFilter.innerHTML = '<option value="">كل الخدمات</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = service.name;
            serviceFilter.appendChild(option);
        });
    }
    
    // تحميل الطلبات للربط بالمهام
    const orders = await DB.getAll(DB.STORES.orders);
    const taskOrderSelect = document.getElementById('taskOrderId');
    if (taskOrderSelect) {
        taskOrderSelect.innerHTML = '<option value="">بدون ربط</option>';
        orders.filter(o => o.status !== 'delivered').forEach(order => {
            const option = document.createElement('option');
            option.value = order.id;
            option.textContent = `#${order.id} - ${getOrderSummary(order)}`;
            taskOrderSelect.appendChild(option);
        });
    }
}

/**
 * الحصول على ملخص الطلب
 */
function getOrderSummary(order) {
    if (order.items && order.items.length > 0) {
        return order.items.map(i => i.serviceName || i.materialName).slice(0, 2).join('، ') + 
               (order.items.length > 2 ? '...' : '');
    }
    return order.service || 'طلب';
}

/**
 * تحديث جدول الطلبات
 */
async function refreshOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
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
            const itemsText = order.items?.map(i => i.serviceName || i.materialName).join(' ') || '';
            return (
                itemsText.toLowerCase().includes(searchQuery) ||
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
        filteredOrders = filteredOrders.filter(o => 
            o.items?.some(i => i.serviceName === serviceFilter) || o.service === serviceFilter
        );
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
                <td colspan="9" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>لا توجد طلبات</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredOrders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        const totalCost = order.totalCost || 0;
        const totalPrice = order.totalPrice || order.price || 0;
        const profit = totalPrice - totalCost;
        const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
        
        // ملخص الخدمات/المواد
        let itemsSummary = '-';
        if (order.items && order.items.length > 0) {
            itemsSummary = order.items.map(item => {
                const name = item.serviceName || item.materialName || '-';
                return `<span class="item-badge">${name}</span>`;
            }).join(' ');
        } else if (order.service) {
            itemsSummary = `<span class="item-badge">${order.service}</span>`;
        }
        
        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${client?.name || 'غير معروف'}</td>
                <td class="items-cell">${itemsSummary}</td>
                <td>${formatCurrency(totalCost)}</td>
                <td>${formatCurrency(totalPrice)}</td>
                <td class="${profitClass}">${formatCurrency(profit)}</td>
                <td>${order.deliveryDate ? formatDate(order.deliveryDate) : '-'}</td>
                <td><span class="status-badge ${order.status}">${getStatusText(order.status)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" onclick="viewOrder(${order.id})" title="عرض التفاصيل">
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
    
    // مسح عناصر الطلب السابقة
    currentOrderItems = [];
    currentExtraCosts = [];
    
    if (orderId) {
        const order = await DB.get(DB.STORES.orders, orderId);
        if (order) {
            document.getElementById('orderClient').value = order.clientId || '';
            document.getElementById('orderDate').value = order.orderDate?.split('T')[0] || '';
            document.getElementById('orderDeliveryDate').value = order.deliveryDate?.split('T')[0] || '';
            document.getElementById('orderStatus').value = order.status || 'pending';
            document.getElementById('orderNotes').value = order.notes || '';
            
            // خيارات الفاتورة
            document.getElementById('invoiceShowMaterialPrices').checked = order.invoiceOptions?.showMaterialPrices || false;
            document.getElementById('invoiceShowMaterialCosts').checked = order.invoiceOptions?.showMaterialCosts || false;
            document.getElementById('invoiceShowExtraCosts').checked = order.invoiceOptions?.showExtraCosts !== false;
            
            // تحميل عناصر الطلب
            if (order.items && order.items.length > 0) {
                currentOrderItems = [...order.items];
            } else if (order.service) {
                // دعم الطلبات القديمة
                currentOrderItems = [{
                    type: 'service',
                    serviceName: order.service,
                    materialId: null,
                    materialName: '',
                    materialSource: 'none',
                    quantity: order.quantity || 1,
                    servicePrice: order.price || 0,
                    materialPrice: 0,
                    materialCost: 0,
                    totalPrice: order.price || 0
                }];
            }
            
            // تحميل التكاليف الإضافية
            if (order.extraCosts && order.extraCosts.length > 0) {
                currentExtraCosts = [...order.extraCosts];
            }
        }
    } else {
        // تعيين القيم الافتراضية
        document.getElementById('orderForm').reset();
        document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('orderStatus').value = 'pending';
        document.getElementById('invoiceShowExtraCosts').checked = true;
        
        // إضافة عنصر واحد افتراضي
        addOrderItem();
    }
    
    // تحديث عرض العناصر
    await renderOrderItems();
    renderExtraCosts();
    updateOrderTotals();
    
    openModal('orderModal');
}

/**
 * إضافة عنصر جديد للطلب (خدمة مع مادة مرتبطة)
 */
async function addOrderItem() {
    const itemIndex = currentOrderItems.length;
    
    currentOrderItems.push({
        type: 'service',
        serviceName: '',
        materialId: null,
        materialName: '',
        materialSource: 'none', // 'none', 'mine', 'client'
        quantity: 1,
        servicePrice: 0,
        materialPrice: 0,
        materialCost: 0,
        totalPrice: 0
    });
    
    await renderOrderItems();
}

/**
 * عرض عناصر الطلب
 */
async function renderOrderItems() {
    const container = document.getElementById('orderItemsContainer');
    const services = await DB.getAll(DB.STORES.services);
    const materials = await DB.getAll(DB.STORES.materials);
    
    container.innerHTML = currentOrderItems.map((item, index) => `
        <div class="order-item-row" data-index="${index}">
            <div class="item-header">
                <span class="item-number">العنصر #${index + 1}</span>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeOrderItem(${index})" ${currentOrderItems.length === 1 ? 'disabled' : ''}>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <!-- قسم الخدمة -->
            <div class="form-row">
                <div class="form-group flex-2">
                    <label><i class="fas fa-cog"></i> الخدمة</label>
                    <select onchange="updateItemService(${index}, this.value)">
                        <option value="">اختر الخدمة</option>
                        ${services.map(s => `<option value="${s.name}" ${item.serviceName === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>سعر الخدمة</label>
                    <input type="number" value="${item.servicePrice}" min="0" step="0.01" 
                           onchange="updateItemServicePrice(${index}, this.value)" placeholder="0.00">
                </div>
            </div>
            
            <!-- قسم المادة -->
            <div class="form-row material-section">
                <div class="form-group">
                    <label><i class="fas fa-box"></i> مصدر المادة</label>
                    <select onchange="updateMaterialSource(${index}, this.value)">
                        <option value="none" ${item.materialSource === 'none' ? 'selected' : ''}>بدون مادة</option>
                        <option value="mine" ${item.materialSource === 'mine' ? 'selected' : ''}>من عندي (المخزون)</option>
                        <option value="client" ${item.materialSource === 'client' ? 'selected' : ''}>من عند الزبون</option>
                    </select>
                </div>
                ${item.materialSource === 'mine' ? `
                <div class="form-group flex-2">
                    <label>اختر المادة من المخزون</label>
                    <select onchange="updateItemMaterial(${index}, this.value)">
                        <option value="">اختر المادة</option>
                        ${materials.map(m => `<option value="${m.id}" ${item.materialId == m.id ? 'selected' : ''}>${m.name} (متوفر: ${m.quantity} ${getUnitText(m.customUnit || m.unit)})</option>`).join('')}
                    </select>
                </div>
                ` : item.materialSource === 'client' ? `
                <div class="form-group flex-2">
                    <label>وصف المادة (من الزبون)</label>
                    <input type="text" value="${item.materialName || ''}" placeholder="اسم/وصف المادة من الزبون"
                           onchange="updateClientMaterialName(${index}, this.value)">
                </div>
                ` : ''}
            </div>
            
            ${item.materialSource !== 'none' ? `
            <div class="form-row">
                <div class="form-group">
                    <label>الكمية</label>
                    <input type="number" value="${item.quantity}" min="0.01" step="0.01" 
                           onchange="updateItemQuantity(${index}, this.value)">
                </div>
                ${item.materialSource === 'mine' ? `
                <div class="form-group">
                    <label>سعر بيع المادة (للوحدة)</label>
                    <input type="number" value="${item.materialPrice}" min="0" step="0.01" 
                           onchange="updateItemMaterialPrice(${index}, this.value)" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>تكلفة المادة</label>
                    <input type="number" value="${item.materialCost.toFixed(2)}" readonly class="readonly-field cost-field">
                </div>
                ` : ''}
            </div>
            ` : `
            <div class="form-row">
                <div class="form-group">
                    <label>الكمية</label>
                    <input type="number" value="${item.quantity}" min="1" step="1" 
                           onchange="updateItemQuantity(${index}, this.value)">
                </div>
            </div>
            `}
            
            <div class="item-total">
                <span>إجمالي العنصر:</span>
                <span class="total-value">${formatCurrency(item.totalPrice)}</span>
            </div>
        </div>
    `).join('');
}

/**
 * تحديث مصدر المادة
 */
async function updateMaterialSource(index, source) {
    currentOrderItems[index].materialSource = source;
    currentOrderItems[index].materialId = null;
    currentOrderItems[index].materialName = '';
    currentOrderItems[index].materialPrice = 0;
    currentOrderItems[index].materialCost = 0;
    
    if (source === 'none') {
        currentOrderItems[index].quantity = 1;
    }
    
    await renderOrderItems();
    updateOrderTotals();
}

/**
 * تحديث اسم المادة من الزبون
 */
function updateClientMaterialName(index, name) {
    currentOrderItems[index].materialName = name;
}

/**
 * تحديث خدمة العنصر
 */
function updateItemService(index, serviceName) {
    currentOrderItems[index].serviceName = serviceName;
    updateOrderTotals();
}

/**
 * تحديث سعر الخدمة
 */
function updateItemServicePrice(index, price) {
    currentOrderItems[index].servicePrice = parseFloat(price) || 0;
    currentOrderItems[index].totalPrice = currentOrderItems[index].servicePrice + 
        (currentOrderItems[index].materialSource === 'mine' ? currentOrderItems[index].materialPrice * currentOrderItems[index].quantity : 0);
    updateOrderTotals();
}

/**
 * تحديث مادة العنصر
 */
async function updateItemMaterial(index, materialId) {
    if (!materialId) {
        currentOrderItems[index].materialId = null;
        currentOrderItems[index].materialName = '';
        currentOrderItems[index].materialCost = 0;
        currentOrderItems[index].materialPrice = 0;
        updateOrderTotals();
        await renderOrderItems();
        return;
    }
    
    const material = await DB.get(DB.STORES.materials, parseInt(materialId));
    if (material) {
        currentOrderItems[index].materialId = material.id;
        currentOrderItems[index].materialName = material.name;
        currentOrderItems[index].materialPrice = material.sellPrice || material.price || 0;
        currentOrderItems[index].materialCost = (material.price || 0) * currentOrderItems[index].quantity;
        currentOrderItems[index].totalPrice = currentOrderItems[index].servicePrice + 
            (currentOrderItems[index].materialPrice * currentOrderItems[index].quantity);
    }
    
    await renderOrderItems();
    updateOrderTotals();
}

/**
 * تحديث سعر بيع المادة
 */
async function updateItemMaterialPrice(index, price) {
    currentOrderItems[index].materialPrice = parseFloat(price) || 0;
    currentOrderItems[index].totalPrice = currentOrderItems[index].servicePrice + 
        (currentOrderItems[index].materialPrice * currentOrderItems[index].quantity);
    await renderOrderItems();
    updateOrderTotals();
}

/**
 * تحديث كمية العنصر
 */
async function updateItemQuantity(index, quantity) {
    currentOrderItems[index].quantity = parseFloat(quantity) || 0;
    
    // تحديث تكلفة المادة إذا كانت من المخزون
    if (currentOrderItems[index].materialSource === 'mine' && currentOrderItems[index].materialId) {
        const material = await DB.get(DB.STORES.materials, currentOrderItems[index].materialId);
        if (material) {
            currentOrderItems[index].materialCost = (material.price || 0) * currentOrderItems[index].quantity;
            currentOrderItems[index].totalPrice = currentOrderItems[index].servicePrice + 
                (currentOrderItems[index].materialPrice * currentOrderItems[index].quantity);
        }
    }
    
    await renderOrderItems();
    updateOrderTotals();
}

/**
 * إزالة عنصر من الطلب
 */
async function removeOrderItem(index) {
    if (currentOrderItems.length > 1) {
        currentOrderItems.splice(index, 1);
        await renderOrderItems();
        updateOrderTotals();
    }
}

/**
 * إضافة تكلفة إضافية
 */
function addExtraCost() {
    currentExtraCosts.push({
        name: '',
        amount: 0
    });
    renderExtraCosts();
}

/**
 * عرض التكاليف الإضافية
 */
function renderExtraCosts() {
    const container = document.getElementById('extraCostsContainer');
    if (!container) return;
    
    if (currentExtraCosts.length === 0) {
        container.innerHTML = '<p class="empty-extra-costs">لا توجد تكاليف إضافية. اضغط على الزر أدناه لإضافة تكلفة.</p>';
        return;
    }
    
    container.innerHTML = currentExtraCosts.map((cost, index) => `
        <div class="extra-cost-row" data-index="${index}">
            <div class="form-group flex-2">
                <input type="text" value="${cost.name}" placeholder="اسم التكلفة (مثل: التوصيل، التغليف...)"
                       onchange="updateExtraCostName(${index}, this.value)">
            </div>
            <div class="form-group">
                <input type="number" value="${cost.amount}" min="0" step="0.01" placeholder="المبلغ"
                       onchange="updateExtraCostAmount(${index}, this.value)">
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeExtraCost(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

/**
 * تحديث اسم التكلفة الإضافية
 */
function updateExtraCostName(index, name) {
    currentExtraCosts[index].name = name;
}

/**
 * تحديث مبلغ التكلفة الإضافية
 */
function updateExtraCostAmount(index, amount) {
    currentExtraCosts[index].amount = parseFloat(amount) || 0;
    updateOrderTotals();
}

/**
 * إزالة تكلفة إضافية
 */
function removeExtraCost(index) {
    currentExtraCosts.splice(index, 1);
    renderExtraCosts();
    updateOrderTotals();
}

/**
 * تحديث إجماليات الطلب
 */
function updateOrderTotals() {
    let servicePrice = 0;
    let materialsPrice = 0;
    let materialsCost = 0;
    
    currentOrderItems.forEach(item => {
        servicePrice += item.servicePrice || 0;
        if (item.materialSource === 'mine') {
            materialsPrice += (item.materialPrice || 0) * (item.quantity || 0);
            materialsCost += item.materialCost || 0;
        }
    });
    
    // حساب التكاليف الإضافية
    let extraCostsTotal = 0;
    currentExtraCosts.forEach(cost => {
        extraCostsTotal += cost.amount || 0;
    });
    
    const totalPrice = servicePrice + materialsPrice + extraCostsTotal;
    const expectedProfit = totalPrice - materialsCost;
    
    document.getElementById('orderServicePrice').textContent = formatCurrency(servicePrice);
    document.getElementById('orderMaterialsPrice').textContent = formatCurrency(materialsPrice);
    document.getElementById('orderExtraCosts').textContent = formatCurrency(extraCostsTotal);
    document.getElementById('orderMaterialsCost').textContent = formatCurrency(materialsCost);
    document.getElementById('orderTotalPrice').innerHTML = `<strong>${formatCurrency(totalPrice)}</strong>`;
    document.getElementById('orderExpectedProfit').textContent = formatCurrency(expectedProfit);
    
    // تلوين الربح
    const profitElement = document.getElementById('orderExpectedProfit');
    profitElement.className = expectedProfit >= 0 ? 'profit-positive' : 'profit-negative';
}

/**
 * حفظ الطلب
 */
async function saveOrder() {
    const id = document.getElementById('orderId').value;
    const clientId = parseInt(document.getElementById('orderClient').value);
    
    if (!clientId) {
        showToast('اختر العميل', 'warning');
        return;
    }
    
    // التحقق من وجود عناصر صالحة
    const validItems = currentOrderItems.filter(item => item.serviceName);
    
    if (validItems.length === 0) {
        showToast('أضف خدمة واحدة على الأقل', 'warning');
        return;
    }
    
    // حساب الإجماليات
    let servicePrice = 0;
    let materialsPrice = 0;
    let materialsCost = 0;
    
    validItems.forEach(item => {
        servicePrice += item.servicePrice || 0;
        if (item.materialSource === 'mine') {
            materialsPrice += (item.materialPrice || 0) * (item.quantity || 0);
            materialsCost += item.materialCost || 0;
        }
    });
    
    let extraCostsTotal = 0;
    currentExtraCosts.forEach(cost => {
        extraCostsTotal += cost.amount || 0;
    });
    
    const totalPrice = servicePrice + materialsPrice + extraCostsTotal;
    
    const orderData = {
        clientId,
        items: validItems,
        extraCosts: currentExtraCosts.filter(c => c.name && c.amount > 0),
        servicePrice,
        materialsPrice,
        totalCost: materialsCost,
        totalPrice,
        extraCostsTotal,
        orderDate: document.getElementById('orderDate').value,
        deliveryDate: document.getElementById('orderDeliveryDate').value,
        status: document.getElementById('orderStatus').value,
        notes: document.getElementById('orderNotes').value,
        invoiceOptions: {
            showMaterialPrices: document.getElementById('invoiceShowMaterialPrices').checked,
            showMaterialCosts: document.getElementById('invoiceShowMaterialCosts').checked,
            showExtraCosts: document.getElementById('invoiceShowExtraCosts').checked
        },
        // للتوافق مع النظام القديم
        service: validItems[0]?.serviceName || '',
        quantity: validItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
        price: totalPrice
    };
    
    try {
        if (id) {
            // تحديث طلب موجود
            const existingOrder = await DB.get(DB.STORES.orders, parseInt(id));
            orderData.id = parseInt(id);
            orderData.createdAt = existingOrder.createdAt;
            
            // استعادة المخزون من الطلب القديم قبل التحديث
            if (existingOrder.items) {
                for (const item of existingOrder.items) {
                    if (item.materialSource === 'mine' && item.materialId) {
                        await updateMaterialStock(item.materialId, item.quantity, 'add');
                    }
                }
            }
            
            await DB.update(DB.STORES.orders, orderData);
            showToast('تم تحديث الطلب بنجاح', 'success');
        } else {
            // إضافة طلب جديد
            await DB.add(DB.STORES.orders, orderData);
            showToast('تم إضافة الطلب بنجاح', 'success');
        }
        
        // خصم المواد من المخزون
        for (const item of validItems) {
            if (item.materialSource === 'mine' && item.materialId) {
                await updateMaterialStock(item.materialId, item.quantity, 'subtract');
            }
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
 * تحديث مخزون المادة
 */
async function updateMaterialStock(materialId, quantity, operation) {
    try {
        const material = await DB.get(DB.STORES.materials, materialId);
        if (material) {
            if (operation === 'subtract') {
                material.quantity = Math.max(0, (parseFloat(material.quantity) || 0) - parseFloat(quantity));
            } else {
                material.quantity = (parseFloat(material.quantity) || 0) + parseFloat(quantity);
            }
            await DB.update(DB.STORES.materials, material);
        }
    } catch (error) {
        console.error('خطأ في تحديث المخزون:', error);
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
    const materials = await DB.getAll(DB.STORES.materials);
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        itemsHtml = `
            <table class="details-table">
                <thead>
                    <tr>
                        <th>الخدمة</th>
                        <th>المادة</th>
                        <th>المصدر</th>
                        <th>الكمية</th>
                        <th>سعر الخدمة</th>
                        <th>سعر المادة</th>
                        <th>تكلفة المادة</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => {
                        const material = item.materialId ? materials.find(m => m.id === item.materialId) : null;
                        const sourceText = item.materialSource === 'mine' ? 'من عندي' : 
                                          item.materialSource === 'client' ? 'من الزبون' : '-';
                        return `
                            <tr>
                                <td><i class="fas fa-cog"></i> ${item.serviceName || '-'}</td>
                                <td>${item.materialName || '-'}</td>
                                <td>${sourceText}</td>
                                <td>${item.quantity || '-'} ${material ? getUnitText(material.customUnit || material.unit) : ''}</td>
                                <td>${formatCurrency(item.servicePrice || 0)}</td>
                                <td>${item.materialSource === 'mine' ? formatCurrency((item.materialPrice || 0) * (item.quantity || 1)) : '-'}</td>
                                <td>${item.materialSource === 'mine' ? formatCurrency(item.materialCost || 0) : '-'}</td>
                                <td>${formatCurrency(item.totalPrice || item.servicePrice || 0)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else {
        itemsHtml = `
            <div class="detail-group">
                <label>الخدمة:</label>
                <span>${order.service || '-'}</span>
            </div>
            <div class="detail-group">
                <label>الكمية:</label>
                <span>${order.quantity || '-'}</span>
            </div>
        `;
    }
    
    // عرض التكاليف الإضافية
    let extraCostsHtml = '';
    if (order.extraCosts && order.extraCosts.length > 0) {
        extraCostsHtml = `
            <h4><i class="fas fa-plus-circle"></i> التكاليف الإضافية</h4>
            <ul class="extra-costs-list">
                ${order.extraCosts.map(cost => `
                    <li><span>${cost.name}:</span> <span>${formatCurrency(cost.amount)}</span></li>
                `).join('')}
            </ul>
        `;
    }
    
    const totalCost = order.totalCost || 0;
    const totalPrice = order.totalPrice || order.price || 0;
    const profit = totalPrice - totalCost;
    const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
    
    const content = `
        <div class="order-details">
            <div class="details-header">
                <div class="detail-group">
                    <label>رقم الطلب:</label>
                    <span><strong>#${order.id}</strong></span>
                </div>
                <div class="detail-group">
                    <label>العميل:</label>
                    <span>${client?.name || 'غير معروف'}</span>
                </div>
                <div class="detail-group">
                    <label>الحالة:</label>
                    <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
                </div>
            </div>
            
            <div class="details-dates">
                <div class="detail-group">
                    <label>تاريخ الطلب:</label>
                    <span>${formatDate(order.orderDate)}</span>
                </div>
                <div class="detail-group">
                    <label>تاريخ التسليم:</label>
                    <span>${formatDate(order.deliveryDate)}</span>
                </div>
            </div>
            
            <h4><i class="fas fa-list"></i> تفاصيل الخدمات والمواد</h4>
            ${itemsHtml}
            
            ${extraCostsHtml}
            
            <div class="details-summary">
                <div class="summary-item">
                    <span>سعر الخدمات:</span>
                    <span>${formatCurrency(order.servicePrice || 0)}</span>
                </div>
                <div class="summary-item">
                    <span>سعر المواد:</span>
                    <span>${formatCurrency(order.materialsPrice || 0)}</span>
                </div>
                <div class="summary-item">
                    <span>التكاليف الإضافية:</span>
                    <span>${formatCurrency(order.extraCostsTotal || 0)}</span>
                </div>
                <div class="summary-item">
                    <span>إجمالي التكلفة:</span>
                    <span>${formatCurrency(totalCost)}</span>
                </div>
                <div class="summary-item total">
                    <span><strong>إجمالي للعميل:</strong></span>
                    <span><strong>${formatCurrency(totalPrice)}</strong></span>
                </div>
                <div class="summary-item ${profitClass}">
                    <span><strong>الربح:</strong></span>
                    <span><strong>${formatCurrency(profit)}</strong></span>
                </div>
            </div>
            
            ${order.notes ? `
            <div class="detail-group notes">
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
        <button class="btn btn-success" onclick="printOrderInvoice(${id});">
            <i class="fas fa-print"></i> طباعة
        </button>
    `;
    openModal('invoiceModal');
}

/**
 * حذف طلب
 */
async function deleteOrder(id) {
    if (!confirm('هل تريد حذف هذا الطلب؟ سيتم استعادة المواد للمخزون.')) return;
    
    try {
        const order = await DB.get(DB.STORES.orders, id);
        
        // استعادة المواد للمخزون
        if (order && order.items) {
            for (const item of order.items) {
                if (item.materialSource === 'mine' && item.materialId) {
                    await updateMaterialStock(item.materialId, item.quantity, 'add');
                }
            }
        }
        
        await DB.delete(DB.STORES.orders, id);
        showToast('تم حذف الطلب واستعادة المواد', 'success');
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
window.addOrderItem = addOrderItem;
window.removeOrderItem = removeOrderItem;
window.updateMaterialSource = updateMaterialSource;
window.updateClientMaterialName = updateClientMaterialName;
window.updateItemService = updateItemService;
window.updateItemServicePrice = updateItemServicePrice;
window.updateItemMaterial = updateItemMaterial;
window.updateItemMaterialPrice = updateItemMaterialPrice;
window.updateItemQuantity = updateItemQuantity;
window.addExtraCost = addExtraCost;
window.updateExtraCostName = updateExtraCostName;
window.updateExtraCostAmount = updateExtraCostAmount;
window.removeExtraCost = removeExtraCost;
