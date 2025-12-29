/**
 * Database Module - LocalStorage Based
 * نظام إدارة المطبعة
 */

const DB = {
    STORES: {
        orders: 'printshop_orders',
        clients: 'printshop_clients',
        materials: 'printshop_materials',
        suppliers: 'printshop_suppliers',
        categories: 'printshop_categories',
        products: 'printshop_products',
        services: 'printshop_services',
        tasks: 'printshop_tasks',
        notes: 'printshop_notes',
        tags: 'printshop_tags',
        expenses: 'printshop_expenses',
        purchases: 'printshop_purchases',
        settings: 'printshop_settings'
    },
    
    getAll(store) {
        const data = localStorage.getItem(store);
        return data ? JSON.parse(data) : [];
    },
    
    get(store, id) {
        const items = this.getAll(store);
        return items.find(item => item.id === id);
    },
    
    add(store, item) {
        const items = this.getAll(store);
        item.id = Date.now();
        item.createdAt = new Date().toISOString();
        items.push(item);
        localStorage.setItem(store, JSON.stringify(items));
        return item.id;
    },
    
    update(store, item) {
        const items = this.getAll(store);
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            item.updatedAt = new Date().toISOString();
            items[index] = { ...items[index], ...item };
            localStorage.setItem(store, JSON.stringify(items));
        }
    },
    
    delete(store, id) {
        let items = this.getAll(store);
        items = items.filter(item => item.id !== id);
        localStorage.setItem(store, JSON.stringify(items));
    },
    
    getSetting(key) {
        const settings = this.getAll(this.STORES.settings);
        const setting = settings.find(s => s.key === key);
        return setting ? setting.value : null;
    },
    
    saveSetting(key, value) {
        let settings = this.getAll(this.STORES.settings);
        const index = settings.findIndex(s => s.key === key);
        if (index !== -1) {
            settings[index].value = value;
        } else {
            settings.push({ key, value, id: Date.now() });
        }
        localStorage.setItem(this.STORES.settings, JSON.stringify(settings));
    },
    
    // Import data from backup
    importData(data) {
        if (data.orders) localStorage.setItem(this.STORES.orders, JSON.stringify(data.orders));
        if (data.clients) localStorage.setItem(this.STORES.clients, JSON.stringify(data.clients));
        if (data.materials) localStorage.setItem(this.STORES.materials, JSON.stringify(data.materials));
        if (data.suppliers) localStorage.setItem(this.STORES.suppliers, JSON.stringify(data.suppliers));
        if (data.categories) localStorage.setItem(this.STORES.categories, JSON.stringify(data.categories));
        if (data.products) localStorage.setItem(this.STORES.products, JSON.stringify(data.products));
        if (data.services) localStorage.setItem(this.STORES.services, JSON.stringify(data.services));
        if (data.tasks) localStorage.setItem(this.STORES.tasks, JSON.stringify(data.tasks));
        if (data.notes) localStorage.setItem(this.STORES.notes, JSON.stringify(data.notes));
        if (data.tags) localStorage.setItem(this.STORES.tags, JSON.stringify(data.tags));
        if (data.expenses) localStorage.setItem(this.STORES.expenses, JSON.stringify(data.expenses));
        if (data.purchases) localStorage.setItem(this.STORES.purchases, JSON.stringify(data.purchases));
        if (data.settings) localStorage.setItem(this.STORES.settings, JSON.stringify(data.settings));
    },
    
    // Clear all data
    clearAll() {
        Object.values(this.STORES).forEach(store => {
            localStorage.removeItem(store);
        });
    }
};

// Make DB available globally
window.DB = DB;
