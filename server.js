const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// GitHub Configuration
const GITHUB_TOKEN = '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';
const REPO_OWNER = 'Yacine2007';
const REPO_NAME = 'My-store';
const DATA_FILE_PATH = 'Data.json';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`;

// بيانات افتراضية
const defaultData = {
    settings: {
        storeName: "متجر الإلكتروني",
        heroTitle: "مرحباً بكم في متجرنا الإلكتروني",
        heroDescription: "اكتشف منتجاتنا المميزة بعروض رائعة وتوصيل سريع.",
        contact: {
            phone: "+213 123 456 789",
            email: "info@mystore.com",
            facebook: "https://facebook.com"
        },
        currency: "DA",
        language: "ar"
    },
    products: [],
    orders: [],
    customers: [],
    analytics: {
        totalVisitors: 0,
        totalOrders: 0,
        totalRevenue: 0,
        monthlyData: []
    },
    admin: {
        name: "أحمد محمد",
        photo: "https://randomuser.me/api/portraits/men/32.jpg",
        role: "مدير النظام"
    }
};

// Helper function to get data from GitHub
async function getDataFromGitHub() {
    try {
        console.log('🔍 جاري جلب البيانات من GitHub...');
        const response = await axios.get(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'My-Store-App',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        console.log('✅ تم جلب البيانات بنجاح من GitHub');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ خطأ في جلب البيانات من GitHub:', error.message);
        
        // إذا لم يوجد الملف، نرجع البيانات الافتراضية
        if (error.response && error.response.status === 404) {
            console.log('📄 الملف غير موجود، جاري استخدام البيانات الافتراضية');
            return JSON.parse(JSON.stringify(defaultData));
        }
        
        console.error('تفاصيل الخطأ:', error.response?.data || error.message);
        throw error;
    }
}

// Helper function to update data on GitHub
async function updateDataOnGitHub(data) {
    try {
        console.log('🔄 جاري تحديث البيانات على GitHub...');
        
        // نحاول أولاً جلب الملف الحالي للحصول على SHA
        let sha = null;
        try {
            const currentFile = await axios.get(GITHUB_API_URL, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'My-Store-App'
                }
            });
            sha = currentFile.data.sha;
            console.log('✅ تم الحصول على SHA للملف الحالي');
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('📄 الملف غير موجود، جاري إنشاء ملف جديد');
                sha = null;
            } else {
                throw error;
            }
        }

        // تحويل البيانات إلى base64
        const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
        
        const requestData = {
            message: `🔄 تحديث بيانات المتجر - ${new Date().toISOString()}`,
            content: content
        };

        // إذا وجدنا SHA نضيفه للطلب
        if (sha) {
            requestData.sha = sha;
        }

        const response = await axios.put(GITHUB_API_URL, requestData, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'My-Store-App',
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('✅ تم تحديث البيانات بنجاح على GitHub');
        return response.data;
    } catch (error) {
        console.error('❌ خطأ في تحديث البيانات على GitHub:', error.message);
        console.error('تفاصيل الخطأ:', error.response?.data || error.message);
        throw error;
    }
}

// API Routes

// Get all data (for dashboard)
app.get('/api/data', async (req, res) => {
    try {
        console.log('📊 طلب جلب جميع البيانات');
        const data = await getDataFromGitHub();
        res.json(data);
    } catch (error) {
        console.error('❌ فشل في جلب البيانات:', error.message);
        res.status(500).json({ 
            error: 'فشل في جلب البيانات',
            details: error.message 
        });
    }
});

// Get store settings (for frontend)
app.get('/api/settings', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.settings);
    } catch (error) {
        res.status(500).json({ error: 'فشل في جلب الإعدادات' });
    }
});

// Update settings
app.put('/api/settings', async (req, res) => {
    try {
        const newSettings = req.body;
        console.log('⚙️ طلب تحديث الإعدادات:', newSettings);
        
        const data = await getDataFromGitHub();
        data.settings = { ...data.settings, ...newSettings };
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
    } catch (error) {
        console.error('❌ فشل في تحديث الإعدادات:', error.message);
        res.status(500).json({ error: 'فشل في تحديث الإعدادات' });
    }
});

// Get products
app.get('/api/products', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.products || []);
    } catch (error) {
        res.status(500).json({ error: 'فشل في جلب المنتجات' });
    }
});

// Add new product
app.post('/api/products', async (req, res) => {
    try {
        const product = req.body;
        console.log('🆕 طلب إضافة منتج جديد:', product);
        
        const data = await getDataFromGitHub();
        
        // Generate unique ID
        product.id = Date.now();
        product.createdAt = new Date().toISOString();
        product.status = product.status || 'active';
        
        if (!data.products) data.products = [];
        data.products.push(product);
        
        await updateDataOnGitHub(data);
        
        console.log('✅ تم إضافة المنتج بنجاح، الرقم:', product.id);
        res.json({ success: true, product });
    } catch (error) {
        console.error('❌ فشل في إضافة المنتج:', error.message);
        res.status(500).json({ error: 'فشل في إضافة المنتج' });
    }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const updatedProduct = req.body;
        console.log('✏️ طلب تحديث المنتج:', productId, updatedProduct);
        
        const data = await getDataFromGitHub();
        
        const productIndex = data.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            return res.status(404).json({ error: 'المنتج غير موجود' });
        }
        
        data.products[productIndex] = { 
            ...data.products[productIndex], 
            ...updatedProduct,
            updatedAt: new Date().toISOString()
        };
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true, product: data.products[productIndex] });
    } catch (error) {
        console.error('❌ فشل في تحديث المنتج:', error.message);
        res.status(500).json({ error: 'فشل في تحديث المنتج' });
    }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        console.log('🗑️ طلب حذف المنتج:', productId);
        
        const data = await getDataFromGitHub();
        
        data.products = data.products.filter(p => p.id !== productId);
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
    } catch (error) {
        console.error('❌ فشل في حذف المنتج:', error.message);
        res.status(500).json({ error: 'فشل في حذف المنتج' });
    }
});

// Get orders
app.get('/api/orders', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.orders || []);
    } catch (error) {
        res.status(500).json({ error: 'فشل في جلب الطلبات' });
    }
});

// Add new order (from store frontend)
app.post('/api/orders', async (req, res) => {
    try {
        const order = req.body;
        console.log('🛒 طلب جديد:', order);
        
        const data = await getDataFromGitHub();
        
        // Generate unique order ID
        order.id = 'ORD-' + Date.now();
        order.createdAt = new Date().toISOString();
        order.status = 'pending';
        
        // Calculate total
        order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (!data.orders) data.orders = [];
        data.orders.push(order);
        
        // Update analytics
        if (!data.analytics) data.analytics = { totalVisitors: 0, totalOrders: 0, totalRevenue: 0, monthlyData: [] };
        data.analytics.totalOrders += 1;
        data.analytics.totalRevenue += order.total;
        
        // Update monthly data
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyIndex = data.analytics.monthlyData.findIndex(m => m.month === currentMonth);
        
        if (monthlyIndex === -1) {
            data.analytics.monthlyData.push({
                month: currentMonth,
                orders: 1,
                revenue: order.total,
                visitors: 0
            });
        } else {
            data.analytics.monthlyData[monthlyIndex].orders += 1;
            data.analytics.monthlyData[monthlyIndex].revenue += order.total;
        }
        
        await updateDataOnGitHub(data);
        
        console.log('✅ تم إضافة الطلب بنجاح، الرقم:', order.id);
        res.json({ success: true, orderId: order.id });
    } catch (error) {
        console.error('❌ فشل في إنشاء الطلب:', error.message);
        res.status(500).json({ error: 'فشل في إنشاء الطلب' });
    }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        console.log('📝 طلب تحديث حالة الطلب:', orderId, status);
        
        const data = await getDataFromGitHub();
        
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'الطلب غير موجود' });
        }
        
        data.orders[orderIndex].status = status;
        data.orders[orderIndex].updatedAt = new Date().toISOString();
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true, order: data.orders[orderIndex] });
    } catch (error) {
        console.error('❌ فشل في تحديث الطلب:', error.message);
        res.status(500).json({ error: 'فشل في تحديث الطلب' });
    }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log('🗑️ طلب حذف الطلب:', orderId);
        
        const data = await getDataFromGitHub();
        
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'الطلب غير موجود' });
        }
        
        // Update analytics before deleting
        const order = data.orders[orderIndex];
        data.analytics.totalOrders -= 1;
        data.analytics.totalRevenue -= order.total;
        
        data.orders = data.orders.filter(o => o.id !== orderId);
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'تم حذف الطلب بنجاح' });
    } catch (error) {
        console.error('❌ فشل في حذف الطلب:', error.message);
        res.status(500).json({ error: 'فشل في حذف الطلب' });
    }
});

// Track visitor
app.post('/api/analytics/visitor', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        
        if (!data.analytics) data.analytics = { totalVisitors: 0, totalOrders: 0, totalRevenue: 0, monthlyData: [] };
        data.analytics.totalVisitors += 1;
        
        // Update monthly data
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyIndex = data.analytics.monthlyData.findIndex(m => m.month === currentMonth);
        
        if (monthlyIndex === -1) {
            data.analytics.monthlyData.push({
                month: currentMonth,
                orders: 0,
                revenue: 0,
                visitors: 1
            });
        } else {
            data.analytics.monthlyData[monthlyIndex].visitors += 1;
        }
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ فشل في تتبع الزائر:', error.message);
        res.status(500).json({ error: 'فشل في تتبع الزائر' });
    }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.analytics || {});
    } catch (error) {
        res.status(500).json({ error: 'فشل في جلب الإحصائيات' });
    }
});

// Update admin settings
app.put('/api/admin', async (req, res) => {
    try {
        const adminData = req.body;
        console.log('👤 طلب تحديث إعدادات المدير:', adminData);
        
        const data = await getDataFromGitHub();
        
        data.admin = { ...data.admin, ...adminData };
        await updateDataOnGitHub(data);
        
        res.json({ success: true, admin: data.admin });
    } catch (error) {
        console.error('❌ فشل في تحديث إعدادات المدير:', error.message);
        res.status(500).json({ error: 'فشل في تحديث إعدادات المدير' });
    }
});

// Initialize data file
app.post('/api/init', async (req, res) => {
    try {
        console.log('🚀 جاري تهيئة ملف البيانات...');
        await updateDataOnGitHub(defaultData);
        res.json({ success: true, message: 'تم تهيئة البيانات بنجاح' });
    } catch (error) {
        console.error('❌ فشل في تهيئة البيانات:', error.message);
        res.status(500).json({ error: 'فشل في تهيئة البيانات' });
    }
});

// Serve store frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await getDataFromGitHub();
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            message: 'الخادم يعمل بشكل طبيعي'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            timestamp: new Date().toISOString(),
            error: error.message 
        });
    }
});

// Test GitHub connection
app.get('/api/test-github', async (req, res) => {
    try {
        console.log('🧪 اختبار اتصال GitHub...');
        const data = await getDataFromGitHub();
        res.json({ 
            success: true, 
            message: 'الاتصال مع GitHub يعمل بشكل صحيح',
            data: data 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'فشل في الاتصال مع GitHub',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log('🚀 الخادم يعمل على المنفذ:', PORT);
    console.log('🛒 المتجر:', `http://localhost:${PORT}`);
    console.log('📊 لوحة التحكم:', `http://localhost:${PORT}/dashboard`);
    console.log('❤️ فحص الحالة:', `http://localhost:${PORT}/health`);
    console.log('🧪 اختبار GitHub:', `http://localhost:${PORT}/api/test-github`);
});
