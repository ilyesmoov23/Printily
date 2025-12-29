/**
 * إدارة النسخ الاحتياطي والاستعادة
 */

/**
 * تصدير نسخة احتياطية
 */
async function exportBackup() {
    try {
        showToast('جاري إنشاء النسخة الاحتياطية...', 'info');
        
        // الحصول على جميع البيانات
        const data = await DB.exportAll();
        
        // إضافة معلومات النسخة
        const backup = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            appName: 'نظام إدارة المطبعة',
            data: data
        };
        
        // تحويل إلى JSON
        const jsonString = JSON.stringify(backup, null, 2);
        
        // إنشاء رابط التنزيل
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_printshop_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('تم تصدير النسخة الاحتياطية بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير النسخة الاحتياطية:', error);
        showToast('حدث خطأ في تصدير النسخة الاحتياطية', 'error');
    }
}

/**
 * استيراد نسخة احتياطية
 */
async function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // التحقق من نوع الملف
    if (!file.name.endsWith('.json')) {
        showToast('يجب اختيار ملف JSON', 'warning');
        return;
    }
    
    // تأكيد الاستيراد
    if (!confirm('سيؤدي استيراد النسخة الاحتياطية إلى استبدال جميع البيانات الحالية. هل تريد المتابعة؟')) {
        event.target.value = '';
        return;
    }
    
    try {
        showToast('جاري استيراد النسخة الاحتياطية...', 'info');
        
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                // التحقق من صحة الملف
                if (!backup.data || !backup.version) {
                    showToast('ملف النسخة الاحتياطية غير صالح', 'error');
                    return;
                }
                
                // استيراد البيانات
                await DB.importAll(backup.data);
                
                showToast('تم استيراد النسخة الاحتياطية بنجاح', 'success');
                
                // إعادة تحميل الصفحة لتحديث البيانات
                setTimeout(() => {
                    location.reload();
                }, 1500);
                
            } catch (parseError) {
                console.error('خطأ في قراءة الملف:', parseError);
                showToast('ملف النسخة الاحتياطية تالف أو غير صالح', 'error');
            }
        };
        
        reader.onerror = () => {
            showToast('حدث خطأ في قراءة الملف', 'error');
        };
        
        reader.readAsText(file);
        
    } catch (error) {
        console.error('خطأ في استيراد النسخة الاحتياطية:', error);
        showToast('حدث خطأ في استيراد النسخة الاحتياطية', 'error');
    }
    
    // مسح اختيار الملف
    event.target.value = '';
}

/**
 * مسح جميع البيانات
 */
async function clearAllData() {
    if (!confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
        return;
    }
    
    if (!confirm('تأكيد نهائي: سيتم حذف جميع الطلبات، العملاء، المواد، والمصروفات. هل تريد المتابعة؟')) {
        return;
    }
    
    try {
        await DB.clearAll();
        await DB.initDefaults();
        
        showToast('تم مسح جميع البيانات', 'success');
        
        setTimeout(() => {
            location.reload();
        }, 1500);
    } catch (error) {
        console.error('خطأ في مسح البيانات:', error);
        showToast('حدث خطأ في مسح البيانات', 'error');
    }
}

// تصدير الدوال
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.clearAllData = clearAllData;
