/**
 * إدارة التقويم
 */

let currentCalendarDate = new Date();

/**
 * تحميل التقويم
 */
async function loadCalendar() {
    try {
        await renderCalendar();
    } catch (error) {
        console.error('خطأ في تحميل التقويم:', error);
        showToast('حدث خطأ في تحميل التقويم', 'error');
    }
}

/**
 * عرض التقويم
 */
async function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('currentMonth');
    
    // عرض الشهر والسنة
    const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    monthDisplay.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
    
    // الحصول على البيانات
    const orders = await DB.getAll(DB.STORES.orders);
    const tasks = await DB.getAll(DB.STORES.tasks);
    const clients = await DB.getAll(DB.STORES.clients);
    
    // حساب أيام الشهر
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // اليوم الأول من الأسبوع (0 = الأحد)
    let startDay = firstDay.getDay();
    
    // بناء الأيام
    let days = [];
    
    // أيام الشهر السابق
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month - 1, prevMonthLastDay - i),
            isOtherMonth: true
        });
    }
    
    // أيام الشهر الحالي
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({
            date: new Date(year, month, i),
            isOtherMonth: false
        });
    }
    
    // أيام الشهر التالي
    const remainingDays = 42 - days.length; // 6 أسابيع كاملة
    for (let i = 1; i <= remainingDays; i++) {
        days.push({
            date: new Date(year, month + 1, i),
            isOtherMonth: true
        });
    }
    
    // اليوم الحالي
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // عرض الأيام
    grid.innerHTML = days.map(day => {
        const dateStr = day.date.toISOString().split('T')[0];
        const isToday = day.date.getTime() === today.getTime();
        
        // الحصول على أحداث اليوم
        const dayOrders = orders.filter(o => 
            o.orderDate?.split('T')[0] === dateStr
        );
        
        const dayDeliveries = orders.filter(o => 
            o.deliveryDate?.split('T')[0] === dateStr && o.status !== 'delivered'
        );
        
        const dayTasks = tasks.filter(t => 
            t.dueDate?.split('T')[0] === dateStr && t.status !== 'completed'
        );
        
        // إنشاء أحداث العرض
        let events = [];
        
        dayDeliveries.forEach(order => {
            const client = clients.find(c => c.id === order.clientId);
            events.push({
                type: 'delivery',
                text: `تسليم: ${client?.name || order.service}`
            });
        });
        
        dayTasks.forEach(task => {
            events.push({
                type: 'task',
                text: task.title
            });
        });
        
        dayOrders.forEach(order => {
            events.push({
                type: 'order',
                text: `طلب: ${order.service}`
            });
        });
        
        return `
            <div class="calendar-day ${day.isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}"
                 onclick="showDayDetails('${dateStr}')">
                <span class="day-number">${day.date.getDate()}</span>
                <div class="day-events">
                    ${events.slice(0, 3).map(event => `
                        <div class="day-event ${event.type}">${event.text}</div>
                    `).join('')}
                    ${events.length > 3 ? `<div class="day-event" style="text-align: center;">+${events.length - 3} المزيد</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * تغيير الشهر
 */
function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

/**
 * الانتقال إلى اليوم الحالي
 */
function goToToday() {
    currentCalendarDate = new Date();
    renderCalendar();
}

/**
 * عرض تفاصيل اليوم
 */
async function showDayDetails(dateStr) {
    const orders = await DB.getAll(DB.STORES.orders);
    const tasks = await DB.getAll(DB.STORES.tasks);
    const clients = await DB.getAll(DB.STORES.clients);
    
    // الطلبات الجديدة
    const dayOrders = orders.filter(o => o.orderDate?.split('T')[0] === dateStr);
    
    // مواعيد التسليم
    const dayDeliveries = orders.filter(o => o.deliveryDate?.split('T')[0] === dateStr);
    
    // المهام
    const dayTasks = tasks.filter(t => t.dueDate?.split('T')[0] === dateStr);
    
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    let content = '';
    
    // مواعيد التسليم
    if (dayDeliveries.length > 0) {
        content += `
            <div class="day-details-section">
                <h3><i class="fas fa-truck" style="color: var(--success);"></i> مواعيد التسليم (${dayDeliveries.length})</h3>
                <div class="day-details-list">
                    ${dayDeliveries.map(order => {
                        const client = clients.find(c => c.id === order.clientId);
                        return `
                            <div class="day-details-item" style="border-right: 3px solid var(--success);">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>#${order.id} - ${order.service}</strong>
                                    <span class="status-badge ${order.status}">${getStatusText(order.status)}</span>
                                </div>
                                <p style="margin-top: 0.25rem; color: var(--gray-500);">
                                    العميل: ${client?.name || 'غير معروف'} | المبلغ: ${formatCurrency(order.price)}
                                </p>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // المهام
    if (dayTasks.length > 0) {
        content += `
            <div class="day-details-section">
                <h3><i class="fas fa-tasks" style="color: var(--primary);"></i> المهام (${dayTasks.length})</h3>
                <div class="day-details-list">
                    ${dayTasks.map(task => `
                        <div class="day-details-item" style="border-right: 3px solid ${task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warning)' : 'var(--success)'};">
                            <div style="display: flex; justify-content: space-between;">
                                <strong>${task.title}</strong>
                                <span class="status-badge ${task.priority}">${getPriorityText(task.priority)}</span>
                            </div>
                            ${task.description ? `<p style="margin-top: 0.25rem; color: var(--gray-500);">${task.description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // الطلبات الجديدة
    if (dayOrders.length > 0) {
        content += `
            <div class="day-details-section">
                <h3><i class="fas fa-shopping-cart" style="color: var(--warning);"></i> طلبات جديدة (${dayOrders.length})</h3>
                <div class="day-details-list">
                    ${dayOrders.map(order => {
                        const client = clients.find(c => c.id === order.clientId);
                        return `
                            <div class="day-details-item" style="border-right: 3px solid var(--warning);">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>#${order.id} - ${order.service}</strong>
                                    <span>${formatCurrency(order.price)}</span>
                                </div>
                                <p style="margin-top: 0.25rem; color: var(--gray-500);">
                                    العميل: ${client?.name || 'غير معروف'}
                                </p>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    if (!content) {
        content = `
            <div class="empty-state">
                <i class="fas fa-calendar-day"></i>
                <p>لا توجد أحداث في هذا اليوم</p>
            </div>
        `;
    }
    
    document.getElementById('dayDetailsTitle').textContent = dateFormatted;
    document.getElementById('dayDetailsContent').innerHTML = content;
    openModal('dayDetailsModal');
}

// تصدير الدوال
window.loadCalendar = loadCalendar;
window.changeMonth = changeMonth;
window.goToToday = goToToday;
window.showDayDetails = showDayDetails;
