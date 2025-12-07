/**
 * نظام قاعدة البيانات المحلية - IndexedDB
 * يدير جميع عمليات التخزين والاسترجاع للبيانات
 */

const DB_NAME = 'PrintShopDB';
const DB_VERSION = 1;

// تعريف المخازن (الجداول)
const STORES = {
    orders: 'orders',
    clients: 'clients',
    materials: 'materials',
    suppliers: 'suppliers',
    purchases: 'purchases',
    tasks: 'tasks',
    notes: 'notes',
    expenses: 'expenses',
    settings: 'settings',
    services: 'services',
    tags: 'tags'
};

let db = null;

/**
 * تهيئة قاعدة البيانات
 */
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('فشل في فتح قاعدة البيانات:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('تم فتح قاعدة البيانات بنجاح');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // إنشاء مخزن الطلبات
            if (!database.objectStoreNames.contains(STORES.orders)) {
                const ordersStore = database.createObjectStore(STORES.orders, { keyPath: 'id', autoIncrement: true });
                ordersStore.createIndex('clientId', 'clientId', { unique: false });
                ordersStore.createIndex('status', 'status', { unique: false });
                ordersStore.createIndex('deliveryDate', 'deliveryDate', { unique: false });
                ordersStore.createIndex('orderDate', 'orderDate', { unique: false });
            }

            // إنشاء مخزن العملاء
            if (!database.objectStoreNames.contains(STORES.clients)) {
                const clientsStore = database.createObjectStore(STORES.clients, { keyPath: 'id', autoIncrement: true });
                clientsStore.createIndex('name', 'name', { unique: false });
                clientsStore.createIndex('phone', 'phone', { unique: false });
                clientsStore.createIndex('type', 'type', { unique: false });
            }

            // إنشاء مخزن المواد
            if (!database.objectStoreNames.contains(STORES.materials)) {
                const materialsStore = database.createObjectStore(STORES.materials, { keyPath: 'id', autoIncrement: true });
                materialsStore.createIndex('name', 'name', { unique: false });
                materialsStore.createIndex('needsCheck', 'needsCheck', { unique: false });
            }

            // إنشاء مخزن الموردين
            if (!database.objectStoreNames.contains(STORES.suppliers)) {
                const suppliersStore = database.createObjectStore(STORES.suppliers, { keyPath: 'id', autoIncrement: true });
                suppliersStore.createIndex('name', 'name', { unique: false });
            }

            // إنشاء مخزن المشتريات
            if (!database.objectStoreNames.contains(STORES.purchases)) {
                const purchasesStore = database.createObjectStore(STORES.purchases, { keyPath: 'id', autoIncrement: true });
                purchasesStore.createIndex('materialId', 'materialId', { unique: false });
                purchasesStore.createIndex('supplierId', 'supplierId', { unique: false });
                purchasesStore.createIndex('date', 'date', { unique: false });
            }

            // إنشاء مخزن المهام
            if (!database.objectStoreNames.contains(STORES.tasks)) {
                const tasksStore = database.createObjectStore(STORES.tasks, { keyPath: 'id', autoIncrement: true });
                tasksStore.createIndex('status', 'status', { unique: false });
                tasksStore.createIndex('priority', 'priority', { unique: false });
                tasksStore.createIndex('dueDate', 'dueDate', { unique: false });
                tasksStore.createIndex('orderId', 'orderId', { unique: false });
            }

            // إنشاء مخزن الملاحظات
            if (!database.objectStoreNames.contains(STORES.notes)) {
                const notesStore = database.createObjectStore(STORES.notes, { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('tag', 'tag', { unique: false });
                notesStore.createIndex('linkType', 'linkType', { unique: false });
                notesStore.createIndex('linkId', 'linkId', { unique: false });
            }

            // إنشاء مخزن المصروفات
            if (!database.objectStoreNames.contains(STORES.expenses)) {
                const expensesStore = database.createObjectStore(STORES.expenses, { keyPath: 'id', autoIncrement: true });
                expensesStore.createIndex('category', 'category', { unique: false });
                expensesStore.createIndex('date', 'date', { unique: false });
            }

            // إنشاء مخزن الإعدادات
            if (!database.objectStoreNames.contains(STORES.settings)) {
                database.createObjectStore(STORES.settings, { keyPath: 'key' });
            }

            // إنشاء مخزن الخدمات
            if (!database.objectStoreNames.contains(STORES.services)) {
                database.createObjectStore(STORES.services, { keyPath: 'id', autoIncrement: true });
            }

            // إنشاء مخزن الفئات/العلامات
            if (!database.objectStoreNames.contains(STORES.tags)) {
                database.createObjectStore(STORES.tags, { keyPath: 'id', autoIncrement: true });
            }

            console.log('تم إنشاء/تحديث هيكل قاعدة البيانات');
        };
    });
}

/**
 * إضافة عنصر جديد
 */
async function addItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        item.createdAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        
        const request = store.add(item);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * تحديث عنصر
 */
async function updateItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        item.updatedAt = new Date().toISOString();
        
        const request = store.put(item);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * حذف عنصر
 */
async function deleteItem(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.delete(id);
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * الحصول على عنصر بالمعرف
 */
async function getItem(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.get(id);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * الحصول على جميع العناصر
 */
async function getAllItems(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.getAll();
        
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * البحث بواسطة فهرس
 */
async function getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        
        const request = index.getAll(value);
        
        request.onsuccess = () => {
            resolve(request.result || []);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * الحصول على عدد العناصر
 */
async function getCount(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        const request = store.count();
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * حفظ إعداد
 */
async function saveSetting(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.settings, 'readwrite');
        const store = transaction.objectStore(STORES.settings);
        
        const request = store.put({ key, value, updatedAt: new Date().toISOString() });
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * الحصول على إعداد
 */
async function getSetting(key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.settings, 'readonly');
        const store = transaction.objectStore(STORES.settings);
        
        const request = store.get(key);
        
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : null);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * تصدير جميع البيانات
 */
async function exportAllData() {
    const data = {};
    
    for (const storeName of Object.values(STORES)) {
        data[storeName] = await getAllItems(storeName);
    }
    
    return data;
}

/**
 * استيراد البيانات
 */
async function importAllData(data) {
    for (const storeName of Object.values(STORES)) {
        if (data[storeName]) {
            // حذف البيانات القديمة
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            await new Promise((resolve) => {
                const clearRequest = store.clear();
                clearRequest.onsuccess = resolve;
            });
            
            // إضافة البيانات الجديدة
            for (const item of data[storeName]) {
                await addItemWithId(storeName, item);
            }
        }
    }
}

/**
 * إضافة عنصر مع معرف محدد (للاستيراد)
 */
async function addItemWithId(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.put(item);
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onerror = () => {
            reject(request.error);
        };
    });
}

/**
 * مسح جميع البيانات
 */
async function clearAllData() {
    for (const storeName of Object.values(STORES)) {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise((resolve) => {
            const request = store.clear();
            request.onsuccess = resolve;
        });
    }
}

/**
 * تهيئة البيانات الافتراضية
 */
async function initDefaultData() {
    // التحقق من وجود الخدمات
    const services = await getAllItems(STORES.services);
    if (services.length === 0) {
        const defaultServices = [
            { name: 'طباعة ورق' },
            { name: 'طباعة ملابس' },
            { name: 'طباعة كؤوس' },
            { name: 'أكياس بلاستيكية' },
            { name: 'أكياس ورقية' },
            { name: 'علب كرتونية' },
            { name: 'بطاقات دعوة' },
            { name: 'بطاقات عمل' },
            { name: 'أغراض إعلانية' },
            { name: 'لافتات' },
            { name: 'ملصقات' }
        ];
        
        for (const service of defaultServices) {
            await addItem(STORES.services, service);
        }
    }

    // التحقق من وجود الفئات
    const tags = await getAllItems(STORES.tags);
    if (tags.length === 0) {
        const defaultTags = [
            { name: 'عام', color: '#3498db' },
            { name: 'مهم', color: '#e74c3c' },
            { name: 'متابعة', color: '#f39c12' },
            { name: 'فكرة', color: '#9b59b6' }
        ];
        
        for (const tag of defaultTags) {
            await addItem(STORES.tags, tag);
        }
    }

    // التحقق من وجود إعدادات المطبعة
    const shopName = await getSetting('shopName');
    if (!shopName) {
        await saveSetting('shopName', 'مطبعتي');
        await saveSetting('shopAddress', '');
        await saveSetting('shopPhone', '');
        await saveSetting('shopEmail', '');
    }
}

// تصدير الثوابت والدوال
window.DB = {
    STORES,
    init: initDatabase,
    add: addItem,
    update: updateItem,
    delete: deleteItem,
    get: getItem,
    getAll: getAllItems,
    getByIndex,
    getCount,
    saveSetting,
    getSetting,
    exportAll: exportAllData,
    importAll: importAllData,
    clearAll: clearAllData,
    initDefaults: initDefaultData
};
