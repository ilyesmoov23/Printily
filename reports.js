/**
 * إدارة التقارير المالية
 * مع عرض الربح لكل طلبية
 */

let revenueExpensesChart = null;
let servicesChart = null;

/**
 * تحميل التقارير
 */
async function loadReports() {
    try {
        // تعيين التواريخ الافتراضية
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('reportStartDate').value = startOfMonth.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = today.toISOString().split('T')[0];
        
        // تحميل التقرير
        await generateReport();
        
        // تحميل المصروفات
        await refreshExpensesTable();
        
        // تحميل تقرير الأرباح
        await loadProfitReport();
        
        // إعداد أحداث تغيير الفترة
        document.getElementById('reportPeriod').addEventListener('change', handlePeriodChange);
    } catch (error) {
        console.error('خطأ في تحميل التقارير:', error);
        showToast('حدث خطأ في تحميل التقارير', 'error');
    }
}

/**
 * معالجة تغيير الفترة
 */
function handlePeriodChange() {
    const period = document.getElementById('reportPeriod').value;
    const today = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'daily':
            startDate = today;
            endDate = today;
            break;
        case 'weekly':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = today;
            break;
        case 'monthly':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
            break;
        case 'yearly':
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = today;
            break;
        case 'custom':
            // السماح للمستخدم باختيار التواريخ
            return;
    }
    
    document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = endDate.toISOString().split('T')[0];
    
    generateReport();
}

/**
 * إنشاء التقرير
 */
async function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        showToast('حدد فترة التقرير', 'warning');
        return;
    }
    
    // الحصول على البيانات
    const orders = await DB.getAll(DB.STORES.orders);
    const expenses = await DB.getAll(DB.STORES.expenses);
    const purchases = await DB.getAll(DB.STORES.purchases);
    
    // فلترة البيانات حسب الفترة
    const filteredOrders = orders.filter(o => {
        if (!o.deliveryDate || o.status !== 'delivered') return false;
        const orderDate = o.deliveryDate.split('T')[0];
        return orderDate >= startDate && orderDate <= endDate;
    });
    
    const filteredExpenses = expenses.filter(e => {
        if (!e.date) return false;
        const expenseDate = e.date.split('T')[0];
        return expenseDate >= startDate && expenseDate <= endDate;
    });
    
    const filteredPurchases = purchases.filter(p => {
        if (!p.date) return false;
        const purchaseDate = p.date.split('T')[0];
        return purchaseDate >= startDate && purchaseDate <= endDate;
    });
    
    // حساب الإحصائيات
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || parseFloat(o.price) || 0), 0);
    const totalOrdersCost = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.totalCost) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
    const totalCosts = totalExpenses + totalPurchases;
    const grossProfit = totalRevenue - totalOrdersCost; // الربح الإجمالي من الطلبات
    const netProfit = totalRevenue - totalCosts; // صافي الربح
    
    // تحديث العرض
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalCosts);
    document.getElementById('netProfit').textContent = formatCurrency(netProfit);
    document.getElementById('ordersCount').textContent = filteredOrders.length;
    
    // تحديث الرسوم البيانية
    await updateRevenueExpensesChart(startDate, endDate, orders, expenses, purchases);
    await updateServicesChart(filteredOrders);
    
    // تحديث تقرير الأرباح
    await loadProfitReport(startDate, endDate);
}

/**
 * تحميل تقرير الأرباح لكل طلبية
 */
async function loadProfitReport(startDate, endDate) {
    const profitTableBody = document.getElementById('profitReportTableBody');
    if (!profitTableBody) return;
    
    const orders = await DB.getAll(DB.STORES.orders);
    const clients = await DB.getAll(DB.STORES.clients);
    
    // استخدام التواريخ من الفلتر إن لم تُمرر
    if (!startDate) startDate = document.getElementById('reportStartDate').value;
    if (!endDate) endDate = document.getElementById('reportEndDate').value;
    
    // فلترة الطلبات المُسلّمة في الفترة
    const deliveredOrders = orders.filter(o => {
        if (!o.deliveryDate || o.status !== 'delivered') return false;
        const orderDate = o.deliveryDate.split('T')[0];
        return orderDate >= startDate && orderDate <= endDate;
    }).sort((a, b) => new Date(b.deliveryDate) - new Date(a.deliveryDate));
    
    if (deliveredOrders.length === 0) {
        profitTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>لا توجد طلبات مُسلّمة في هذه الفترة</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let totalProfit = 0;
    
    profitTableBody.innerHTML = deliveredOrders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        const revenue = parseFloat(order.totalPrice) || parseFloat(order.price) || 0;
        const cost = parseFloat(order.totalCost) || 0;
        const profit = revenue - cost;
        const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
        const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
        
        totalProfit += profit;
        
        // ملخص الخدمات
        let servicesSummary = order.service || '-';
        if (order.items && order.items.length > 0) {
            servicesSummary = order.items.map(i => i.serviceName || i.materialName).slice(0, 2).join('، ');
            if (order.items.length > 2) servicesSummary += '...';
        }
        
        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${client?.name || 'غير معروف'}</td>
                <td>${servicesSummary}</td>
                <td>${formatCurrency(revenue)}</td>
                <td>${formatCurrency(cost)}</td>
                <td class="${profitClass}"><strong>${formatCurrency(profit)}</strong></td>
                <td class="${profitClass}">${profitMargin}%</td>
            </tr>
        `;
    }).join('');
    
    // إضافة صف الإجمالي
    const totalProfitClass = totalProfit >= 0 ? 'profit-positive' : 'profit-negative';
    profitTableBody.innerHTML += `
        <tr class="total-row">
            <td colspan="5"><strong>الإجمالي</strong></td>
            <td class="${totalProfitClass}"><strong>${formatCurrency(totalProfit)}</strong></td>
            <td></td>
        </tr>
    `;
}

/**
 * تحديث رسم الإيرادات والمصروفات
 */
async function updateRevenueExpensesChart(startDate, endDate, orders, expenses, purchases) {
    const ctx = document.getElementById('revenueExpensesChart');
    if (!ctx) return;
    
    // حساب عدد الأيام
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    let labels = [];
    let revenueData = [];
    let expensesData = [];
    let profitData = [];
    
    // تحديد تجميع البيانات حسب الفترة
    if (daysDiff <= 31) {
        // عرض يومي
        for (let i = 0; i < daysDiff; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            labels.push(date.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' }));
            
            const dayRevenue = orders
                .filter(o => o.status === 'delivered' && o.deliveryDate?.split('T')[0] === dateStr)
                .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || parseFloat(o.price) || 0), 0);
            
            const dayExpenses = expenses
                .filter(e => e.date?.split('T')[0] === dateStr)
                .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            
            const dayPurchases = purchases
                .filter(p => p.date?.split('T')[0] === dateStr)
                .reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
            
            revenueData.push(dayRevenue);
            expensesData.push(dayExpenses + dayPurchases);
            profitData.push(dayRevenue - (dayExpenses + dayPurchases));
        }
    } else {
        // عرض أسبوعي أو شهري
        const weeks = Math.ceil(daysDiff / 7);
        for (let i = 0; i < weeks; i++) {
            const weekStart = new Date(start);
            weekStart.setDate(start.getDate() + (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            labels.push(`أسبوع ${i + 1}`);
            
            let weekRevenue = 0;
            let weekExpenses = 0;
            
            for (let j = 0; j < 7; j++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + j);
                if (date > end) break;
                
                const dateStr = date.toISOString().split('T')[0];
                
                weekRevenue += orders
                    .filter(o => o.status === 'delivered' && o.deliveryDate?.split('T')[0] === dateStr)
                    .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || parseFloat(o.price) || 0), 0);
                
                weekExpenses += expenses
                    .filter(e => e.date?.split('T')[0] === dateStr)
                    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
                
                weekExpenses += purchases
                    .filter(p => p.date?.split('T')[0] === dateStr)
                    .reduce((sum, p) => sum + (parseFloat(p.total) || 0), 0);
            }
            
            revenueData.push(weekRevenue);
            expensesData.push(weekExpenses);
            profitData.push(weekRevenue - weekExpenses);
        }
    }
    
    // تدمير الرسم السابق
    if (revenueExpensesChart) {
        revenueExpensesChart.destroy();
    }
    
    revenueExpensesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'الإيرادات',
                    data: revenueData,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'المصروفات',
                    data: expensesData,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'الربح',
                    data: profitData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: false,
                    tension: 0.4,
                    borderDash: [5, 5]
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
                        font: { family: 'Tajawal' }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: 'Tajawal' }
                    }
                },
                x: {
                    ticks: {
                        font: { family: 'Tajawal' }
                    }
                }
            }
        }
    });
}

/**
 * تحديث رسم توزيع الخدمات
 */
async function updateServicesChart(orders) {
    const ctx = document.getElementById('servicesChart');
    if (!ctx) return;
    
    // تجميع الطلبات حسب الخدمة
    const serviceStats = {};
    orders.forEach(order => {
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const service = item.serviceName || item.materialName || 'أخرى';
                if (!serviceStats[service]) {
                    serviceStats[service] = 0;
                }
                serviceStats[service] += parseFloat(item.totalPrice) || 0;
            });
        } else {
            const service = order.service || 'أخرى';
            if (!serviceStats[service]) {
                serviceStats[service] = 0;
            }
            serviceStats[service] += parseFloat(order.price) || 0;
        }
    });
    
    const labels = Object.keys(serviceStats);
    const data = Object.values(serviceStats);
    
    const colors = [
        'rgba(37, 99, 235, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(6, 182, 212, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(34, 197, 94, 0.8)'
    ];
    
    // تدمير الرسم السابق
    if (servicesChart) {
        servicesChart.destroy();
    }
    
    servicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    rtl: true,
                    labels: {
                        font: { family: 'Tajawal' },
                        padding: 15
                    }
                }
            }
        }
    });
}

/**
 * تحديث جدول المصروفات
 */
async function refreshExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    
    const expenses = await DB.getAll(DB.STORES.expenses);
    
    // ترتيب حسب التاريخ
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>لا توجد مصروفات</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const categoryNames = {
        general: 'عام',
        rent: 'إيجار',
        utilities: 'فواتير',
        salaries: 'رواتب',
        maintenance: 'صيانة',
        purchases: 'مشتريات',
        other: 'أخرى'
    };
    
    tbody.innerHTML = expenses.slice(0, 20).map(expense => `
        <tr>
            <td>${formatDate(expense.date)}</td>
            <td>${expense.description || '-'}</td>
            <td>${categoryNames[expense.category] || expense.category}</td>
            <td>${formatCurrency(expense.amount)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editExpense(${expense.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteExpense(${expense.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * عرض نافذة إضافة مصروف
 */
function showExpenseModal(expenseId = null) {
    document.getElementById('expenseId').value = expenseId || '';
    
    if (expenseId) {
        DB.get(DB.STORES.expenses, expenseId).then(expense => {
            if (expense) {
                document.getElementById('expenseDescription').value = expense.description || '';
                document.getElementById('expenseCategory').value = expense.category || 'general';
                document.getElementById('expenseAmount').value = expense.amount || '';
                document.getElementById('expenseDate').value = expense.date?.split('T')[0] || '';
                document.getElementById('expenseNotes').value = expense.notes || '';
            }
        });
    } else {
        document.getElementById('expenseForm').reset();
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    }
    
    openModal('expenseModal');
}

/**
 * حفظ المصروف
 */
async function saveExpense() {
    const id = document.getElementById('expenseId').value;
    
    const expenseData = {
        description: document.getElementById('expenseDescription').value.trim(),
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value) || 0,
        date: document.getElementById('expenseDate').value,
        notes: document.getElementById('expenseNotes').value
    };
    
    if (!expenseData.description) {
        showToast('أدخل وصف المصروف', 'warning');
        return;
    }
    
    if (!expenseData.amount || expenseData.amount <= 0) {
        showToast('أدخل مبلغ صحيح', 'warning');
        return;
    }
    
    try {
        if (id) {
            const existingExpense = await DB.get(DB.STORES.expenses, parseInt(id));
            expenseData.id = parseInt(id);
            expenseData.createdAt = existingExpense.createdAt;
            await DB.update(DB.STORES.expenses, expenseData);
            showToast('تم تحديث المصروف بنجاح', 'success');
        } else {
            await DB.add(DB.STORES.expenses, expenseData);
            showToast('تم إضافة المصروف بنجاح', 'success');
        }
        
        closeModal('expenseModal');
        await refreshExpensesTable();
        await generateReport();
    } catch (error) {
        console.error('خطأ في حفظ المصروف:', error);
        showToast('حدث خطأ في حفظ المصروف', 'error');
    }
}

/**
 * تعديل مصروف
 */
async function editExpense(id) {
    showExpenseModal(id);
}

/**
 * حذف مصروف
 */
async function deleteExpense(id) {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return;
    
    try {
        await DB.delete(DB.STORES.expenses, id);
        showToast('تم حذف المصروف', 'success');
        await refreshExpensesTable();
        await generateReport();
    } catch (error) {
        showToast('حدث خطأ في حذف المصروف', 'error');
    }
}

/**
 * تصدير إلى Excel
 */
async function exportToExcel() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        const orders = await DB.getAll(DB.STORES.orders);
        const expenses = await DB.getAll(DB.STORES.expenses);
        const purchases = await DB.getAll(DB.STORES.purchases);
        const clients = await DB.getAll(DB.STORES.clients);
        const materials = await DB.getAll(DB.STORES.materials);
        
        // فلترة البيانات
        const filteredOrders = orders.filter(o => {
            const date = o.deliveryDate?.split('T')[0] || o.orderDate?.split('T')[0];
            return date >= startDate && date <= endDate;
        });
        
        const filteredExpenses = expenses.filter(e => {
            const date = e.date?.split('T')[0];
            return date >= startDate && date <= endDate;
        });
        
        // إعداد بيانات الطلبات مع الربح
        const ordersData = filteredOrders.map(o => {
            const client = clients.find(c => c.id === o.clientId);
            const revenue = parseFloat(o.totalPrice) || parseFloat(o.price) || 0;
            const cost = parseFloat(o.totalCost) || 0;
            const profit = revenue - cost;
            
            return {
                'رقم الطلب': o.id,
                'العميل': client?.name || '',
                'الخدمات': o.items ? o.items.map(i => i.serviceName || i.materialName).join(', ') : o.service,
                'الإيراد': revenue,
                'التكلفة': cost,
                'الربح': profit,
                'نسبة الربح': revenue > 0 ? ((profit / revenue) * 100).toFixed(1) + '%' : '0%',
                'تاريخ الطلب': o.orderDate,
                'تاريخ التسليم': o.deliveryDate,
                'الحالة': getStatusText(o.status)
            };
        });
        
        const expensesData = filteredExpenses.map(e => ({
            'التاريخ': e.date,
            'الوصف': e.description,
            'الفئة': e.category,
            'المبلغ': e.amount
        }));
        
        // إنشاء ملف Excel
        const wb = XLSX.utils.book_new();
        
        const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
        XLSX.utils.book_append_sheet(wb, ordersSheet, 'الطلبات والأرباح');
        
        const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(wb, expensesSheet, 'المصروفات');
        
        // تنزيل الملف
        XLSX.writeFile(wb, `تقرير_${startDate}_${endDate}.xlsx`);
        
        showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير Excel:', error);
        showToast('حدث خطأ في تصدير التقرير', 'error');
    }
}

/**
 * تصدير إلى PDF
 */
async function exportToPDF() {
    showToast('جاري إعداد التقرير للطباعة...', 'info');
    
    // فتح نافذة الطباعة
    setTimeout(() => {
        window.print();
    }, 500);
}

// تصدير الدوال
window.loadReports = loadReports;
window.generateReport = generateReport;
window.showExpenseModal = showExpenseModal;
window.saveExpense = saveExpense;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
window.loadProfitReport = loadProfitReport;
