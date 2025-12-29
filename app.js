/**
 * نظام إدارة المطبعة - الإصدار 5.0
 * مع التقارير المتقدمة والسلة والخدمات الفرعية
 */

// ===== Global Variables =====
let currentOrderItems = [];
let currentPage = 'dashboard';
let currentCategoryId = null;
let currentCalendarDate = new Date();
let cart = [];
let currentProductUnits = [];
let currentViewQty = 1;
let reportCharts = {};

// ===== Default Data =====
const DEFAULT_SERVICES_WITH_SUBS = [
    { name: 'طباعة ورق', subServices: [{ name: 'A4', price: 10 }, { name: 'A3', price: 20 }, { name: 'A5', price: 5 }] },
    { name: 'طباعة ملابس', subServices: [{ name: 'تيشرت صغير', price: 500 }, { name: 'تيشرت وسط', price: 600 }, { name: 'تيشرت كبير', price: 700 }] },
    { name: 'طباعة كؤوس', subServices: [] },
    { name: 'بطاقات دعوة', subServices: [] },
    { name: 'بطاقات عمل', subServices: [{ name: '100 بطاقة', price: 1000 }, { name: '250 بطاقة', price: 2000 }, { name: '500 بطاقة', price: 3500 }] },
    { name: 'لافتات', subServices: [] },
    { name: 'ملصقات', subServices: [] },
    { name: 'تصميم', subServices: [{ name: 'شعار', price: 5000 }, { name: 'بطاقة', price: 1000 }, { name: 'بوستر', price: 2000 }] },
    { name: 'أخرى', subServices: [] }
];
const DEFAULT_UNITS = [
    { key: 'piece', name: 'قطعة' },
    { key: 'kg', name: 'كيلوغرام' },
    { key: 'meter', name: 'متر' },
    { key: 'm2', name: 'متر مربع' },
    { key: 'liter', name: 'لتر' },
    { key: 'roll', name: 'لفة' },
    { key: 'sheet', name: 'ورقة' },
    { key: 'pack', name: 'رزمة' }
];

// ===== Utility Functions =====
function formatCurrency(amount) {
    return `${parseFloat(amount || 0).toFixed(2)} د.ج`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-DZ');
}

function getStatusText(status) {
    const statuses = { pending: 'قيد التنفيذ', ready: 'جاهز', delivered: 'مُسلّم', in_progress: 'قيد التنفيذ', completed: 'مكتمل' };
    return statuses[status] || status;
}

function getPriorityText(priority) {
    const priorities = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
    return priorities[priority] || priority;
}

function getUnitText(unit) {
    const units = getUnits();
    const found = units.find(u => u.key === unit);
    return found ? found.name : unit;
}

function getServicesWithSubs() {
    const custom = DB.getSetting('servicesWithSubs');
    return custom ? JSON.parse(custom) : DEFAULT_SERVICES_WITH_SUBS;
}

function getServices() {
    return getServicesWithSubs().map(s => s.name);
}

function getUnits() {
    const custom = DB.getSetting('customUnits');
    return custom ? JSON.parse(custom) : DEFAULT_UNITS;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

// ===== Image Handling =====
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const logoData = e.target.result;
            document.getElementById('shopLogoPreview').src = logoData;
            document.getElementById('shopLogoPreview').style.display = 'block';
            document.getElementById('logoPlaceholder').style.display = 'none';
            DB.saveSetting('shopLogo', logoData);
            updateSidebarLogo();
            showToast('تم تحديث الشعار', 'success');
        };
        reader.readAsDataURL(file);
    }
}

function removeLogo() {
    DB.saveSetting('shopLogo', '');
    document.getElementById('shopLogoPreview').src = '';
    document.getElementById('shopLogoPreview').style.display = 'none';
    document.getElementById('logoPlaceholder').style.display = 'block';
    updateSidebarLogo();
    showToast('تم إزالة الشعار', 'success');
}

function updateSidebarLogo() {
    const logo = DB.getSetting('shopLogo');
    const logoImg = document.getElementById('logoImg');
    const logoIcon = document.getElementById('logoIcon');
    if (logo) {
        logoImg.src = logo;
        logoImg.style.display = 'block';
        logoIcon.style.display = 'none';
    } else {
        logoImg.style.display = 'none';
        logoIcon.style.display = 'block';
    }
    document.getElementById('shopNameDisplay').textContent = DB.getSetting('shopName') || 'المطبعة';
}

function handleAvatarUpload(event, type) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(`${type}AvatarPreview`);
            const placeholder = document.getElementById(`${type}AvatarPlaceholder`);
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function handleImageUpload(event, type) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(`${type}ImagePreview`);
            const placeholder = document.getElementById(`${type}ImagePlaceholder`);
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            const pTag = document.querySelector(`#${type}Modal .image-upload p`);
            if (pTag) pTag.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// ===== Navigation =====
function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    currentPage = page;
    document.getElementById('sidebar').classList.remove('active');
    
    switch(page) {
        case 'dashboard': loadDashboard(); break;
        case 'orders': loadOrders(); break;
        case 'products': loadProducts(); break;
        case 'inventory': loadInventory(); break;
        case 'suppliers': loadSuppliers(); break;
        case 'clients': loadClients(); break;
        case 'tasks': loadTasks(); break;
        case 'notes': loadNotes(); break;
        case 'calendar': loadCalendar(); break;
        case 'reports': loadReports(); break;
        case 'settings': loadSettings(); break;
    }
}

// ===== Dashboard =====
function loadDashboard() {
    const orders = DB.getAll(DB.STORES.orders);
    const clients = DB.getAll(DB.STORES.clients);
    const materials = DB.getAll(DB.STORES.materials);
    const products = DB.getAll(DB.STORES.products);
    const tasks = DB.getAll(DB.STORES.tasks);
    
    document.getElementById('stat-orders').textContent = orders.filter(o => o.status !== 'delivered').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayRevenue = orders
        .filter(o => o.status === 'delivered' && o.deliveryDate?.split('T')[0] === today)
        .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    document.getElementById('stat-revenue').textContent = formatCurrency(todayRevenue);
    
    document.getElementById('stat-clients').textContent = clients.length;
    document.getElementById('stat-lowstock').textContent = materials.filter(m => m.minStock && m.quantity <= m.minStock).length;
    document.getElementById('stat-tasks').textContent = tasks.filter(t => t.status !== 'completed').length;
    document.getElementById('stat-products').textContent = products.length;
    
    // Recent Orders
    const recentOrders = orders.slice(-5).reverse();
    const container = document.getElementById('recentOrders');
    if (recentOrders.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد طلبات</p></div>';
    } else {
        container.innerHTML = recentOrders.map(order => {
            const client = clients.find(c => c.id === order.clientId);
            return `
                <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--gray-50); border-radius: var(--radius); margin-bottom: 0.5rem;">
                    <div><strong>#${order.id}</strong> - ${client?.name || order.tempName || 'بدون اسم'}</div>
                    <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
                </div>
            `;
        }).join('');
    }
    
    // Urgent Tasks
    const urgentTasks = tasks.filter(t => t.status !== 'completed' && t.priority === 'high').slice(0, 5);
    const tasksContainer = document.getElementById('urgentTasks');
    if (urgentTasks.length === 0) {
        tasksContainer.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>لا توجد مهام عاجلة</p></div>';
    } else {
        tasksContainer.innerHTML = urgentTasks.map(task => `
            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--danger-light); border-radius: var(--radius); margin-bottom: 0.5rem; border-right: 3px solid var(--danger);">
                <div><strong>${task.title}</strong></div>
                <span style="font-size: 0.75rem; color: var(--gray-500);">${task.dueDate ? formatDate(task.dueDate) : ''}</span>
            </div>
        `).join('');
    }
    
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('ar-DZ', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// ===== Orders =====
function loadOrders() { filterOrders(); }

function filterOrders() {
    const orders = DB.getAll(DB.STORES.orders);
    const clients = DB.getAll(DB.STORES.clients);
    const searchQuery = document.getElementById('ordersSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
    
    let filtered = orders;
    if (searchQuery) {
        filtered = filtered.filter(order => {
            const client = clients.find(c => c.id === order.clientId);
            const clientName = client?.name || order.tempName || '';
            return clientName.toLowerCase().includes(searchQuery) || String(order.id).includes(searchQuery);
        });
    }
    if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);
    
    const tbody = document.getElementById('ordersTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد طلبات</p></td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.reverse().map(order => {
        const client = clients.find(c => c.id === order.clientId);
        const profit = (order.totalPrice || 0) - (order.totalCost || 0);
        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${client?.name || order.tempName || 'بدون اسم'}</td>
                <td>${order.items?.map(i => i.serviceName).filter(Boolean).join('، ') || '-'}</td>
                <td>${formatCurrency(order.totalCost)}</td>
                <td>${formatCurrency(order.totalPrice)}</td>
                <td class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}">${formatCurrency(profit)}</td>
                <td><span class="status-badge ${order.status}">${getStatusText(order.status)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" onclick="viewOrder(${order.id})"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit" onclick="editOrder(${order.id})"><i class="fas fa-edit"></i></button>
                        <button class="action-btn print" onclick="printOrderInvoice(${order.id})"><i class="fas fa-print"></i></button>
                        <button class="action-btn delete" onclick="deleteOrder(${order.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showOrderModal(orderId = null) {
    document.getElementById('orderModalTitle').textContent = orderId ? 'تعديل الطلب' : 'طلب جديد';
    document.getElementById('orderId').value = orderId || '';
    
    const clients = DB.getAll(DB.STORES.clients);
    document.getElementById('orderClient').innerHTML = '<option value="">بدون عميل</option>' + 
        clients.map(c => `<option value="${c.id}">${c.name || c.phone}</option>`).join('');
    
    currentOrderItems = [];
    
    if (orderId) {
        const order = DB.get(DB.STORES.orders, orderId);
        if (order) {
            document.getElementById('orderClient').value = order.clientId || '';
            document.getElementById('orderTempName').value = order.tempName || '';
            document.getElementById('orderDate').value = order.orderDate?.split('T')[0] || '';
            document.getElementById('orderDeliveryDate').value = order.deliveryDate?.split('T')[0] || '';
            document.getElementById('orderStatus').value = order.status || 'pending';
            document.getElementById('orderNotes').value = order.notes || '';
            document.getElementById('includeDelivery').checked = order.includeDelivery || false;
            document.getElementById('deliveryCost').value = order.deliveryCost || '';
            document.getElementById('includeOtherCost').checked = order.includeOtherCost || false;
            document.getElementById('otherCost').value = order.otherCost || '';
            document.getElementById('otherCostDescription').value = order.otherCostDescription || '';
            document.getElementById('showServicePrice').checked = order.showServicePrice !== false;
            document.getElementById('showMaterialPrice').checked = order.showMaterialPrice !== false;
            document.getElementById('showMaterialCost').checked = order.showMaterialCost || false;
            document.getElementById('showDeliveryCost').checked = order.showDeliveryCost !== false;
            currentOrderItems = order.items || [];
        }
    } else {
        document.getElementById('orderForm').reset();
        document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
        addOrderItem();
    }
    
    renderOrderItems();
    updateOrderTotals();
    openModal('orderModal');
}

function addOrderItem() {
    currentOrderItems.push({
        serviceName: '', servicePrice: 0, materialId: null, materialName: '',
        materialSource: 'mine', materialQuantity: 0, materialCost: 0, materialSellPrice: 0
    });
    renderOrderItems();
}

function renderOrderItems() {
    const container = document.getElementById('orderItemsContainer');
    const materials = DB.getAll(DB.STORES.materials);
    const servicesWithSubs = getServicesWithSubs();
    const services = servicesWithSubs.map(s => s.name);
    
    container.innerHTML = currentOrderItems.map((item, index) => {
        // Find sub-services for selected service
        const selectedService = servicesWithSubs.find(s => s.name === item.serviceName);
        const subServices = selectedService?.subServices || [];
        
        return `
        <div class="order-item-row">
            <div class="item-header">
                <span class="item-number">#${index + 1}</span>
                <button type="button" class="btn btn-danger btn-sm" onclick="removeOrderItem(${index})" ${currentOrderItems.length === 1 ? 'disabled' : ''}>
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${item.productInfo ? `
            <div style="background: var(--info-light); padding: 0.5rem; border-radius: var(--radius); margin-bottom: 0.5rem;">
                <small style="color: var(--info);"><i class="fas fa-shopping-cart"></i> من السلة: ${item.productInfo.quantity} × ${item.serviceName} ${item.productInfo.unitName ? '(' + item.productInfo.unitName + ')' : ''}</small>
            </div>
            ` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label>الخدمة</label>
                    <select onchange="updateItemService(${index}, this.value)">
                        <option value="">اختر</option>
                        ${services.map(s => `<option value="${s}" ${item.serviceName === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>السعر</label>
                    <input type="number" value="${item.servicePrice}" min="0" step="0.01" onchange="updateItemServicePrice(${index}, this.value)">
                </div>
            </div>
            ${subServices.length > 0 ? `
            <div class="subservices-container">
                <label style="font-size: 0.8125rem; color: var(--gray-600); margin-bottom: 0.5rem; display: block;">خدمات فرعية:</label>
                <div class="subservices-list">
                    ${subServices.map((sub, subIdx) => `
                        <div class="subservice-chip ${item.selectedSubServices?.includes(subIdx) ? 'selected' : ''}" onclick="toggleSubService(${index}, ${subIdx}, ${sub.price})">
                            <span>${sub.name}</span>
                            <input type="number" class="subservice-price-input" value="${item.subServicePrices?.[subIdx] ?? sub.price}" 
                                onclick="event.stopPropagation()" 
                                onchange="updateSubServicePrice(${index}, ${subIdx}, this.value)" 
                                min="0" step="0.01">
                            <span>د.ج</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            <div class="form-row">
                <div class="form-group">
                    <label>المادة</label>
                    <select onchange="updateItemMaterial(${index}, this.value)">
                        <option value="">بدون</option>
                        ${materials.map(m => `<option value="${m.id}" ${item.materialId == m.id ? 'selected' : ''}>${m.name} (${m.quantity})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>الكمية</label>
                    <input type="number" value="${item.materialQuantity}" min="0" step="0.01" onchange="updateItemMaterialQuantity(${index}, this.value)">
                </div>
            </div>
            ${item.materialId ? `
            <div class="material-source">
                <label><input type="radio" name="src${index}" value="mine" ${item.materialSource === 'mine' ? 'checked' : ''} onchange="updateItemMaterialSource(${index}, 'mine')"><span>من عندي</span></label>
                <label><input type="radio" name="src${index}" value="customer" ${item.materialSource === 'customer' ? 'checked' : ''} onchange="updateItemMaterialSource(${index}, 'customer')"><span>من الزبون</span></label>
            </div>
            ${item.materialSource === 'mine' ? `
            <div class="form-row">
                <div class="form-group">
                    <label>التكلفة</label>
                    <input type="number" value="${item.materialCost.toFixed(2)}" readonly class="readonly-field">
                </div>
                <div class="form-group">
                    <label>سعر البيع</label>
                    <input type="number" value="${item.materialSellPrice}" min="0" step="0.01" onchange="updateItemMaterialSellPrice(${index}, this.value)">
                </div>
            </div>` : ''}` : ''}
        </div>
    `}).join('');
}

// Sub-services handling
function toggleSubService(itemIndex, subIndex, defaultPrice) {
    const item = currentOrderItems[itemIndex];
    if (!item.selectedSubServices) item.selectedSubServices = [];
    if (!item.subServicePrices) item.subServicePrices = {};
    
    const idx = item.selectedSubServices.indexOf(subIndex);
    if (idx >= 0) {
        item.selectedSubServices.splice(idx, 1);
    } else {
        item.selectedSubServices.push(subIndex);
        if (item.subServicePrices[subIndex] === undefined) {
            item.subServicePrices[subIndex] = defaultPrice;
        }
    }
    renderOrderItems();
    updateOrderTotals();
}

function updateSubServicePrice(itemIndex, subIndex, price) {
    const item = currentOrderItems[itemIndex];
    if (!item.subServicePrices) item.subServicePrices = {};
    item.subServicePrices[subIndex] = parseFloat(price) || 0;
    updateOrderTotals();
}

function removeOrderItem(index) {
    if (currentOrderItems.length > 1) {
        currentOrderItems.splice(index, 1);
        renderOrderItems();
        updateOrderTotals();
    }
}

function updateItemService(index, value) { currentOrderItems[index].serviceName = value; updateOrderTotals(); }
function updateItemServicePrice(index, value) { currentOrderItems[index].servicePrice = parseFloat(value) || 0; updateOrderTotals(); }

function updateItemMaterial(index, materialId) {
    if (!materialId) {
        currentOrderItems[index].materialId = null;
        currentOrderItems[index].materialName = '';
        currentOrderItems[index].materialCost = 0;
        currentOrderItems[index].materialSellPrice = 0;
    } else {
        const material = DB.get(DB.STORES.materials, parseInt(materialId));
        if (material) {
            currentOrderItems[index].materialId = material.id;
            currentOrderItems[index].materialName = material.name;
            currentOrderItems[index].materialSellPrice = material.sellPrice || material.price || 0;
            updateMaterialCost(index);
        }
    }
    renderOrderItems();
    updateOrderTotals();
}

function updateItemMaterialQuantity(index, value) {
    currentOrderItems[index].materialQuantity = parseFloat(value) || 0;
    updateMaterialCost(index);
    renderOrderItems();
    updateOrderTotals();
}

function updateMaterialCost(index) {
    const item = currentOrderItems[index];
    if (item.materialId && item.materialSource === 'mine') {
        const material = DB.get(DB.STORES.materials, item.materialId);
        item.materialCost = (material?.price || 0) * item.materialQuantity;
    } else {
        item.materialCost = 0;
    }
}

function updateItemMaterialSource(index, source) {
    currentOrderItems[index].materialSource = source;
    if (source === 'customer') {
        currentOrderItems[index].materialCost = 0;
        currentOrderItems[index].materialSellPrice = 0;
    } else {
        updateMaterialCost(index);
    }
    renderOrderItems();
    updateOrderTotals();
}

function updateItemMaterialSellPrice(index, value) {
    currentOrderItems[index].materialSellPrice = parseFloat(value) || 0;
    updateOrderTotals();
}

function updateOrderTotals() {
    let servicesCost = 0, materialsCost = 0, materialsPrice = 0, subServicesCost = 0;
    const servicesWithSubs = getServicesWithSubs();
    
    currentOrderItems.forEach(item => {
        servicesCost += item.servicePrice || 0;
        
        // Calculate sub-services cost
        if (item.selectedSubServices && item.selectedSubServices.length > 0) {
            const selectedService = servicesWithSubs.find(s => s.name === item.serviceName);
            item.selectedSubServices.forEach(subIdx => {
                const subPrice = item.subServicePrices?.[subIdx] ?? selectedService?.subServices[subIdx]?.price ?? 0;
                subServicesCost += subPrice;
            });
        }
        
        if (item.materialSource === 'mine') {
            materialsCost += item.materialCost || 0;
            materialsPrice += (item.materialSellPrice || 0) * (item.materialQuantity || 0);
        }
    });
    
    let additionalCost = 0;
    if (document.getElementById('includeDelivery')?.checked) additionalCost += parseFloat(document.getElementById('deliveryCost').value) || 0;
    if (document.getElementById('includeOtherCost')?.checked) additionalCost += parseFloat(document.getElementById('otherCost').value) || 0;
    
    const totalPrice = servicesCost + subServicesCost + materialsPrice + additionalCost;
    const profit = totalPrice - materialsCost;
    
    document.getElementById('orderServicesCost').textContent = formatCurrency(servicesCost + subServicesCost);
    document.getElementById('orderMaterialsCost').textContent = formatCurrency(materialsCost);
    document.getElementById('orderMaterialsPrice').textContent = formatCurrency(materialsPrice);
    document.getElementById('orderAdditionalCost').textContent = formatCurrency(additionalCost);
    document.getElementById('orderTotalPrice').textContent = formatCurrency(totalPrice);
    document.getElementById('orderExpectedProfit').textContent = formatCurrency(profit);
}

function saveOrder() {
    const validItems = currentOrderItems.filter(item => item.serviceName);
    if (validItems.length === 0) { showToast('أضف خدمة واحدة على الأقل', 'warning'); return; }
    
    const servicesWithSubs = getServicesWithSubs();
    let totalCost = 0, totalPrice = 0;
    validItems.forEach(item => {
        totalPrice += item.servicePrice || 0;
        
        // Add sub-services cost
        if (item.selectedSubServices && item.selectedSubServices.length > 0) {
            const selectedService = servicesWithSubs.find(s => s.name === item.serviceName);
            item.selectedSubServices.forEach(subIdx => {
                const subPrice = item.subServicePrices?.[subIdx] ?? selectedService?.subServices[subIdx]?.price ?? 0;
                totalPrice += subPrice;
            });
        }
        
        if (item.materialSource === 'mine') {
            totalCost += item.materialCost || 0;
            totalPrice += (item.materialSellPrice || 0) * (item.materialQuantity || 0);
        }
    });
    
    const includeDelivery = document.getElementById('includeDelivery').checked;
    const deliveryCost = includeDelivery ? (parseFloat(document.getElementById('deliveryCost').value) || 0) : 0;
    const includeOtherCost = document.getElementById('includeOtherCost').checked;
    const otherCost = includeOtherCost ? (parseFloat(document.getElementById('otherCost').value) || 0) : 0;
    totalPrice += deliveryCost + otherCost;
    
    const orderData = {
        clientId: parseInt(document.getElementById('orderClient').value) || null,
        tempName: document.getElementById('orderTempName').value.trim(),
        items: validItems, totalCost, totalPrice,
        orderDate: document.getElementById('orderDate').value,
        deliveryDate: document.getElementById('orderDeliveryDate').value,
        status: document.getElementById('orderStatus').value,
        notes: document.getElementById('orderNotes').value,
        includeDelivery, deliveryCost, includeOtherCost, otherCost,
        otherCostDescription: document.getElementById('otherCostDescription').value,
        showServicePrice: document.getElementById('showServicePrice').checked,
        showMaterialPrice: document.getElementById('showMaterialPrice').checked,
        showMaterialCost: document.getElementById('showMaterialCost').checked,
        showDeliveryCost: document.getElementById('showDeliveryCost').checked
    };
    
    const orderId = document.getElementById('orderId').value;
    if (orderId) {
        orderData.id = parseInt(orderId);
        const existing = DB.get(DB.STORES.orders, orderData.id);
        if (existing?.items) existing.items.forEach(item => { if (item.materialId && item.materialSource === 'mine') updateMaterialStock(item.materialId, item.materialQuantity, 'add'); });
        DB.update(DB.STORES.orders, orderData);
        showToast('تم تحديث الطلب', 'success');
    } else {
        DB.add(DB.STORES.orders, orderData);
        showToast('تم إضافة الطلب', 'success');
    }
    
    validItems.forEach(item => { if (item.materialId && item.materialSource === 'mine') updateMaterialStock(item.materialId, item.materialQuantity, 'subtract'); });
    closeModal('orderModal');
    loadOrders();
    loadDashboard();
}

function updateMaterialStock(materialId, quantity, operation) {
    const material = DB.get(DB.STORES.materials, materialId);
    if (material) {
        material.quantity = operation === 'subtract' ? Math.max(0, (material.quantity || 0) - quantity) : (material.quantity || 0) + quantity;
        DB.update(DB.STORES.materials, material);
    }
}

function editOrder(id) { showOrderModal(id); }

function viewOrder(id) {
    const order = DB.get(DB.STORES.orders, id);
    if (!order) return;
    const clients = DB.getAll(DB.STORES.clients);
    const client = clients.find(c => c.id === order.clientId);
    const profit = (order.totalPrice || 0) - (order.totalCost || 0);
    
    document.getElementById('invoiceContent').innerHTML = `
        <div style="padding: 1rem;">
            <h3>طلب #${order.id}</h3>
            <p><strong>العميل:</strong> ${client?.name || order.tempName || 'بدون اسم'}</p>
            <p><strong>التاريخ:</strong> ${formatDate(order.orderDate)}</p>
            <p><strong>التسليم:</strong> ${formatDate(order.deliveryDate)}</p>
            <p><strong>الحالة:</strong> ${getStatusText(order.status)}</p>
            <h4 style="margin-top: 1rem;">الخدمات والمواد</h4>
            <table class="data-table" style="margin: 0.5rem 0;">
                <thead><tr><th>الخدمة</th><th>المادة</th><th>المصدر</th><th>السعر</th><th>التكلفة</th></tr></thead>
                <tbody>${order.items?.map(item => `<tr><td>${item.serviceName || '-'}</td><td>${item.materialName || '-'}</td><td>${item.materialSource === 'mine' ? 'من عندي' : 'من الزبون'}</td><td>${formatCurrency(item.servicePrice)}</td><td>${formatCurrency(item.materialCost)}</td></tr>`).join('') || ''}</tbody>
            </table>
            <div style="padding: 1rem; background: var(--gray-50); border-radius: var(--radius); margin-top: 1rem;">
                <p><strong>التكلفة:</strong> ${formatCurrency(order.totalCost)}</p>
                <p><strong>السعر:</strong> ${formatCurrency(order.totalPrice)}</p>
                <p class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}"><strong>الربح:</strong> ${formatCurrency(profit)}</p>
            </div>
        </div>
    `;
    openModal('invoiceModal');
}

function deleteOrder(id) {
    if (!confirm('هل تريد حذف هذا الطلب؟')) return;
    const order = DB.get(DB.STORES.orders, id);
    if (order?.items) order.items.forEach(item => { if (item.materialId && item.materialSource === 'mine') updateMaterialStock(item.materialId, item.materialQuantity, 'add'); });
    DB.delete(DB.STORES.orders, id);
    showToast('تم حذف الطلب', 'success');
    loadOrders();
    loadDashboard();
}

function printOrderInvoice(id) {
    const order = DB.get(DB.STORES.orders, id);
    if (!order) return;
    const clients = DB.getAll(DB.STORES.clients);
    const client = clients.find(c => c.id === order.clientId);
    const shopName = DB.getSetting('shopName') || 'المطبعة';
    const shopLogo = DB.getSetting('shopLogo') || '';
    
    let itemsHtml = '';
    order.items?.forEach(item => {
        if (order.showServicePrice !== false && item.servicePrice > 0) itemsHtml += `<tr><td>${item.serviceName}</td><td>1</td><td>${formatCurrency(item.servicePrice)}</td></tr>`;
        if (order.showMaterialPrice !== false && item.materialSource === 'mine' && item.materialSellPrice > 0) itemsHtml += `<tr><td>${item.materialName}</td><td>${item.materialQuantity}</td><td>${formatCurrency(item.materialSellPrice * item.materialQuantity)}</td></tr>`;
    });
    if (order.showDeliveryCost !== false && order.includeDelivery && order.deliveryCost > 0) itemsHtml += `<tr><td>التوصيل</td><td>1</td><td>${formatCurrency(order.deliveryCost)}</td></tr>`;
    if (order.includeOtherCost && order.otherCost > 0) itemsHtml += `<tr><td>${order.otherCostDescription || 'أخرى'}</td><td>1</td><td>${formatCurrency(order.otherCost)}</td></tr>`;
    
    document.getElementById('invoiceContent').innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1rem;">
            ${shopLogo ? `<img src="${shopLogo}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">` : ''}
            <h1 style="font-size: 1.5rem; color: #1a365d;">${shopName}</h1>
            <p style="color: #64748b;">${DB.getSetting('shopAddress') || ''}</p>
            <p style="color: #64748b;">${DB.getSetting('shopPhone') || ''}</p>
        </div>
        <div style="text-align: center; margin-bottom: 1rem;"><h2>فاتورة #${order.id}</h2></div>
        <p><strong>العميل:</strong> ${client?.name || order.tempName || 'عميل'}</p>
        <p><strong>التاريخ:</strong> ${formatDate(order.orderDate)}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
            <thead><tr style="background: #f8fafc;"><th style="padding: 0.5rem; border-bottom: 1px solid #e2e8f0; text-align: right;">البيان</th><th style="padding: 0.5rem; border-bottom: 1px solid #e2e8f0;">الكمية</th><th style="padding: 0.5rem; border-bottom: 1px solid #e2e8f0;">السعر</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: left; padding: 1rem; background: #f8fafc; border-radius: 0.5rem;"><h3>الإجمالي: ${formatCurrency(order.totalPrice)}</h3></div>
        <p style="text-align: center; margin-top: 1rem; color: #64748b;">شكراً لتعاملكم معنا</p>
    `;
    openModal('invoiceModal');
}

function printInvoice() {
    const content = document.getElementById('invoiceContent').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet"><style>body{font-family:'Tajawal',sans-serif;padding:20px;direction:rtl;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;}</style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

// ===== Products & Categories =====
function loadProducts() {
    currentCategoryId = null;
    document.getElementById('productsMainView').style.display = 'block';
    document.getElementById('categoryProductsView').style.display = 'none';
    loadCategories();
}

function loadCategories() {
    const categories = DB.getAll(DB.STORES.categories);
    const products = DB.getAll(DB.STORES.products);
    const container = document.getElementById('categoriesGrid');
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-folder-open"></i><p>لا توجد أقسام</p></div>';
        return;
    }
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card" onclick="openCategory(${cat.id})">
            <div class="category-actions">
                <button class="action-btn edit" onclick="event.stopPropagation(); editCategory(${cat.id})"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="event.stopPropagation(); deleteCategory(${cat.id})"><i class="fas fa-trash"></i></button>
            </div>
            <img src="${cat.image || 'https://via.placeholder.com/300x150?text=قسم'}" alt="${cat.name}" class="category-image">
            <div class="category-info">
                <h3>${cat.name}</h3>
                <p>${products.filter(p => p.categoryId === cat.id).length} منتج</p>
            </div>
        </div>
    `).join('');
}

function openCategory(categoryId) {
    currentCategoryId = categoryId;
    const category = DB.get(DB.STORES.categories, categoryId);
    if (!category) return;
    document.getElementById('productsMainView').style.display = 'none';
    document.getElementById('categoryProductsView').style.display = 'block';
    document.querySelector('#categoryTitle span').textContent = category.name;
    loadCategoryProducts(categoryId);
}

function backToCategories() {
    currentCategoryId = null;
    document.getElementById('productsMainView').style.display = 'block';
    document.getElementById('categoryProductsView').style.display = 'none';
}

function loadCategoryProducts(categoryId) {
    const products = DB.getAll(DB.STORES.products).filter(p => p.categoryId === categoryId);
    const container = document.getElementById('categoryProducts');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-box-open"></i><p>لا توجد منتجات</p></div>';
        return;
    }
    
    container.innerHTML = products.map(product => {
        const hasUnits = product.units && product.units.length > 0;
        const priceText = hasUnits ? `من ${formatCurrency(Math.min(...product.units.map(u => u.price)))}` : formatCurrency(product.price);
        return `
            <div class="product-card" onclick="showProductForCart(${product.id})" style="cursor: pointer;">
                <img src="${product.image || 'https://via.placeholder.com/200x140?text=منتج'}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <div class="product-price">${priceText}</div>
                    ${hasUnits ? '<span class="text-muted">' + product.units.length + ' وحدات</span>' : ''}
                </div>
                <div class="product-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); showProductForCart(${product.id})" style="background: var(--primary); color: white;">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                    <button class="action-btn edit" onclick="event.stopPropagation(); editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="event.stopPropagation(); deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function showCategoryModal(categoryId = null) {
    document.getElementById('categoryModalTitle').textContent = categoryId ? 'تعديل القسم' : 'قسم جديد';
    document.getElementById('categoryId').value = categoryId || '';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryImagePreview').style.display = 'none';
    document.getElementById('categoryImagePlaceholder').style.display = 'block';
    
    if (categoryId) {
        const category = DB.get(DB.STORES.categories, categoryId);
        if (category) {
            document.getElementById('categoryName').value = category.name || '';
            document.getElementById('categoryDescription').value = category.description || '';
            if (category.image) {
                document.getElementById('categoryImagePreview').src = category.image;
                document.getElementById('categoryImagePreview').style.display = 'block';
                document.getElementById('categoryImagePlaceholder').style.display = 'none';
            }
        }
    }
    openModal('categoryModal');
}

function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    if (!name) { showToast('أدخل اسم القسم', 'warning'); return; }
    
    const data = { name, description: document.getElementById('categoryDescription').value.trim(), image: document.getElementById('categoryImagePreview').src || '' };
    const id = document.getElementById('categoryId').value;
    
    if (id) { data.id = parseInt(id); DB.update(DB.STORES.categories, data); showToast('تم تحديث القسم', 'success'); }
    else { DB.add(DB.STORES.categories, data); showToast('تم إضافة القسم', 'success'); }
    
    closeModal('categoryModal');
    loadCategories();
}

function editCategory(id) { showCategoryModal(id); }

function deleteCategory(id) {
    if (!confirm('هل تريد حذف هذا القسم وجميع منتجاته؟')) return;
    DB.getAll(DB.STORES.products).filter(p => p.categoryId === id).forEach(p => DB.delete(DB.STORES.products, p.id));
    DB.delete(DB.STORES.categories, id);
    showToast('تم حذف القسم', 'success');
    loadCategories();
}

function showProductModal(productId = null) {
    document.getElementById('productModalTitle').textContent = productId ? 'تعديل المنتج' : 'منتج جديد';
    document.getElementById('productId').value = productId || '';
    
    const categories = DB.getAll(DB.STORES.categories);
    document.getElementById('productCategory').innerHTML = '<option value="">اختر القسم</option>' + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    if (currentCategoryId && !productId) document.getElementById('productCategory').value = currentCategoryId;
    
    document.getElementById('productForm').reset();
    document.getElementById('productImagePreview').style.display = 'none';
    document.getElementById('productImagePlaceholder').style.display = 'block';
    currentProductUnits = [];
    
    if (productId) {
        const product = DB.get(DB.STORES.products, productId);
        if (product) {
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productCategory').value = product.categoryId || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productCost').value = product.cost || '';
            document.getElementById('productDescription').value = product.description || '';
            currentProductUnits = product.units || [];
            if (product.image) {
                document.getElementById('productImagePreview').src = product.image;
                document.getElementById('productImagePreview').style.display = 'block';
                document.getElementById('productImagePlaceholder').style.display = 'none';
            }
        }
    }
    renderProductUnits();
    openModal('productModal');
}

function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const categoryId = parseInt(document.getElementById('productCategory').value);
    if (!name) { showToast('أدخل اسم المنتج', 'warning'); return; }
    if (!categoryId) { showToast('اختر القسم', 'warning'); return; }
    
    const data = { 
        name, 
        categoryId, 
        price: parseFloat(document.getElementById('productPrice').value) || 0, 
        cost: parseFloat(document.getElementById('productCost').value) || 0, 
        description: document.getElementById('productDescription').value.trim(), 
        image: document.getElementById('productImagePreview').src || '',
        units: currentProductUnits
    };
    const id = document.getElementById('productId').value;
    
    if (id) { data.id = parseInt(id); DB.update(DB.STORES.products, data); showToast('تم تحديث المنتج', 'success'); }
    else { DB.add(DB.STORES.products, data); showToast('تم إضافة المنتج', 'success'); }
    
    closeModal('productModal');
    if (currentCategoryId) loadCategoryProducts(currentCategoryId);
    loadDashboard();
}

function editProduct(id) { showProductModal(id); }

function deleteProduct(id) {
    if (!confirm('هل تريد حذف هذا المنتج؟')) return;
    DB.delete(DB.STORES.products, id);
    showToast('تم حذف المنتج', 'success');
    if (currentCategoryId) loadCategoryProducts(currentCategoryId);
    loadDashboard();
}

// ===== Inventory =====
function loadInventory() {
    const materials = DB.getAll(DB.STORES.materials);
    const tbody = document.getElementById('inventoryTableBody');
    
    if (materials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-boxes"></i><p>لا توجد مواد</p></td></tr>';
        return;
    }
    
    tbody.innerHTML = materials.map(m => {
        const isLow = m.minStock && m.quantity <= m.minStock;
        return `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${getUnitText(m.unit)}</td>
                <td class="${isLow ? 'text-danger' : ''}">${m.quantity || 0}</td>
                <td>${formatCurrency(m.price)}</td>
                <td>${formatCurrency(m.sellPrice)}</td>
                <td><span class="status-badge ${isLow ? 'high' : 'completed'}">${isLow ? 'منخفض' : 'جيد'}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editMaterial(${m.id})"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteMaterial(${m.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showMaterialModal(materialId = null) {
    document.getElementById('materialModalTitle').textContent = materialId ? 'تعديل المادة' : 'إضافة مادة';
    document.getElementById('materialId').value = materialId || '';
    
    const units = getUnits();
    document.getElementById('materialUnit').innerHTML = units.map(u => `<option value="${u.key}">${u.name}</option>`).join('');
    
    if (materialId) {
        const material = DB.get(DB.STORES.materials, materialId);
        if (material) {
            document.getElementById('materialName').value = material.name || '';
            document.getElementById('materialUnit').value = material.unit || 'piece';
            document.getElementById('materialQuantity').value = material.quantity || '';
            document.getElementById('materialPrice').value = material.price || '';
            document.getElementById('materialSellPrice').value = material.sellPrice || '';
            document.getElementById('materialMinStock').value = material.minStock || '';
        }
    } else {
        document.getElementById('materialForm').reset();
    }
    openModal('materialModal');
}

function saveMaterial() {
    const name = document.getElementById('materialName').value.trim();
    if (!name) { showToast('أدخل اسم المادة', 'warning'); return; }
    
    const data = { name, unit: document.getElementById('materialUnit').value, quantity: parseFloat(document.getElementById('materialQuantity').value) || 0, price: parseFloat(document.getElementById('materialPrice').value) || 0, sellPrice: parseFloat(document.getElementById('materialSellPrice').value) || 0, minStock: parseFloat(document.getElementById('materialMinStock').value) || 0 };
    const id = document.getElementById('materialId').value;
    
    if (id) { data.id = parseInt(id); DB.update(DB.STORES.materials, data); showToast('تم تحديث المادة', 'success'); }
    else { DB.add(DB.STORES.materials, data); showToast('تم إضافة المادة', 'success'); }
    
    closeModal('materialModal');
    loadInventory();
    loadDashboard();
}

function editMaterial(id) { showMaterialModal(id); }

function deleteMaterial(id) {
    if (!confirm('هل تريد حذف هذه المادة؟')) return;
    DB.delete(DB.STORES.materials, id);
    showToast('تم حذف المادة', 'success');
    loadInventory();
}

// ===== Suppliers =====
function loadSuppliers() {
    const suppliers = DB.getAll(DB.STORES.suppliers);
    const tbody = document.getElementById('suppliersTableBody');
    
    if (suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i class="fas fa-truck"></i><p>لا يوجد موردين</p></td></tr>';
        return;
    }
    
    tbody.innerHTML = suppliers.map(s => `
        <tr>
            <td>
                <div class="avatar-cell">
                    ${s.avatar ? `<img src="${s.avatar}" class="avatar-small">` : `<div class="avatar-placeholder"><i class="fas fa-truck"></i></div>`}
                    <strong>${s.name || '-'}</strong>
                </div>
            </td>
            <td>${s.phone || '-'}</td>
            <td>${s.address || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editSupplier(${s.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteSupplier(${s.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showSupplierModal(supplierId = null) {
    document.getElementById('supplierModalTitle').textContent = supplierId ? 'تعديل المورد' : 'مورد جديد';
    document.getElementById('supplierId').value = supplierId || '';
    document.getElementById('supplierAvatarPreview').style.display = 'none';
    document.getElementById('supplierAvatarPlaceholder').style.display = 'block';
    
    if (supplierId) {
        const supplier = DB.get(DB.STORES.suppliers, supplierId);
        if (supplier) {
            document.getElementById('supplierName').value = supplier.name || '';
            document.getElementById('supplierPhone').value = supplier.phone || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierNotes').value = supplier.notes || '';
            if (supplier.avatar) {
                document.getElementById('supplierAvatarPreview').src = supplier.avatar;
                document.getElementById('supplierAvatarPreview').style.display = 'block';
                document.getElementById('supplierAvatarPlaceholder').style.display = 'none';
            }
        }
    } else {
        document.getElementById('supplierForm').reset();
    }
    openModal('supplierModal');
}

function saveSupplier() {
    const name = document.getElementById('supplierName').value.trim();
    if (!name) { showToast('أدخل اسم المورد', 'warning'); return; }
    
    const data = { name, phone: document.getElementById('supplierPhone').value.trim(), address: document.getElementById('supplierAddress').value.trim(), notes: document.getElementById('supplierNotes').value.trim(), avatar: document.getElementById('supplierAvatarPreview').src || '' };
    const id = document.getElementById('supplierId').value;
    
    if (id) { data.id = parseInt(id); DB.update(DB.STORES.suppliers, data); showToast('تم تحديث المورد', 'success'); }
    else { DB.add(DB.STORES.suppliers, data); showToast('تم إضافة المورد', 'success'); }
    
    closeModal('supplierModal');
    loadSuppliers();
}

function editSupplier(id) { showSupplierModal(id); }

function deleteSupplier(id) {
    if (!confirm('هل تريد حذف هذا المورد؟')) return;
    DB.delete(DB.STORES.suppliers, id);
    showToast('تم حذف المورد', 'success');
    loadSuppliers();
}

// ===== Clients =====
function loadClients() {
    const clients = DB.getAll(DB.STORES.clients);
    const orders = DB.getAll(DB.STORES.orders);
    const tbody = document.getElementById('clientsTableBody');
    
    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-users"></i><p>لا يوجد عملاء</p></td></tr>';
        return;
    }
    
    tbody.innerHTML = clients.map(c => `
        <tr>
            <td>
                <div class="avatar-cell">
                    ${c.avatar ? `<img src="${c.avatar}" class="avatar-small">` : `<div class="avatar-placeholder"><i class="fas fa-user"></i></div>`}
                    <strong>${c.name || '-'}</strong>
                </div>
            </td>
            <td>${c.phone || '-'}</td>
            <td>${c.address || '-'}</td>
            <td>${orders.filter(o => o.clientId === c.id).length}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editClient(${c.id})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteClient(${c.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showClientModal(clientId = null) {
    document.getElementById('clientModalTitle').textContent = clientId ? 'تعديل العميل' : 'عميل جديد';
    document.getElementById('clientId').value = clientId || '';
    document.getElementById('clientAvatarPreview').style.display = 'none';
    document.getElementById('clientAvatarPlaceholder').style.display = 'block';
    
    if (clientId) {
        const client = DB.get(DB.STORES.clients, clientId);
        if (client) {
            document.getElementById('clientName').value = client.name || '';
            document.getElementById('clientPhone').value = client.phone || '';
            document.getElementById('clientAddress').value = client.address || '';
            if (client.avatar) {
                document.getElementById('clientAvatarPreview').src = client.avatar;
                document.getElementById('clientAvatarPreview').style.display = 'block';
                document.getElementById('clientAvatarPlaceholder').style.display = 'none';
            }
        }
    } else {
        document.getElementById('clientForm').reset();
    }
    openModal('clientModal');
}

function saveClient() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    if (!name && !phone) { showToast('أدخل اسم أو هاتف العميل', 'warning'); return; }
    
    const data = { name, phone, address: document.getElementById('clientAddress').value.trim(), avatar: document.getElementById('clientAvatarPreview').src || '' };
    const id = document.getElementById('clientId').value;
    
    if (id) { data.id = parseInt(id); DB.update(DB.STORES.clients, data); showToast('تم تحديث العميل', 'success'); }
    else { DB.add(DB.STORES.clients, data); showToast('تم إضافة العميل', 'success'); }
    
    closeModal('clientModal');
    loadClients();
}

function editClient(id) { showClientModal(id); }

function deleteClient(id) {
    if (!confirm('هل تريد حذف هذا العميل؟')) return;
    DB.delete(DB.STORES.clients, id);
    showToast('تم حذف العميل', 'success');
    loadClients();
}

// ===== Tasks =====
function loadTasks() { filterTasks(); }

function filterTasks() {
    const tasks = DB.getAll(DB.STORES.tasks);
    const search = document.getElementById('tasksSearch')?.value.toLowerCase() || '';
    const priority = document.getElementById('taskPriorityFilter')?.value || '';
    
    let filtered = tasks;
    if (search) filtered = filtered.filter(t => t.title?.toLowerCase().includes(search));
    if (priority) filtered = filtered.filter(t => t.priority === priority);
    
    const pending = filtered.filter(t => t.status === 'pending');
    const inProgress = filtered.filter(t => t.status === 'in_progress');
    const completed = filtered.filter(t => t.status === 'completed');
    
    document.getElementById('pendingCount').textContent = pending.length;
    document.getElementById('inProgressCount').textContent = inProgress.length;
    document.getElementById('completedCount').textContent = completed.length;
    
    document.getElementById('pendingTasks').innerHTML = renderTaskCards(pending);
    document.getElementById('inProgressTasks').innerHTML = renderTaskCards(inProgress);
    document.getElementById('completedTasks').innerHTML = renderTaskCards(completed);
}

function renderTaskCards(tasks) {
    if (tasks.length === 0) return '<p style="text-align: center; color: var(--gray-400); padding: 1rem;">لا توجد مهام</p>';
    
    return tasks.map(task => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
        return `
            <div class="task-card ${task.priority}">
                <h4>${task.title}</h4>
                <p>${task.description || ''}</p>
                <div class="task-card-footer">
                    <span class="task-due ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-calendar"></i> ${task.dueDate ? formatDate(task.dueDate) : 'بدون تاريخ'}
                    </span>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editTask(${task.id})"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteTask(${task.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showTaskModal(taskId = null) {
    document.getElementById('taskModalTitle').textContent = taskId ? 'تعديل المهمة' : 'مهمة جديدة';
    document.getElementById('taskId').value = taskId || '';
    
    const orders = DB.getAll(DB.STORES.orders);
    document.getElementById('taskOrderId').innerHTML = '<option value="">بدون ربط</option>' + orders.map(o => `<option value="${o.id}">#${o.id}</option>`).join('');
    
    if (taskId) {
        const task = DB.get(DB.STORES.tasks, taskId);
        if (task) {
            document.getElementById('taskTitle').value = task.title || '';
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskPriority').value = task.priority || 'medium';
            document.getElementById('taskStatus').value = task.status || 'pending';
            document.getElementById('taskDueDate').value = task.dueDate?.split('T')[0] || '';
            document.getElementById('taskOrderId').value = task.orderId || '';
        }
    } else {
        document.getElementById('taskForm').reset();
    }
    openModal('taskModal');
}

function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) { showToast('أدخل عنوان المهمة', 'warning'); return; }
    
    const data = { title, description: document.getElementById('taskDescription').value.trim(), priority: document.getElementById('taskPriority').value, status: document.getElementById('taskStatus').value, dueDate: document.getElementById('taskDueDate').value, orderId: parseInt(document.getElementById('taskOrderId').value) || null };
    const id = document.getElementById('taskId').value;
    
    if (id) { data.id = parseInt(id); DB.update(DB.STORES.tasks, data); showToast('تم تحديث المهمة', 'success'); }
    else { DB.add(DB.STORES.tasks, data); showToast('تم إضافة المهمة', 'success'); }
    
    closeModal('taskModal');
    loadTasks();
    loadDashboard();
}

function editTask(id) { showTaskModal(id); }

function deleteTask(id) {
    if (!confirm('هل تريد حذف هذه المهمة؟')) return;
    DB.delete(DB.STORES.tasks, id);
    showToast('تم حذف المهمة', 'success');
    loadTasks();
    loadDashboard();
}

// ===== Notes =====
function loadNotes() {
    loadNoteTags();
    filterNotes();
}

function loadNoteTags() {
    const tags = DB.getAll(DB.STORES.tags);
    const select = document.getElementById('noteTagFilter');
    const noteSelect = document.getElementById('noteTag');
    
    select.innerHTML = '<option value="">كل التصنيفات</option>' + tags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    noteSelect.innerHTML = '<option value="">بدون تصنيف</option>' + tags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function filterNotes() {
    const notes = DB.getAll(DB.STORES.notes);
    const tags = DB.getAll(DB.STORES.tags);
    const search = document.getElementById('notesSearch')?.value.toLowerCase() || '';
    const tagFilter = document.getElementById('noteTagFilter')?.value || '';
    
    let filtered = notes;
    if (search) filtered = filtered.filter(n => n.title?.toLowerCase().includes(search) || n.content?.toLowerCase().includes(search));
    if (tagFilter) filtered = filtered.filter(n => n.tagId == tagFilter);
    
    const container = document.getElementById('notesGrid');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-sticky-note"></i><p>لا توجد ملاحظات</p></div>';
        return;
    }
    
    container.innerHTML = filtered.reverse().map(note => {
        const tag = tags.find(t => t.id === note.tagId);
        return `
            <div class="note-card">
                <div class="note-card-header">
                    <h4>${note.title || 'بدون عنوان'}</h4>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editNote(${note.id})"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="deleteNote(${note.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="note-card-body">
                    <p>${note.content || ''}</p>
                </div>
                <div class="note-card-footer">
                    <span>${formatDate(note.createdAt)}</span>
                    ${tag ? `<span class="note-tag">${tag.name}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function showNoteModal(noteId = null) {
    document.getElementById('noteModalTitle').textContent = noteId ? 'تعديل الملاحظة' : 'ملاحظة جديدة';
    document.getElementById('noteId').value = noteId || '';
    loadNoteTags();
    
    if (noteId) {
        const note = DB.get(DB.STORES.notes, noteId);
        if (note) {
            document.getElementById('noteTitle').value = note.title || '';
            document.getElementById('noteContent').value = note.content || '';
            document.getElementById('noteTag').value = note.tagId || '';
        }
    } else {
        document.getElementById('noteForm').reset();
    }
    openModal('noteModal');
}

function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    if (!title && !content) { showToast('أدخل عنوان أو محتوى', 'warning'); return; }
    
    const data = { title, content, tagId: parseInt(document.getElementById('noteTag').value) || null };
    const id = document.getElementById('noteId').value;
    
    if (id) { data.id = parseInt(id); DB.update(DB.STORES.notes, data); showToast('تم تحديث الملاحظة', 'success'); }
    else { DB.add(DB.STORES.notes, data); showToast('تم إضافة الملاحظة', 'success'); }
    
    closeModal('noteModal');
    loadNotes();
}

function editNote(id) { showNoteModal(id); }

function deleteNote(id) {
    if (!confirm('هل تريد حذف هذه الملاحظة؟')) return;
    DB.delete(DB.STORES.notes, id);
    showToast('تم حذف الملاحظة', 'success');
    loadNotes();
}

function showNoteTagModal() {
    const tags = DB.getAll(DB.STORES.tags);
    document.getElementById('noteTagsList').innerHTML = tags.map(t => `
        <span class="item-tag">${t.name}<button onclick="deleteNoteTag(${t.id})">×</button></span>
    `).join('') || '<p style="color: var(--gray-400);">لا توجد تصنيفات</p>';
    openModal('noteTagModal');
}

function addNoteTag() {
    const name = document.getElementById('newTagName').value.trim();
    if (!name) return;
    DB.add(DB.STORES.tags, { name });
    document.getElementById('newTagName').value = '';
    showNoteTagModal();
    showToast('تم إضافة التصنيف', 'success');
}

function deleteNoteTag(id) {
    DB.delete(DB.STORES.tags, id);
    showNoteTagModal();
    loadNotes();
}

// ===== Calendar =====
function loadCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    document.getElementById('calendarMonth').textContent = new Date(year, month).toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    const orders = DB.getAll(DB.STORES.orders);
    const tasks = DB.getAll(DB.STORES.tasks);
    
    let html = '';
    const startDay = (firstDay + 1) % 7; // Adjust for Saturday start
    
    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month"><span class="day-number">${prevMonthDays - i}</span></div>`;
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        
        const dayOrders = orders.filter(o => o.deliveryDate?.split('T')[0] === dateStr);
        const dayTasks = tasks.filter(t => t.dueDate?.split('T')[0] === dateStr);
        
        let events = '';
        dayOrders.slice(0, 2).forEach(o => events += `<div class="calendar-event delivery">تسليم #${o.id}</div>`);
        dayTasks.slice(0, 2).forEach(t => events += `<div class="calendar-event task">${t.title}</div>`);
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}" onclick="showDayDetails('${dateStr}')">
                <span class="day-number">${day}</span>
                ${events}
            </div>
        `;
    }
    
    // Next month days
    const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
    for (let i = 1; i <= totalCells - startDay - daysInMonth; i++) {
        html += `<div class="calendar-day other-month"><span class="day-number">${i}</span></div>`;
    }
    
    document.getElementById('calendarDays').innerHTML = html;
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function goToToday() {
    currentCalendarDate = new Date();
    renderCalendar();
}

function showDayDetails(dateStr) {
    const orders = DB.getAll(DB.STORES.orders).filter(o => o.deliveryDate?.split('T')[0] === dateStr);
    const tasks = DB.getAll(DB.STORES.tasks).filter(t => t.dueDate?.split('T')[0] === dateStr);
    const clients = DB.getAll(DB.STORES.clients);
    
    let html = `<h4 style="margin-bottom: 1rem;">${formatDate(dateStr)}</h4>`;
    
    if (orders.length > 0) {
        html += '<h5 style="color: var(--success); margin-bottom: 0.5rem;"><i class="fas fa-truck"></i> التسليمات</h5>';
        html += orders.map(o => {
            const client = clients.find(c => c.id === o.clientId);
            return `<p style="padding: 0.5rem; background: var(--success-light); border-radius: var(--radius); margin-bottom: 0.5rem;">طلب #${o.id} - ${client?.name || o.tempName || 'بدون اسم'}</p>`;
        }).join('');
    }
    
    if (tasks.length > 0) {
        html += '<h5 style="color: var(--warning); margin: 1rem 0 0.5rem;"><i class="fas fa-tasks"></i> المهام</h5>';
        html += tasks.map(t => `<p style="padding: 0.5rem; background: var(--warning-light); border-radius: var(--radius); margin-bottom: 0.5rem;">${t.title}</p>`).join('');
    }
    
    if (orders.length === 0 && tasks.length === 0) {
        html += '<p style="color: var(--gray-400); text-align: center;">لا توجد أحداث في هذا اليوم</p>';
    }
    
    document.getElementById('dayModalTitle').textContent = 'تفاصيل اليوم';
    document.getElementById('dayModalContent').innerHTML = html;
    openModal('dayModal');
}

// ===== Settings =====
function loadSettings() {
    document.getElementById('shopName').value = DB.getSetting('shopName') || '';
    document.getElementById('shopAddress').value = DB.getSetting('shopAddress') || '';
    document.getElementById('shopPhone').value = DB.getSetting('shopPhone') || '';
    document.getElementById('shopEmail').value = DB.getSetting('shopEmail') || '';
    
    const logo = DB.getSetting('shopLogo');
    if (logo) {
        document.getElementById('shopLogoPreview').src = logo;
        document.getElementById('shopLogoPreview').style.display = 'block';
        document.getElementById('logoPlaceholder').style.display = 'none';
    }
    
    loadServicesWithSubsList();
    loadUnitsList();
}

function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`.settings-tab[onclick="switchSettingsTab('${tab}')"]`).classList.add('active');
    document.getElementById(`settings-${tab}`).classList.add('active');
}

function saveSettings() {
    DB.saveSetting('shopName', document.getElementById('shopName').value);
    DB.saveSetting('shopAddress', document.getElementById('shopAddress').value);
    DB.saveSetting('shopPhone', document.getElementById('shopPhone').value);
    DB.saveSetting('shopEmail', document.getElementById('shopEmail').value);
    updateSidebarLogo();
    showToast('تم حفظ الإعدادات', 'success');
}

// Old functions kept for backward compatibility
function loadServicesList() {
    loadServicesWithSubsList();
}

function addService() {
    addServiceWithSubs();
}

function removeService(index) {
    removeServiceWithSubs(index);
}

function loadUnitsList() {
    const units = getUnits();
    document.getElementById('unitsList').innerHTML = units.map((u, i) => `
        <span class="item-tag">${u.name}<button onclick="removeUnit(${i})">×</button></span>
    `).join('');
}

function addUnit() {
    const name = document.getElementById('newUnitName').value.trim();
    if (!name) return;
    const units = getUnits();
    const key = 'custom_' + Date.now();
    units.push({ key, name });
    DB.saveSetting('customUnits', JSON.stringify(units));
    document.getElementById('newUnitName').value = '';
    loadUnitsList();
    showToast('تم إضافة الوحدة', 'success');
}

function removeUnit(index) {
    const units = getUnits();
    units.splice(index, 1);
    DB.saveSetting('customUnits', JSON.stringify(units));
    loadUnitsList();
}

// ===== Backup =====
function exportBackup() {
    const data = {
        orders: DB.getAll(DB.STORES.orders),
        clients: DB.getAll(DB.STORES.clients),
        materials: DB.getAll(DB.STORES.materials),
        suppliers: DB.getAll(DB.STORES.suppliers),
        categories: DB.getAll(DB.STORES.categories),
        products: DB.getAll(DB.STORES.products),
        tasks: DB.getAll(DB.STORES.tasks),
        notes: DB.getAll(DB.STORES.notes),
        tags: DB.getAll(DB.STORES.tags),
        settings: DB.getAll(DB.STORES.settings),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `printshop_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير النسخة الاحتياطية', 'success');
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!confirm('سيتم استبدال جميع البيانات الحالية. هل تريد المتابعة؟')) return;
            
            DB.importData(data);
            showToast('تم استيراد البيانات بنجاح', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (err) {
            showToast('خطأ في قراءة الملف', 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات؟')) return;
    if (!confirm('تحذير أخير: سيتم حذف كل شيء بشكل نهائي!')) return;
    
    DB.clearAll();
    showToast('تم حذف جميع البيانات', 'success');
    setTimeout(() => location.reload(), 1000);
}

// ===== Shopping Cart =====
function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
    document.getElementById('cartOverlay').classList.toggle('active');
}

function addToCart(product, unitIndex = -1, quantity = 1) {
    let price = product.price;
    let unitName = '';
    
    if (unitIndex >= 0 && product.units && product.units[unitIndex]) {
        price = product.units[unitIndex].price;
        unitName = product.units[unitIndex].name;
    }
    
    // Check if same product with same unit already in cart
    const existingIndex = cart.findIndex(item => item.productId === product.id && item.unitIndex === unitIndex);
    
    if (existingIndex >= 0) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            image: product.image,
            price: price,
            unitName: unitName,
            unitIndex: unitIndex,
            quantity: quantity
        });
    }
    
    updateCartUI();
    showToast('تمت الإضافة إلى السلة', 'success');
}

function updateCartQty(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
    showToast('تم الحذف من السلة', 'success');
}

function clearCart() {
    if (cart.length === 0) return;
    if (!confirm('هل تريد إلغاء السلة؟')) return;
    cart = [];
    updateCartUI();
    toggleCart();
    showToast('تم إلغاء السلة', 'success');
}

function checkoutCart() {
    if (cart.length === 0) {
        showToast('السلة فارغة', 'warning');
        return;
    }
    
    // Convert cart to order items
    currentOrderItems = cart.map(item => ({
        serviceName: item.name,
        servicePrice: item.price * item.quantity,
        materialId: null,
        materialName: '',
        materialSource: 'customer',
        materialQuantity: 0,
        materialCost: 0,
        materialSellPrice: 0,
        productInfo: {
            productId: item.productId,
            unitName: item.unitName,
            quantity: item.quantity,
            unitPrice: item.price
        }
    }));
    
    // Close cart and navigate to orders
    toggleCart();
    navigateTo('orders');
    
    // Open order modal with cart items
    setTimeout(() => {
        showOrderModal();
        renderOrderItems();
        updateOrderTotals();
    }, 100);
    
    // Clear cart after checkout
    cart = [];
    updateCartUI();
}

// Product View Modal for Cart
function showProductForCart(productId) {
    const product = DB.get(DB.STORES.products, productId);
    if (!product) return;
    
    document.getElementById('productViewId').value = product.id;
    document.getElementById('productViewTitle').textContent = 'إضافة للسلة';
    document.getElementById('productViewImage').src = product.image || 'https://via.placeholder.com/300';
    document.getElementById('productViewName').textContent = product.name;
    document.getElementById('productViewDescription').textContent = product.description || '';
    document.getElementById('productViewPrice').textContent = formatCurrency(product.price);
    document.getElementById('productViewQty').textContent = '1';
    document.getElementById('selectedUnitIndex').value = '-1';
    currentViewQty = 1;
    
    // Handle units
    const unitsSection = document.getElementById('productUnitsSection');
    const unitsContainer = document.getElementById('productViewUnits');
    
    if (product.units && product.units.length > 0) {
        unitsSection.style.display = 'block';
        unitsContainer.innerHTML = product.units.map((unit, index) => `
            <div class="unit-option" onclick="selectViewUnit(${index}, ${unit.price})">
                <div class="unit-name">${unit.name}</div>
                <div class="unit-price">${formatCurrency(unit.price)}</div>
            </div>
        `).join('');
    } else {
        unitsSection.style.display = 'none';
    }
    
    openModal('productViewModal');
}

function selectViewUnit(index, price) {
    document.querySelectorAll('#productViewUnits .unit-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });
    document.getElementById('selectedUnitIndex').value = index;
    document.getElementById('productViewPrice').textContent = formatCurrency(price);
}

function increaseViewQty() {
    currentViewQty++;
    document.getElementById('productViewQty').textContent = currentViewQty;
}

function decreaseViewQty() {
    if (currentViewQty > 1) {
        currentViewQty--;
        document.getElementById('productViewQty').textContent = currentViewQty;
    }
}

function addToCartFromView() {
    const productId = parseInt(document.getElementById('productViewId').value);
    const unitIndex = parseInt(document.getElementById('selectedUnitIndex').value);
    const product = DB.get(DB.STORES.products, productId);
    
    if (!product) return;
    
    addToCart(product, unitIndex, currentViewQty);
    closeModal('productViewModal');
}

// ===== Product Units =====
function addProductUnit() {
    const name = document.getElementById('newProductUnitName').value.trim();
    const price = parseFloat(document.getElementById('newProductUnitPrice').value) || 0;
    
    if (!name) {
        showToast('أدخل اسم الوحدة', 'warning');
        return;
    }
    
    currentProductUnits.push({ name, price });
    renderProductUnits();
    document.getElementById('newProductUnitName').value = '';
    document.getElementById('newProductUnitPrice').value = '';
}

function removeProductUnit(index) {
    currentProductUnits.splice(index, 1);
    renderProductUnits();
}

function renderProductUnits() {
    const container = document.getElementById('productUnitsList');
    container.innerHTML = currentProductUnits.map((unit, index) => `
        <span class="item-tag">${unit.name} (${formatCurrency(unit.price)})<button onclick="removeProductUnit(${index})">×</button></span>
    `).join('');
}

// ===== Services with Sub-services =====
function loadServicesWithSubsList() {
    const services = getServicesWithSubs();
    const container = document.getElementById('servicesWithSubsList');
    
    container.innerHTML = services.map((service, sIndex) => `
        <div class="service-with-subs">
            <div class="service-header">
                <strong><i class="fas fa-concierge-bell"></i> ${service.name}</strong>
                <button class="btn btn-danger btn-sm" onclick="removeServiceWithSubs(${sIndex})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="subservices-container">
                <label style="font-size: 0.8125rem; color: var(--gray-600);">الخدمات الفرعية:</label>
                <div class="subservices-list" id="subsList-${sIndex}">
                    ${service.subServices.map((sub, subIndex) => `
                        <span class="item-tag">${sub.name} (${formatCurrency(sub.price)})<button onclick="removeSubService(${sIndex}, ${subIndex})">×</button></span>
                    `).join('') || '<span style="color: var(--gray-400); font-size: 0.8125rem;">لا توجد خدمات فرعية</span>'}
                </div>
                <div class="add-subservice-row">
                    <input type="text" id="newSubName-${sIndex}" placeholder="اسم الخدمة الفرعية">
                    <input type="number" id="newSubPrice-${sIndex}" placeholder="السعر" min="0" step="0.01" style="width: 100px;">
                    <button class="btn btn-secondary btn-sm" onclick="addSubService(${sIndex})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function addServiceWithSubs() {
    const name = document.getElementById('newServiceName').value.trim();
    if (!name) {
        showToast('أدخل اسم الخدمة', 'warning');
        return;
    }
    
    const services = getServicesWithSubs();
    services.push({ name, subServices: [] });
    DB.saveSetting('servicesWithSubs', JSON.stringify(services));
    document.getElementById('newServiceName').value = '';
    loadServicesWithSubsList();
    showToast('تم إضافة الخدمة', 'success');
}

function removeServiceWithSubs(index) {
    if (!confirm('هل تريد حذف هذه الخدمة؟')) return;
    const services = getServicesWithSubs();
    services.splice(index, 1);
    DB.saveSetting('servicesWithSubs', JSON.stringify(services));
    loadServicesWithSubsList();
}

function addSubService(serviceIndex) {
    const name = document.getElementById(`newSubName-${serviceIndex}`).value.trim();
    const price = parseFloat(document.getElementById(`newSubPrice-${serviceIndex}`).value) || 0;
    
    if (!name) {
        showToast('أدخل اسم الخدمة الفرعية', 'warning');
        return;
    }
    
    const services = getServicesWithSubs();
    services[serviceIndex].subServices.push({ name, price });
    DB.saveSetting('servicesWithSubs', JSON.stringify(services));
    loadServicesWithSubsList();
    showToast('تم إضافة الخدمة الفرعية', 'success');
}

function removeSubService(serviceIndex, subIndex) {
    const services = getServicesWithSubs();
    services[serviceIndex].subServices.splice(subIndex, 1);
    DB.saveSetting('servicesWithSubs', JSON.stringify(services));
    loadServicesWithSubsList();
}

// ===== Advanced Reports =====
function loadReports() {
    const period = document.getElementById('reportPeriod')?.value || 'month';
    
    // Show/hide custom date range
    const customRange = document.getElementById('customDateRange');
    customRange.style.display = period === 'custom' ? 'flex' : 'none';
    
    const orders = DB.getAll(DB.STORES.orders);
    const clients = DB.getAll(DB.STORES.clients);
    
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
        case 'custom':
            startDate = new Date(document.getElementById('reportStartDate').value || 0);
            const endDate = document.getElementById('reportEndDate').value;
            if (endDate) now.setTime(new Date(endDate).getTime() + 24 * 60 * 60 * 1000);
            break;
        default: startDate = new Date(0);
    }
    
    const delivered = orders.filter(o => o.status === 'delivered' && (!o.deliveryDate || new Date(o.deliveryDate) >= startDate));
    const allPeriodOrders = orders.filter(o => !o.orderDate || new Date(o.orderDate) >= startDate);
    
    const totalRevenue = delivered.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalCost = delivered.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const netProfit = totalRevenue - totalCost;
    const avgProfitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    const avgOrderValue = delivered.length > 0 ? (totalRevenue / delivered.length) : 0;
    
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalCost);
    document.getElementById('netProfit').textContent = formatCurrency(netProfit);
    document.getElementById('totalOrders').textContent = delivered.length;
    document.getElementById('avgProfitMargin').textContent = avgProfitMargin + '%';
    document.getElementById('avgOrderValue').textContent = formatCurrency(avgOrderValue);
    
    // Additional stats
    const orderValues = delivered.map(o => o.totalPrice || 0);
    document.getElementById('highestOrder').textContent = formatCurrency(Math.max(...orderValues, 0));
    document.getElementById('lowestOrder').textContent = formatCurrency(Math.min(...orderValues.filter(v => v > 0), 0) || 0);
    document.getElementById('pendingOrders').textContent = allPeriodOrders.filter(o => o.status === 'pending').length;
    document.getElementById('newClients').textContent = clients.filter(c => {
        const created = new Date(c.createdAt || 0);
        return created >= startDate;
    }).length;
    
    // Render charts
    renderRevenueChart(delivered);
    renderServicesChart(delivered);
    renderClientsChart(delivered, clients);
    renderOrdersStatusChart(allPeriodOrders);
    
    // Render table
    const tbody = document.getElementById('reportOrdersBody');
    if (delivered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-chart-bar"></i><p>لا توجد طلبات مسلمة</p></td></tr>';
        return;
    }
    
    tbody.innerHTML = delivered.reverse().map(o => {
        const client = clients.find(c => c.id === o.clientId);
        const profit = (o.totalPrice || 0) - (o.totalCost || 0);
        const profitPct = o.totalPrice > 0 ? ((profit / o.totalPrice) * 100).toFixed(1) : 0;
        const services = o.items?.map(i => i.serviceName).filter(Boolean).join('، ') || '-';
        return `
            <tr>
                <td>#${o.id}</td>
                <td>${client?.name || o.tempName || '-'}</td>
                <td>${services}</td>
                <td>${formatDate(o.deliveryDate)}</td>
                <td>${formatCurrency(o.totalCost)}</td>
                <td>${formatCurrency(o.totalPrice)}</td>
                <td class="${profit >= 0 ? 'profit-positive' : 'profit-negative'}">${formatCurrency(profit)}</td>
                <td>${profitPct}%</td>
            </tr>
        `;
    }).join('');
}

function renderRevenueChart(orders) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Group by date
    const grouped = {};
    orders.forEach(o => {
        const date = o.deliveryDate?.split('T')[0] || 'غير محدد';
        if (!grouped[date]) grouped[date] = { revenue: 0, profit: 0 };
        grouped[date].revenue += o.totalPrice || 0;
        grouped[date].profit += (o.totalPrice || 0) - (o.totalCost || 0);
    });
    
    const labels = Object.keys(grouped).slice(-10);
    const revenueData = labels.map(l => grouped[l].revenue);
    const profitData = labels.map(l => grouped[l].profit);
    
    if (reportCharts.revenue) reportCharts.revenue.destroy();
    
    reportCharts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'الإيرادات', data: revenueData, borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.4 },
                { label: 'الأرباح', data: profitData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', rtl: true } } }
    });
}

function renderServicesChart(orders) {
    const ctx = document.getElementById('servicesChart');
    if (!ctx) return;
    
    const serviceCounts = {};
    orders.forEach(o => {
        o.items?.forEach(item => {
            if (item.serviceName) {
                serviceCounts[item.serviceName] = (serviceCounts[item.serviceName] || 0) + 1;
            }
        });
    });
    
    const labels = Object.keys(serviceCounts);
    const data = Object.values(serviceCounts);
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
    
    if (reportCharts.services) reportCharts.services.destroy();
    
    reportCharts.services = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length) }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', rtl: true } } }
    });
}

function renderClientsChart(orders, clients) {
    const ctx = document.getElementById('clientsChart');
    if (!ctx) return;
    
    const clientRevenue = {};
    orders.forEach(o => {
        const client = clients.find(c => c.id === o.clientId);
        const name = client?.name || o.tempName || 'غير محدد';
        clientRevenue[name] = (clientRevenue[name] || 0) + (o.totalPrice || 0);
    });
    
    const sorted = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);
    
    if (reportCharts.clients) reportCharts.clients.destroy();
    
    reportCharts.clients = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'الإيرادات', data: data, backgroundColor: '#2563eb' }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

function renderOrdersStatusChart(orders) {
    const ctx = document.getElementById('ordersStatusChart');
    if (!ctx) return;
    
    const statusCounts = { pending: 0, ready: 0, delivered: 0 };
    orders.forEach(o => {
        if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
    });
    
    if (reportCharts.status) reportCharts.status.destroy();
    
    reportCharts.status = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['قيد التنفيذ', 'جاهز', 'مُسلّم'],
            datasets: [{ data: [statusCounts.pending, statusCounts.ready, statusCounts.delivered], backgroundColor: ['#f59e0b', '#06b6d4', '#10b981'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', rtl: true } } }
    });
}

function exportReportPDF() {
    showToast('جاري التحضير للطباعة...', 'info');
    window.print();
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(this.dataset.page);
        });
    });
    
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navigateTo(this.dataset.page);
        });
    });
    
    document.getElementById('toggleSidebar').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });
    
    // Load saved cart
    const savedCart = localStorage.getItem('printshop_cart');
    if (savedCart) cart = JSON.parse(savedCart);
    
    updateSidebarLogo();
    updateCartUI();
    loadDashboard();
});

// Save cart on changes
function updateCartUI() {
    const cartFab = document.getElementById('cartFab');
    const cartBadge = document.getElementById('cartBadge');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    // Save cart
    localStorage.setItem('printshop_cart', JSON.stringify(cart));
    
    // Show/hide cart fab based on current page
    if (cartFab) cartFab.style.display = currentPage === 'products' ? 'flex' : 'none';
    
    if (!cartBadge) return;
    
    cartBadge.textContent = cart.length;
    cartBadge.style.display = cart.length > 0 ? 'flex' : 'none';
    
    if (cart.length === 0) {
        if (cartItems) cartItems.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-basket"></i><p>السلة فارغة</p></div>';
        if (cartTotal) cartTotal.textContent = formatCurrency(0);
        return;
    }
    
    let total = 0;
    if (cartItems) {
        cartItems.innerHTML = cart.map((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <div class="cart-item">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.unitName || ''}</p>
                        <div class="cart-item-price">${formatCurrency(item.price)}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="cart-item-qty">
                            <button onclick="updateCartQty(${index}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartQty(${index}, 1)">+</button>
                        </div>
                        <button class="cart-item-remove" onclick="removeFromCart(${index})">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    if (cartTotal) cartTotal.textContent = formatCurrency(total);
}
