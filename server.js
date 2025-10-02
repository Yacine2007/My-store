const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// GitHub Configuration
const GITHUB_TOKEN = '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';
const REPO_OWNER = 'Yacine2007';
const REPO_NAME = 'My-store';
const DATA_FILE_PATH = 'Data.json';
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_FILE_PATH}`;

// Helper function to get data from GitHub
async function getDataFromGitHub() {
    try {
        const response = await axios.get(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'My-Store-App'
            }
        });

        const content = Buffer.from(response.data.content, 'base64').toString('utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error fetching data from GitHub:', error.message);
        
        // If file doesn't exist, return default structure
        if (error.response && error.response.status === 404) {
            return {
                settings: {
                    storeName: "My Store",
                    heroTitle: "Welcome to Our Online Store",
                    heroDescription: "Discover our amazing products with great deals and fast delivery.",
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
        }
        throw error;
    }
}

// Helper function to update data on GitHub
async function updateDataOnGitHub(data) {
    try {
        // First, get the current file to get its SHA
        const currentFile = await axios.get(GITHUB_API_URL, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'My-Store-App'
            }
        });

        const sha = currentFile.data.sha;

        // Convert data to base64
        const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

        const response = await axios.put(GITHUB_API_URL, {
            message: `Update store data - ${new Date().toISOString()}`,
            content: content,
            sha: sha
        }, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'User-Agent': 'My-Store-App',
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error updating data on GitHub:', error.message);
        
        // If file doesn't exist, create it
        if (error.response && error.response.status === 404) {
            const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
            
            const response = await axios.put(GITHUB_API_URL, {
                message: 'Initial commit - Create store data',
                content: content
            }, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'My-Store-App',
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        }
        throw error;
    }
}

// API Routes

// Get all data (for dashboard)
app.get('/api/data', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Get store settings (for frontend)
app.get('/api/settings', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.settings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings
app.put('/api/settings', async (req, res) => {
    try {
        const newSettings = req.body;
        const data = await getDataFromGitHub();
        
        data.settings = { ...data.settings, ...newSettings };
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Get products
app.get('/api/products', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Add new product
app.post('/api/products', async (req, res) => {
    try {
        const product = req.body;
        const data = await getDataFromGitHub();
        
        // Generate unique ID
        product.id = Date.now();
        product.createdAt = new Date().toISOString();
        product.status = product.status || 'active';
        
        data.products.push(product);
        await updateDataOnGitHub(data);
        
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add product' });
    }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const updatedProduct = req.body;
        const data = await getDataFromGitHub();
        
        const productIndex = data.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        data.products[productIndex] = { ...data.products[productIndex], ...updatedProduct };
        await updateDataOnGitHub(data);
        
        res.json({ success: true, product: data.products[productIndex] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const data = await getDataFromGitHub();
        
        data.products = data.products.filter(p => p.id !== productId);
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Get orders
app.get('/api/orders', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Add new order (from store frontend)
app.post('/api/orders', async (req, res) => {
    try {
        const order = req.body;
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
        
        res.json({ success: true, orderId: order.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        const data = await getDataFromGitHub();
        
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        data.orders[orderIndex].status = status;
        data.orders[orderIndex].updatedAt = new Date().toISOString();
        
        await updateDataOnGitHub(data);
        
        res.json({ success: true, order: data.orders[orderIndex] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Delete order
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const data = await getDataFromGitHub();
        
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Update analytics before deleting
        const order = data.orders[orderIndex];
        data.analytics.totalOrders -= 1;
        data.analytics.totalRevenue -= order.total;
        
        data.orders = data.orders.filter(o => o.id !== orderId);
        await updateDataOnGitHub(data);
        
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Track visitor
app.post('/api/analytics/visitor', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        
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
        res.status(500).json({ error: 'Failed to track visitor' });
    }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const data = await getDataFromGitHub();
        res.json(data.analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Update admin settings
app.put('/api/admin', async (req, res) => {
    try {
        const adminData = req.body;
        const data = await getDataFromGitHub();
        
        data.admin = { ...data.admin, ...adminData };
        await updateDataOnGitHub(data);
        
        res.json({ success: true, admin: data.admin });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update admin settings' });
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
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Store: http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
});
