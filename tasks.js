/**
 * إدارة المهام
 */

/**
 * تحميل المهام
 */
async function loadTasks() {
    try {
        await loadTaskSelects();
        await refreshTasksBoard();
        initTaskFilters();
    } catch (error) {
        console.error('خطأ في تحميل المهام:', error);
        showToast('حدث خطأ في تحميل المهام', 'error');
    }
}

/**
 * تحميل القوائم المنسدلة للمهام
 */
async function loadTaskSelects() {
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
 * تحديث لوحة المهام
 */
async function refreshTasksBoard() {
    const container = document.getElementById('tasksBoard');
    const tasks = await DB.getAll(DB.STORES.tasks);
    const orders = await DB.getAll(DB.STORES.orders);
    
    // تطبيق الفلاتر
    const searchQuery = document.getElementById('tasksSearch')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('taskStatusFilter')?.value || '';
    const priorityFilter = document.getElementById('taskPriorityFilter')?.value || '';
    
    let filteredTasks = tasks;
    
    if (searchQuery) {
        filteredTasks = filteredTasks.filter(task => 
            task.title?.toLowerCase().includes(searchQuery) ||
            task.description?.toLowerCase().includes(searchQuery) ||
            task.notes?.toLowerCase().includes(searchQuery)
        );
    }
    
    if (statusFilter) {
        filteredTasks = filteredTasks.filter(t => t.status === statusFilter);
    }
    
    if (priorityFilter) {
        filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
    }
    
    // ترتيب حسب الأولوية ثم التاريخ
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filteredTasks.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999');
    });
    
    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tasks"></i>
                <p>لا توجد مهام</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTasks.map(task => {
        const linkedOrder = task.orderId ? orders.find(o => o.id === task.orderId) : null;
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
        
        return `
            <div class="task-item ${task.priority} ${task.status === 'completed' ? 'completed' : ''}">
                <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" 
                     onclick="toggleTaskStatus(${task.id})">
                    ${task.status === 'completed' ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-content">
                    <h4>${task.title}</h4>
                    ${task.description ? `<p>${task.description}</p>` : ''}
                    <div class="task-meta">
                        <span class="status-badge ${task.priority}">${getPriorityText(task.priority)}</span>
                        <span class="status-badge ${task.status}">${getTaskStatusText(task.status)}</span>
                        ${task.dueDate ? `
                            <span style="${isOverdue ? 'color: var(--danger);' : ''}">
                                <i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}
                                ${isOverdue ? '(متأخر)' : ''}
                            </span>
                        ` : ''}
                        ${linkedOrder ? `
                            <span>
                                <i class="fas fa-link"></i> طلب #${linkedOrder.id}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="action-btn edit" onclick="editTask(${task.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteTask(${task.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * تهيئة فلاتر المهام
 */
function initTaskFilters() {
    document.getElementById('tasksSearch')?.addEventListener('input', debounce(refreshTasksBoard, 300));
    document.getElementById('taskStatusFilter')?.addEventListener('change', refreshTasksBoard);
    document.getElementById('taskPriorityFilter')?.addEventListener('change', refreshTasksBoard);
}

/**
 * عرض نافذة إضافة مهمة
 */
async function showTaskModal(taskId = null) {
    document.getElementById('taskModalTitle').textContent = taskId ? 'تعديل المهمة' : 'مهمة جديدة';
    document.getElementById('taskId').value = taskId || '';
    
    await loadTaskSelects();
    
    if (taskId) {
        const task = await DB.get(DB.STORES.tasks, taskId);
        if (task) {
            document.getElementById('taskTitle').value = task.title || '';
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskStatus').value = task.status || 'pending';
            document.getElementById('taskPriority').value = task.priority || 'medium';
            document.getElementById('taskDueDate').value = task.dueDate?.split('T')[0] || '';
            document.getElementById('taskOrderId').value = task.orderId || '';
            document.getElementById('taskNotes').value = task.notes || '';
        }
    } else {
        document.getElementById('taskForm').reset();
        document.getElementById('taskStatus').value = 'pending';
        document.getElementById('taskPriority').value = 'medium';
    }
    
    openModal('taskModal');
}

/**
 * حفظ المهمة
 */
async function saveTask() {
    const id = document.getElementById('taskId').value;
    
    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        dueDate: document.getElementById('taskDueDate').value,
        orderId: parseInt(document.getElementById('taskOrderId').value) || null,
        notes: document.getElementById('taskNotes').value
    };
    
    if (!taskData.title) {
        showToast('أدخل عنوان المهمة', 'warning');
        return;
    }
    
    try {
        if (id) {
            const existingTask = await DB.get(DB.STORES.tasks, parseInt(id));
            taskData.id = parseInt(id);
            taskData.createdAt = existingTask.createdAt;
            await DB.update(DB.STORES.tasks, taskData);
            showToast('تم تحديث المهمة بنجاح', 'success');
        } else {
            await DB.add(DB.STORES.tasks, taskData);
            showToast('تم إضافة المهمة بنجاح', 'success');
        }
        
        closeModal('taskModal');
        await refreshTasksBoard();
        await loadDashboard();
    } catch (error) {
        console.error('خطأ في حفظ المهمة:', error);
        showToast('حدث خطأ في حفظ المهمة', 'error');
    }
}

/**
 * تعديل مهمة
 */
async function editTask(id) {
    await showTaskModal(id);
}

/**
 * حذف مهمة
 */
async function deleteTask(id) {
    if (!confirm('هل تريد حذف هذه المهمة؟')) return;
    
    try {
        await DB.delete(DB.STORES.tasks, id);
        showToast('تم حذف المهمة', 'success');
        await refreshTasksBoard();
        await loadDashboard();
    } catch (error) {
        showToast('حدث خطأ في حذف المهمة', 'error');
    }
}

/**
 * تبديل حالة المهمة
 */
async function toggleTaskStatus(id) {
    try {
        const task = await DB.get(DB.STORES.tasks, id);
        task.status = task.status === 'completed' ? 'pending' : 'completed';
        await DB.update(DB.STORES.tasks, task);
        await refreshTasksBoard();
        await loadDashboard();
        showToast(task.status === 'completed' ? 'تم إكمال المهمة' : 'تم إعادة فتح المهمة', 'info');
    } catch (error) {
        showToast('حدث خطأ', 'error');
    }
}

/**
 * الحصول على نص حالة المهمة
 */
function getTaskStatusText(status) {
    const statuses = {
        pending: 'قيد الانتظار',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتملة'
    };
    return statuses[status] || status;
}

// تصدير الدوال
window.loadTasks = loadTasks;
window.showTaskModal = showTaskModal;
window.saveTask = saveTask;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.toggleTaskStatus = toggleTaskStatus;
window.refreshTasksBoard = refreshTasksBoard;
window.getTaskStatusText = getTaskStatusText;
