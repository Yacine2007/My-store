const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

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

// دالة محسنة لجلب البيانات مع معالجة الأخطاء
async function getDataFromGitHub() {
    try {
        console.log('🔍 جاري جلب البيانات من GitHub...');
        const response = await axios.get(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'My-Store-App'
            },
            timeout: 10000
        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        console.log('✅ تم جلب البيانات بنجاح من GitHub');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error.response?.status, error.message);
        
        if (error.response?.status === 404) {
            console.log('📄 الملف غير موجود، جاري استخدام البيانات الافتراضية');
            return JSON.parse(JSON.stringify(defaultData));
        }
        
        if (error.response?.status === 403) {
            console.log('🚫 خطأ في الصلاحيات');
            throw new Error('صلاحيات التوكن غير كافية');
        }
        
        console.log('🔄 استخدام البيانات الافتراضية بسبب خطأ في الاتصال');
        return JSON.parse(JSON.stringify(defaultData));
    }
}

// دالة محسنة لحفظ البيانات
async function updateDataOnGitHub(data) {
    try {
        console.log('💾 جاري حفظ البيانات على GitHub...');
        
        let sha = null;
        try {
            const currentFile = await axios.get(GITHUB_API_URL, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'My-Store-App'
                }
            });
            sha = currentFile.data.sha;
            console.log('📝 وجدنا ملف موجود، جاري التحديث...');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('🆕 الملف غير موجود، جاري الإنشاء...');
            } else {
                throw error;
            }
        }

        const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
        
        const requestData = {
            message: `🔄 تحديث بيانات المتجر - ${new Date().toLocaleString('ar-EG')}`,
            content: content
        };

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

        console.log('✅ تم حفظ البيانات بنجاح على GitHub');
        console.log('📊 commit SHA:', response.data.commit.sha);
        return response.data;
    } catch (error) {
        console.error('❌ فشل في حفظ البيانات:', error.response?.status, error.message);
        console.error('تفاصيل الخطأ:', error.response?.data);
        throw new Error(`فشل في الحفظ: ${error.message}`);
    }
}

// ========== API Routes ==========

// الحصول على جميع البيانات
app.get('/api/data', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الحصول على إعدادات المتجر
app.get('/api/settings', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// تحديث إعدادات المتجر
app.put('/api/settings', async (req, res) => {
    try {
        const newSettings = req.body;
        console.log('⚙️ تحديث الإعدادات:', newSettings);
        
        const data = await getDataFromGitHub();
        data.settings = { ...data.settings, ...newSettings };
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الحصول على المنتجات
app.get('/api/products', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.products || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// إضافة منتج جديد
app.post('/api/products', async (req, res) => {
    try {
        const product = req.body;
        console.log('🆕 إضافة منتج جديد:', product);
        
        const data = await getDataFromGitHub();
        
        // التأكد من أن products موجود
        if (!data.products) {
            data.products = [];
        }
        
        // إنشاء منتج جديد
        const newProduct = {
            id: Date.now(),
            name: product.name,
            description: product.description || '',
            price: parseFloat(product.price),
            quantity: parseInt(product.quantity),
            category: product.category || 'electronics',
            image: product.image || 'https://via.placeholder.com/300',
            status: product.status || 'active',
            createdAt: new Date().toISOString()
        };
        
        data.products.push(newProduct);
        
        await updateDataOnGitHub(data);
        
        console.log('✅ تم إضافة المنتج بنجاح:', newProduct.id);
        res.json({ success: true, product: newProduct });
    } catch (error) {
        console.error('❌ فشل في إضافة المنتج:', error);
        res.status(500).json({ error: error.message });
    }
});

// تحديث منتج
app.put('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const updatedProduct = req.body;
        console.log('✏️ تحديث المنتج:', productId, updatedProduct);
        
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
        res.status(500).json({ error: error.message });
    }
});

// حذف منتج
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        console.log('🗑️ حذف المنتج:', productId);
        
        const data = await getDataFromGitHub();
        
        const initialLength = data.products.length;
        data.products = data.products.filter(p => p.id !== productId);
        
        if (data.products.length === initialLength) {
            return res.status(404).json({ error: 'المنتج غير موجود' });
        }
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الحصول على الطلبات
app.get('/api/orders', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.orders || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// إضافة طلب جديد
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        console.log('🛒 طلب جديد:', orderData);
        
        const data = await getDataFromGitHub();
        
        if (!data.orders) {
            data.orders = [];
        }
        
        const newOrder = {
            id: 'ORD-' + Date.now(),
            customerName: orderData.customerName,
            phone: orderData.phone,
            address: orderData.address,
            description: orderData.description || '',
            items: orderData.items || [],
            total: orderData.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        data.orders.push(newOrder);
        
        // تحديث الإحصائيات
        if (!data.analytics) {
            data.analytics = { totalVisitors: 0, totalOrders: 0, totalRevenue: 0, monthlyData: [] };
        }
        data.analytics.totalOrders += 1;
        data.analytics.totalRevenue += newOrder.total;
        
        await updateDataOnGitHub(data);
        
        console.log('✅ تم إضافة الطلب بنجاح:', newOrder.id);
        res.json({ success: true, orderId: newOrder.id, order: newOrder });
    } catch (error) {
        console.error('❌ فشل في إضافة الطلب:', error);
        res.status(500).json({ error: error.message });
    }
});

// تحديث حالة الطلب
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        console.log('📝 تحديث حالة الطلب:', orderId, status);
        
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
        res.status(500).json({ error: error.message });
    }
});

// حذف طلب
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log('🗑️ حذف الطلب:', orderId);
        
        const data = await getDataFromGitHub();
        
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'الطلب غير موجود' });
        }
        
        const order = data.orders[orderIndex];
        data.orders.splice(orderIndex, 1);
        
        // تحديث الإحصائيات
        if (data.analytics) {
            data.analytics.totalOrders = Math.max(0, data.analytics.totalOrders - 1);
            data.analytics.totalRevenue = Math.max(0, data.analytics.totalRevenue - order.total);
        }
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'تم حذف الطلب بنجاح' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// تتبع الزوار
app.post('/api/analytics/visitor', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        
        if (!data.analytics) {
            data.analytics = { totalVisitors: 0, totalOrders: 0, totalRevenue: 0, monthlyData: [] };
        }
        data.analytics.totalVisitors += 1;
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الحصول على الإحصائيات
app.get('/api/analytics', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.analytics || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// تحديث إعدادات المدير
app.put('/api/admin', async (req, res) => {
    try {
        const adminData = req.body;
        console.log('👤 تحديث إعدادات المدير:', adminData);
        
        const data = await getDataFromGitHub();
        
        data.admin = { ...data.admin, ...adminData };
        await updateDataOnGitHub(data);
        
        res.json({ success: true, admin: data.admin });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// إنشاء ملف البيانات الأولي
app.post('/api/init', async (req, res) => {
    try {
        console.log('🚀 جاري إنشاء ملف البيانات الأولي...');
        await updateDataOnGitHub(defaultData);
        res.json({ success: true, message: 'تم إنشاء ملف البيانات بنجاح' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// فحص اتصال GitHub
app.get('/api/debug/github', async (req, res) => {
    try {
        console.log('🧪 فحص اتصال GitHub...');
        const response = await axios.get(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'My-Store-App'
            }
        });
        
        res.json({ 
            success: true, 
            repo: response.data.full_name,
            permissions: response.data.permissions
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            status: error.response?.status,
            details: error.response?.data
        });
    }
});

// فحص ملف البيانات
app.get('/api/debug/data', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json({
            success: true,
            productsCount: data.products?.length || 0,
            ordersCount: data.orders?.length || 0,
            settings: data.settings,
            hasData: true
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message
        });
    }
});

// ========== Routes للتطبيق ==========

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/health', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            dataStatus: data ? 'EXISTS' : 'MISSING',
            products: data.products?.length || 0
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            error: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log('🚀 الخادم يعمل على المنفذ:', PORT);
    console.log('🛒 المتجر:', `http://localhost:${PORT}`);
    console.log('📊 لوحة التحكم:', `http://localhost:${PORT}/dashboard`);
    console.log('❤️ فحص الحالة:', `http://localhost:${PORT}/health`);
    console.log('🐛 فحص GitHub:', `http://localhost:${PORT}/api/debug/github`);
    console.log('📁 فحص البيانات:', `http://localhost:${PORT}/api/debug/data`);
});
