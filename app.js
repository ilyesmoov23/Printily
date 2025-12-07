/**
 * التطبيق الرئيسي - إدارة المطبعة
 * يتحكم في التنقل والوظائف العامة
 */

// المتغيرات العامة
let currentPage = 'dashboard';
let weeklyChart = null;

/**
 * تهيئة التطبيق
 */
async function initApp() {
    try {
        // تهيئة قاعدة البيانات
        await DB.init();
        await DB.initDefaults();
        
        // تهيئة التاريخ الحالي
        updateCurrentDate();
        
        // تهيئة التنقل
        initNavigation();
        
        // تهيئة القائمة الجانبية للموبايل
        initSidebar();
        
        // تهيئة البحث العام
        initGlobalSearch();
        
        // تحميل لوحة التحكم
        await loadDashboard();
        
        // تحميل الإعدادات
        await loadSettings();
        
        console.log('تم تهيئة التطبيق بنجاح');
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        showToast('حدث خطأ في تهيئة التطبيق', 'error');
    }
}

/**
 * تحديث التاريخ الحالي
 */
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = new Date().toLocaleDateString('ar-SA', options);
    }
}

/**
 * تهيئة التنقل بين الصفحات
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewAllLinks = document.querySelectorAll('.view-all');
    
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            await navigateTo(page);
        });
    });
    
    viewAllLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            await navigateTo(page);
        });
    });
}

/**
 * الانتقال إلى صفحة
 */
async function navigateTo(page) {
    // تحديث القائمة الجانبية
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // تحديث الصفحات
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    currentPage = page;
    
    // إغلاق القائمة الجانبية في الموبايل
    document.getElementById('sidebar').classList.remove('active');
    
    // تحميل بيانات الصفحة
    switch (page) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'orders':
            await loadOrders();
            break;
        case 'inventory':
            await loadInventory();
            break;
        case 'suppliers':
            await loadSuppliers();
            break;
        case 'clients':
            await loadClients();
            break;
        case 'tasks':
            await loadTasks();
            break;
        case 'notes':
            await loadNotes();
            break;
        case 'calendar':
            await loadCalendar();
            break;
        case 'reports':
            await loadReports();
            break;
        case 'settings':
            await loadSettings();
            break;
    }
}

/**
 * تهيئة القائمة الجانبية
 */
function initSidebar() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // إغلاق عند النقر خارج القائمة
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

/**
 * تهيئة البحث العام
 */
function initGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            await performGlobalSearch(query);
        }
    }, 300));
}

/**
 * البحث العام
 */
async function performGlobalSearch(query) {
    // البحث في الطلبات
    const orders = await DB.getAll(DB.STORES.orders);
    const filteredOrders = orders.filter(order => 
        order.notes?.includes(query) || 
        order.service?.includes(query)
    );
    
    // البحث في العملاء
    const clients = await DB.getAll(DB.STORES.clients);
    const filteredClients = clients.filter(client => 
        client.name?.includes(query) || 
        client.phone?.includes(query)
    );
    
    // يمكن عرض النتائج في قائمة منسدلة
    console.log('نتائج البحث:', { orders: filteredOrders, clients: filteredClients });
}

/**
 * تحميل لوحة التحكم
 */
async function loadDashboard() {
    try {
        // تحميل الإحصائيات
        await loadDashboardStats();
        
        // تحميل الطلبات الأخيرة
        await loadRecentOrders();
        
        // تحميل المهام العاجلة
        await loadUrgentTasks();
        
        // تحميل مواعيد التسليم القادمة
        await loadUpcomingDeliveries();
        
        // تحميل الرسم البياني الأسبوعي
        await loadWeeklyChart();
    } catch (error) {
        console.error('خطأ في تحميل لوحة التحكم:', error);
    }
}

/**
 * تحميل إحصائيات لوحة التحكم
 */
async function loadDashboardStats() {
    // عدد الطلبات النشطة
    const orders = await DB.getAll(DB.STORES.orders);
    const activeOrders = orders.filter(o => o.status !== 'delivered').length;
    document.getElementById('stat-orders').textContent = activeOrders;
    
    // إيرادات اليوم
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => 
        o.status === 'delivered' && 
        o.deliveryDate && 
        o.deliveryDate.split('T')[0] === today
    );
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
    document.getElementById('stat-revenue').textContent = formatCurrency(todayRevenue);
    
    // عدد العملاء
    const clientsCount = await DB.getCount(DB.STORES.clients);
    document.getElementById('stat-clients').textContent = clientsCount;
    
    // المواد منخفضة المخزون
    const materials = await DB.getAll(DB.STORES.materials);
    const lowStock = materials.filter(m => 
        m.minStock && parseFloat(m.quantity) <= parseFloat(m.minStock)
    ).length;
    document.getElementById('stat-lowstock').textContent = lowStock;
}

/**
 * تحميل الطلبات الأخيرة
 */
async function loadRecentOrders() {
    const container = document.getElementById('recentOrders');
    const orders = await DB.getAll(DB.STORES.orders);
    const clients = await DB.getAll(DB.STORES.clients);
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    const sortedOrders = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (sortedOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>لا توجد طلبات</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sortedOrders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        return `
            <div class="order-item">
                <div class="order-item-info">
                    <strong>${order.service || 'طلب'} #${order.id}</strong>
                    <span>${client?.name || 'عميل غير معروف'}</span>
                </div>
                <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
            </div>
        `;
    }).join('');
}

/**
 * تحميل المهام العاجلة
 */
async function loadUrgentTasks() {
    const container = document.getElementById('urgentTasks');
    const tasks = await DB.getAll(DB.STORES.tasks);
    
    // فلترة المهام غير المكتملة والعاجلة
    const urgentTasks = tasks
        .filter(t => t.status !== 'completed' && t.priority === 'high')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5);
    
    if (urgentTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>لا توجد مهام عاجلة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = urgentTasks.map(task => `
        <div class="task-item ${task.priority}">
            <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" 
                 onclick="toggleTaskStatus(${task.id})">
                ${task.status === 'completed' ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <h4>${task.title}</h4>
                <p>${task.dueDate ? formatDate(task.dueDate) : 'بدون تاريخ'}</p>
            </div>
        </div>
    `).join('');
}

/**
 * تحميل مواعيد التسليم القادمة
 */
async function loadUpcomingDeliveries() {
    const container = document.getElementById('upcomingDeliveries');
    const orders = await DB.getAll(DB.STORES.orders);
    const clients = await DB.getAll(DB.STORES.clients);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // الطلبات التي لم تُسلم بعد ولديها تاريخ تسليم
    const upcomingOrders = orders
        .filter(o => o.status !== 'delivered' && o.deliveryDate)
        .filter(o => new Date(o.deliveryDate) >= today)
        .sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate))
        .slice(0, 5);
    
    if (upcomingOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-check"></i>
                <p>لا توجد مواعيد تسليم قريبة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingOrders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        const daysLeft = Math.ceil((new Date(order.deliveryDate) - today) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="delivery-item">
                <div class="delivery-item-info">
                    <strong>${order.service} - ${client?.name || 'غير معروف'}</strong>
                    <span>${formatDate(order.deliveryDate)} (${daysLeft === 0 ? 'اليوم' : `باقي ${daysLeft} يوم`})</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * تحميل الرسم البياني الأسبوعي
 */
async function loadWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    // الحصول على بيانات الأسبوع
    const orders = await DB.getAll(DB.STORES.orders);
    const expenses = await DB.getAll(DB.STORES.expenses);
    const purchases = await DB.getAll(DB.STORES.purchases);
    
    const days = [];
    const revenues = [];
    const expensesData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        days.push(date.toLocaleDateString('ar-SA', { weekday: 'short' }));
        
        // إيرادات اليوم
        const dayRevenue = orders
            .filter(o => o.status === 'delivered' && o.deliveryDate?.split('T')[0] === dateStr)
            .reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
        revenues.push(dayRevenue);
        
        // مصروفات اليوم
        const dayExpenses = expenses
            .filter(e => e.date?.split('T')[0] === dateStr)
            .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const dayPurchases = purchases
            .filter(p => p.date?.split('T')[0] === dateStr)
            .reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
        expensesData.push(dayExpenses + dayPurchases);
    }
    
    // تدمير الرسم البياني السابق إن وجد
    if (weeklyChart) {
        weeklyChart.destroy();
    }
    
    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'الإيرادات',
                    data: revenues,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 4
                },
                {
                    label: 'المصروفات',
                    data: expensesData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    rtl: true,
                    labels: {
                        font: {
                            family: 'Tajawal'
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'Tajawal'
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: 'Tajawal'
                        }
                    }
                }
            }
        }
    });
}

/**
 * تحميل الإعدادات
 */
async function loadSettings() {
    // معلومات المطبعة
    const shopName = await DB.getSetting('shopName');
    const shopAddress = await DB.getSetting('shopAddress');
    const shopPhone = await DB.getSetting('shopPhone');
    const shopEmail = await DB.getSetting('shopEmail');
    
    document.getElementById('printShopName').value = shopName || '';
    document.getElementById('printShopAddress').value = shopAddress || '';
    document.getElementById('printShopPhone').value = shopPhone || '';
    document.getElementById('printShopEmail').value = shopEmail || '';
    
    // تحميل قائمة الخدمات
    await loadServicesList();
    
    // تحميل قائمة الفئات
    await loadTagsList();
}

/**
 * حفظ الإعدادات
 */
async function saveSettings() {
    try {
        await DB.saveSetting('shopName', document.getElementById('printShopName').value);
        await DB.saveSetting('shopAddress', document.getElementById('printShopAddress').value);
        await DB.saveSetting('shopPhone', document.getElementById('printShopPhone').value);
        await DB.saveSetting('shopEmail', document.getElementById('printShopEmail').value);
        
        showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error) {
        showToast('حدث خطأ في حفظ الإعدادات', 'error');
    }
}

/**
 * تحميل قائمة الخدمات
 */
async function loadServicesList() {
    const container = document.getElementById('servicesList');
    const services = await DB.getAll(DB.STORES.services);
    
    container.innerHTML = services.map(service => `
        <span class="service-tag">
            ${service.name}
            <button onclick="deleteService(${service.id})">&times;</button>
        </span>
    `).join('');
    
    // تحديث القوائم المنسدلة
    updateServiceSelects(services);
}

/**
 * إضافة خدمة جديدة
 */
async function addService() {
    const input = document.getElementById('newServiceName');
    const name = input.value.trim();
    
    if (!name) {
        showToast('أدخل اسم الخدمة', 'warning');
        return;
    }
    
    try {
        await DB.add(DB.STORES.services, { name });
        input.value = '';
        await loadServicesList();
        showToast('تم إضافة الخدمة بنجاح', 'success');
    } catch (error) {
        showToast('حدث خطأ في إضافة الخدمة', 'error');
    }
}

/**
 * حذف خدمة
 */
async function deleteService(id) {
    if (!confirm('هل تريد حذف هذه الخدمة؟')) return;
    
    try {
        await DB.delete(DB.STORES.services, id);
        await loadServicesList();
        showToast('تم حذف الخدمة', 'success');
    } catch (error) {
        showToast('حدث خطأ في حذف الخدمة', 'error');
    }
}

/**
 * تحديث قوائم الخدمات المنسدلة
 */
function updateServiceSelects(services) {
    const selects = [
        document.getElementById('orderService'),
        document.getElementById('orderServiceFilter')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        const firstOption = select.options[0];
        
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.textContent = service.name;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
}

/**
 * تحميل قائمة الفئات
 */
async function loadTagsList() {
    const container = document.getElementById('notesTagsList');
    const tags = await DB.getAll(DB.STORES.tags);
    
    if (container) {
        container.innerHTML = tags.map(tag => `
            <span class="tag-item" style="background-color: ${tag.color}20; color: ${tag.color}">
                ${tag.name}
                <button onclick="deleteTag(${tag.id})">&times;</button>
            </span>
        `).join('');
    }
    
    // تحديث القوائم المنسدلة
    updateTagSelects(tags);
}

/**
 * إضافة فئة جديدة
 */
async function addTag() {
    const nameInput = document.getElementById('newTagName');
    const colorInput = document.getElementById('newTagColor');
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) {
        showToast('أدخل اسم الفئة', 'warning');
        return;
    }
    
    try {
        await DB.add(DB.STORES.tags, { name, color });
        nameInput.value = '';
        await loadTagsList();
        showToast('تم إضافة الفئة بنجاح', 'success');
    } catch (error) {
        showToast('حدث خطأ في إضافة الفئة', 'error');
    }
}

/**
 * حذف فئة
 */
async function deleteTag(id) {
    if (!confirm('هل تريد حذف هذه الفئة؟')) return;
    
    try {
        await DB.delete(DB.STORES.tags, id);
        await loadTagsList();
        showToast('تم حذف الفئة', 'success');
    } catch (error) {
        showToast('حدث خطأ في حذف الفئة', 'error');
    }
}

/**
 * تحديث قوائم الفئات المنسدلة
 */
function updateTagSelects(tags) {
    const noteTag = document.getElementById('noteTag');
    
    if (noteTag) {
        const currentValue = noteTag.value;
        noteTag.innerHTML = '<option value="">بدون فئة</option>';
        
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.id;
            option.textContent = tag.name;
            noteTag.appendChild(option);
        });
        
        noteTag.value = currentValue;
    }
}

/**
 * عرض نافذة الإضافة السريعة
 */
function showQuickAdd() {
    openModal('quickAddModal');
}

/**
 * فتح نافذة Modal
 */
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

/**
 * إغلاق نافذة Modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * عرض رسالة Toast
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * تنسيق العملة
 */
function formatCurrency(amount) {
    return `${parseFloat(amount).toFixed(2)} د.م`;
}

/**
 * تنسيق التاريخ
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA');
}

/**
 * تنسيق التاريخ والوقت
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ar-SA');
}

/**
 * الحصول على نص الحالة
 */
function getStatusText(status) {
    const statuses = {
        pending: 'قيد التنفيذ',
        ready: 'جاهز',
        delivered: 'مُسلّم',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتملة'
    };
    return statuses[status] || status;
}

/**
 * الحصول على نص الأولوية
 */
function getPriorityText(priority) {
    const priorities = {
        high: 'عالية',
        medium: 'متوسطة',
        low: 'منخفضة'
    };
    return priorities[priority] || priority;
}

/**
 * الحصول على نص نوع العميل
 */
function getClientTypeText(type) {
    const types = {
        permanent: 'دائم',
        new: 'جديد',
        company: 'شركة',
        individual: 'فرد'
    };
    return types[type] || 'غير محدد';
}

/**
 * الحصول على نص الوحدة
 */
function getUnitText(unit) {
    const units = {
        piece: 'قطعة',
        kg: 'كيلوغرام',
        meter: 'متر',
        liter: 'لتر',
        box: 'علبة',
        roll: 'لفة'
    };
    return units[unit] || unit;
}

/**
 * تأخير تنفيذ الدالة
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * إنشاء معرف فريد
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);

// تصدير الدوال للاستخدام الخارجي
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getStatusText = getStatusText;
window.getPriorityText = getPriorityText;
window.getClientTypeText = getClientTypeText;
window.getUnitText = getUnitText;
window.navigateTo = navigateTo;
window.saveSettings = saveSettings;
window.addService = addService;
window.deleteService = deleteService;
window.addTag = addTag;
window.deleteTag = deleteTag;
window.showQuickAdd = showQuickAdd;
