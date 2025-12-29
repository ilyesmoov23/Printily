/**
 * إدارة الملاحظات
 */

/**
 * تحميل الملاحظات
 */
async function loadNotes() {
    try {
        await loadNoteSelects();
        await refreshNotesGrid();
        await loadTagsFilter();
        initNoteFilters();
    } catch (error) {
        console.error('خطأ في تحميل الملاحظات:', error);
        showToast('حدث خطأ في تحميل الملاحظات', 'error');
    }
}

/**
 * تحميل القوائم المنسدلة للملاحظات
 */
async function loadNoteSelects() {
    // تحميل الفئات
    const tags = await DB.getAll(DB.STORES.tags);
    const noteTag = document.getElementById('noteTag');
    
    if (noteTag) {
        noteTag.innerHTML = '<option value="">بدون فئة</option>';
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.id;
            option.textContent = tag.name;
            noteTag.appendChild(option);
        });
    }
    
    // إعداد تغيير نوع الربط
    const linkTypeSelect = document.getElementById('noteLinkType');
    if (linkTypeSelect) {
        linkTypeSelect.addEventListener('change', updateNoteLinkOptions);
    }
}

/**
 * تحديث خيارات الربط
 */
async function updateNoteLinkOptions() {
    const linkType = document.getElementById('noteLinkType').value;
    const linkSelectGroup = document.getElementById('noteLinkSelectGroup');
    const linkSelect = document.getElementById('noteLinkId');
    
    if (!linkType) {
        linkSelectGroup.style.display = 'none';
        return;
    }
    
    linkSelectGroup.style.display = 'block';
    linkSelect.innerHTML = '<option value="">اختر...</option>';
    
    if (linkType === 'order') {
        const orders = await DB.getAll(DB.STORES.orders);
        orders.forEach(order => {
            const option = document.createElement('option');
            option.value = order.id;
            option.textContent = `#${order.id} - ${order.service}`;
            linkSelect.appendChild(option);
        });
    } else if (linkType === 'client') {
        const clients = await DB.getAll(DB.STORES.clients);
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name || client.phone || `عميل #${client.id}`;
            linkSelect.appendChild(option);
        });
    }
}

/**
 * تحميل فلتر الفئات
 */
async function loadTagsFilter() {
    const container = document.getElementById('tagsFilter');
    if (!container) return;
    
    const tags = await DB.getAll(DB.STORES.tags);
    
    container.innerHTML = `
        <button class="tag-filter-btn active" data-tag="">الكل</button>
        ${tags.map(tag => `
            <button class="tag-filter-btn" data-tag="${tag.id}" style="--tag-color: ${tag.color}">
                ${tag.name}
            </button>
        `).join('')}
    `;
    
    // إضافة أحداث النقر
    container.querySelectorAll('.tag-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            refreshNotesGrid();
        });
    });
}

/**
 * تحديث شبكة الملاحظات
 */
async function refreshNotesGrid() {
    const container = document.getElementById('notesGrid');
    const notes = await DB.getAll(DB.STORES.notes);
    const tags = await DB.getAll(DB.STORES.tags);
    const clients = await DB.getAll(DB.STORES.clients);
    const orders = await DB.getAll(DB.STORES.orders);
    
    // تطبيق الفلاتر
    const searchQuery = document.getElementById('notesSearch')?.value?.toLowerCase() || '';
    const activeTagBtn = document.querySelector('.tag-filter-btn.active');
    const selectedTag = activeTagBtn?.dataset.tag || '';
    
    let filteredNotes = notes;
    
    if (searchQuery) {
        filteredNotes = filteredNotes.filter(note => 
            note.title?.toLowerCase().includes(searchQuery) ||
            note.content?.toLowerCase().includes(searchQuery)
        );
    }
    
    if (selectedTag) {
        filteredNotes = filteredNotes.filter(n => n.tag == selectedTag);
    }
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-sticky-note"></i>
                <p>لا توجد ملاحظات</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredNotes.map(note => {
        const tag = tags.find(t => t.id == note.tag);
        let linkText = '';
        
        if (note.linkType === 'order' && note.linkId) {
            const order = orders.find(o => o.id == note.linkId);
            linkText = order ? `طلب #${order.id}` : '';
        } else if (note.linkType === 'client' && note.linkId) {
            const client = clients.find(c => c.id == note.linkId);
            linkText = client ? client.name : '';
        }
        
        return `
            <div class="note-card" style="border-top-color: ${tag?.color || 'var(--primary)'}">
                <div class="note-header">
                    <h3>${note.title || 'بدون عنوان'}</h3>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="editNote(${note.id})" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteNote(${note.id})" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">
                    ${note.content || ''}
                </div>
                <div class="note-footer">
                    <div>
                        ${tag ? `<span class="note-tag" style="background-color: ${tag.color}20; color: ${tag.color}">${tag.name}</span>` : ''}
                        ${linkText ? `<span class="note-tag"><i class="fas fa-link"></i> ${linkText}</span>` : ''}
                    </div>
                    <span class="note-date">${formatDate(note.createdAt)}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * تهيئة فلاتر الملاحظات
 */
function initNoteFilters() {
    document.getElementById('notesSearch')?.addEventListener('input', debounce(refreshNotesGrid, 300));
}

/**
 * عرض نافذة إضافة ملاحظة
 */
async function showNoteModal(noteId = null) {
    document.getElementById('noteModalTitle').textContent = noteId ? 'تعديل الملاحظة' : 'ملاحظة جديدة';
    document.getElementById('noteId').value = noteId || '';
    
    await loadNoteSelects();
    
    if (noteId) {
        const note = await DB.get(DB.STORES.notes, noteId);
        if (note) {
            document.getElementById('noteTitle').value = note.title || '';
            document.getElementById('noteContent').value = note.content || '';
            document.getElementById('noteTag').value = note.tag || '';
            document.getElementById('noteLinkType').value = note.linkType || '';
            
            if (note.linkType) {
                await updateNoteLinkOptions();
                document.getElementById('noteLinkId').value = note.linkId || '';
            }
        }
    } else {
        document.getElementById('noteForm').reset();
        document.getElementById('noteLinkSelectGroup').style.display = 'none';
    }
    
    openModal('noteModal');
}

/**
 * حفظ الملاحظة
 */
async function saveNote() {
    const id = document.getElementById('noteId').value;
    
    const noteData = {
        title: document.getElementById('noteTitle').value.trim(),
        content: document.getElementById('noteContent').value,
        tag: document.getElementById('noteTag').value || null,
        linkType: document.getElementById('noteLinkType').value || null,
        linkId: parseInt(document.getElementById('noteLinkId').value) || null
    };
    
    if (!noteData.title && !noteData.content) {
        showToast('أدخل عنوان أو محتوى الملاحظة', 'warning');
        return;
    }
    
    try {
        if (id) {
            const existingNote = await DB.get(DB.STORES.notes, parseInt(id));
            noteData.id = parseInt(id);
            noteData.createdAt = existingNote.createdAt;
            await DB.update(DB.STORES.notes, noteData);
            showToast('تم تحديث الملاحظة بنجاح', 'success');
        } else {
            await DB.add(DB.STORES.notes, noteData);
            showToast('تم إضافة الملاحظة بنجاح', 'success');
        }
        
        closeModal('noteModal');
        await refreshNotesGrid();
    } catch (error) {
        console.error('خطأ في حفظ الملاحظة:', error);
        showToast('حدث خطأ في حفظ الملاحظة', 'error');
    }
}

/**
 * تعديل ملاحظة
 */
async function editNote(id) {
    await showNoteModal(id);
}

/**
 * حذف ملاحظة
 */
async function deleteNote(id) {
    if (!confirm('هل تريد حذف هذه الملاحظة؟')) return;
    
    try {
        await DB.delete(DB.STORES.notes, id);
        showToast('تم حذف الملاحظة', 'success');
        await refreshNotesGrid();
    } catch (error) {
        showToast('حدث خطأ في حذف الملاحظة', 'error');
    }
}

// تصدير الدوال
window.loadNotes = loadNotes;
window.showNoteModal = showNoteModal;
window.saveNote = saveNote;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.refreshNotesGrid = refreshNotesGrid;
window.updateNoteLinkOptions = updateNoteLinkOptions;
