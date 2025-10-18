const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// تحسينات الأداء
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public', {
  maxAge: '1d',
  etag: false
}));

// تحسين multer للسرعة
const storage = multer.memoryStorage(); // استخدام الذاكرة بدلاً من القرص

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB للسرعة
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Data file path
const DATA_FILE = path.join(__dirname, 'data.json');

// كاش للبيانات لتحسين السرعة
let dataCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 ثواني

const readDataWithCache = async () => {
  const now = Date.now();
  if (dataCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return dataCache;
  }
  
  dataCache = await readData();
  cacheTimestamp = now;
  return dataCache;
};

const clearCache = () => {
  dataCache = null;
  cacheTimestamp = 0;
};

// إنشاء مجلد التحميلات
const ensureUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
  }
};

// Initialize data file
const initializeDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
    console.log('✅ Data file exists');
    
    const data = await readData();
    if (!data || !data.user || !data.settings) {
      throw new Error('Invalid data structure');
    }
    console.log('✅ Data structure is valid');
  } catch (error) {
    console.log('🔄 Creating initial data file...');
    
    const hashedPassword = await bcrypt.hash('user1234', 10);
    const initialData = {
      settings: {
        storeName: "My Store",
        heroTitle: "Welcome to Our Store",
        heroDescription: "Discover our amazing products with great offers and fast delivery.",
        currency: "DA",
        language: "en",
        storeStatus: true,
        theme: {
          primary: "#4361ee",
          secondary: "#3a0ca3",
          accent: "#f72585",
          background: "#ffffff",
          text: "#212529"
        },
        contact: {
          phone: "+213 123 456 789",
          whatsapp: "+213 123 456 789",
          email: "info@mystore.com",
          address: "Algiers, Algeria",
          workingHours: "8:00 AM - 5:00 PM",
          workingDays: "Saturday - Thursday"
        },
        social: {
          facebook: "",
          twitter: "",
          instagram: "",
          youtube: ""
        },
        logo: "",
        favicon: ""
      },
      user: {
        name: "Admin User",
        role: "System Administrator",
        avatar: "",
        password: hashedPassword,
        lastPasswordChange: new Date().toISOString()
      },
      products: [],
      orders: [],
      analytics: {
        visitors: 0,
        ordersCount: 0,
        revenue: 0
      }
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    console.log('✅ Initial data file created successfully');
  }
};

// Read data from file
const readData = async () => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading data:', error);
    return null;
  }
};

// Write data to file
const writeData = async (data) => {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    clearCache(); // مسح الكاش بعد أي تحديث
    return true;
  } catch (error) {
    console.error('❌ Error writing data:', error);
    return false;
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Server is running correctly'
  });
});

// Serve dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve store frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// رفع الصور - نظام محسن
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // حفظ الصورة على القرص
    const fileName = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(req.file.originalname)}`;
    const filePath = path.join(__dirname, 'public', 'uploads', fileName);
    
    await fs.writeFile(filePath, req.file.buffer);
    
    const imageUrl = `/uploads/${fileName}`;
    
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// رفع الصور بدون مصادقة
app.post('/api/upload-public', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const fileName = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(req.file.originalname)}`;
    const filePath = path.join(__dirname, 'public', 'uploads', fileName);
    
    await fs.writeFile(filePath, req.file.buffer);
    
    const imageUrl = `/uploads/${fileName}`;
    
    console.log('✅ Public image uploaded successfully:', imageUrl);
    
    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Public upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Debug endpoint
app.get('/api/debug', async (req, res) => {
  try {
    const data = await readDataWithCache();
    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    
    let uploadsExist = false;
    try {
      await fs.access(uploadsDir);
      uploadsExist = true;
    } catch (error) {
      uploadsExist = false;
    }
    
    if (data) {
      res.json({
        hasData: true,
        userExists: !!data.user,
        settings: data.settings,
        productsCount: data.products ? data.products.length : 0,
        ordersCount: data.orders ? data.orders.length : 0,
        uploadsDirExists: uploadsExist,
        filePath: DATA_FILE,
        cache: {
          enabled: true,
          timestamp: cacheTimestamp
        }
      });
    } else {
      res.json({ hasData: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint - محسن
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const data = await readDataWithCache();

    if (!data || !data.user) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const isValid = await bcrypt.compare(password, data.user.password);
    
    if (isValid) {
      const token = jwt.sign({ 
        userId: 1,
        timestamp: Date.now()
      }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ 
        success: true, 
        token,
        user: {
          name: data.user.name,
          role: data.user.role,
          avatar: data.user.avatar
        }
      });
    } else {
      // تأخير بسيط للأمان
      await new Promise(resolve => setTimeout(resolve, 1000));
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Change password - محسن
app.put('/api/user/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All password fields are required' });
  }

  try {
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const isValid = await bcrypt.compare(currentPassword, data.user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    data.user.password = await bcrypt.hash(newPassword, 10);
    data.user.lastPasswordChange = new Date().toISOString();
    
    const success = await writeData(data);

    if (success) {
      // إلغاء جميع التوكنات القديمة
      clearCache();
      res.json({ 
        success: true, 
        message: 'Password updated successfully',
        timestamp: data.user.lastPasswordChange
      });
    } else {
      res.status(500).json({ error: 'Failed to update password' });
    }
  } catch (error) {
    console.error('❌ Password change error:', error);
    res.status(500).json({ error: 'Server error during password change' });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const data = await readDataWithCache();
    if (data && data.settings) {
      res.json(data.settings);
    } else {
      res.status(500).json({ error: 'Failed to load settings' });
    }
  } catch (error) {
    console.error('❌ Settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error - no data found' });
    }

    data.settings = { 
      ...data.settings, 
      ...settings 
    };

    const success = await writeData(data);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Settings updated successfully', 
        settings: data.settings 
      });
    } else {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({ error: 'Server error during settings update' });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error - no data found' });
    }

    if (!data.user) {
      data.user = {};
    }

    data.user.name = name || data.user.name;
    data.user.avatar = avatar || data.user.avatar;

    const success = await writeData(data);

    if (success) {
      res.json({ 
        success: true, 
        message: 'Profile updated successfully',
        user: {
          name: data.user.name,
          role: data.user.role,
          avatar: data.user.avatar
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
});

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const data = await readDataWithCache();
    if (data && data.user) {
      res.json({
        name: data.user.name,
        role: data.user.role,
        avatar: data.user.avatar,
        lastPasswordChange: data.user.lastPasswordChange
      });
    } else {
      res.status(500).json({ error: 'Failed to load profile' });
    }
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products
app.get('/api/products', async (req, res) => {
  try {
    const data = await readDataWithCache();
    if (data && data.products) {
      res.json(data.products);
    } else {
      res.status(500).json({ error: 'Failed to load products' });
    }
  } catch (error) {
    console.error('❌ Products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
app.get('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const data = await readDataWithCache();

    if (!data || !data.products) {
      return res.status(500).json({ error: 'Server error' });
    }

    const product = data.products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('❌ Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add product
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const productData = req.body;
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const newProduct = {
      id: Date.now(),
      name: productData.name,
      description: productData.description || '',
      price: parseFloat(productData.price),
      quantity: parseInt(productData.quantity),
      category: productData.category || '',
      status: productData.status !== undefined ? productData.status : true,
      deliveryAvailable: productData.deliveryAvailable !== undefined ? productData.deliveryAvailable : true,
      images: productData.images || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!data.products) {
      data.products = [];
    }

    data.products.push(newProduct);
    const success = await writeData(data);

    if (success) {
      res.json({ success: true, product: newProduct });
    } else {
      res.status(500).json({ error: 'Failed to add product' });
    }
  } catch (error) {
    console.error('❌ Add product error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Update product
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const productData = req.body;
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const productIndex = data.products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    data.products[productIndex] = {
      ...data.products[productIndex],
      name: productData.name,
      description: productData.description || '',
      price: parseFloat(productData.price),
      quantity: parseInt(productData.quantity),
      category: productData.category || '',
      status: productData.status !== undefined ? productData.status : true,
      deliveryAvailable: productData.deliveryAvailable !== undefined ? productData.deliveryAvailable : true,
      images: productData.images || data.products[productIndex].images,
      updatedAt: new Date().toISOString()
    };

    const success = await writeData(data);

    if (success) {
      res.json({ success: true, product: data.products[productIndex] });
    } else {
      res.status(500).json({ error: 'Failed to update product' });
    }
  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const productIndex = data.products.findIndex(p => p.id === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    data.products.splice(productIndex, 1);
    const success = await writeData(data);

    if (success) {
      res.json({ success: true, message: 'Product deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  } catch (error) {
    console.error('❌ Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const data = await readDataWithCache();
    if (data && data.orders) {
      res.json(data.orders);
    } else {
      res.status(500).json({ error: 'Failed to load orders' });
    }
  } catch (error) {
    console.error('❌ Orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single order
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const data = await readDataWithCache();

    if (!data || !data.orders) {
      return res.status(500).json({ error: 'Server error' });
    }

    const order = data.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Get order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const newOrder = {
      id: Date.now(),
      items: orderData.items || [],
      customerName: orderData.customerName,
      description: orderData.description || '',
      address: orderData.address || '',
      phone: orderData.phone,
      deliveryOption: orderData.deliveryOption || 'delivery',
      status: 'pending',
      total: orderData.total || (orderData.items ? orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!data.orders) {
      data.orders = [];
    }

    data.orders.push(newOrder);
    
    if (!data.analytics) {
      data.analytics = { visitors: 0, ordersCount: 0, revenue: 0 };
    }
    data.analytics.ordersCount += 1;
    data.analytics.revenue += newOrder.total;

    const success = await writeData(data);

    if (success) {
      res.json({ success: true, orderId: newOrder.id });
    } else {
      res.status(500).json({ error: 'Failed to create order' });
    }
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Update order status
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const data = await readDataWithCache();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const order = data.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    if (!data.analytics) {
      data.analytics = { visitors: 0, ordersCount: 0, revenue: 0 };
    }

    if (status === 'completed' && oldStatus !== 'completed') {
      data.analytics.ordersCount += 1;
      data.analytics.revenue += order.total;
    }
    else if (oldStatus === 'completed' && status !== 'completed') {
      data.analytics.ordersCount = Math.max(0, data.analytics.ordersCount - 1);
      data.analytics.revenue = Math.max(0, data.analytics.revenue - order.total);
    }

    const success = await writeData(data);

    if (success) {
      res.json({ success: true, message: 'Order status updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update order status' });
    }
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Track visitor
app.post('/api/analytics/visitor', async (req, res) => {
  try {
    const data = await readDataWithCache();

    if (data) {
      if (!data.analytics) {
        data.analytics = { visitors: 0, ordersCount: 0, revenue: 0 };
      }
      data.analytics.visitors += 1;
      await writeData(data);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  } catch (error) {
    console.error('❌ Visitor tracking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get analytics
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const data = await readDataWithCache();
    if (data && data.analytics) {
      res.json(data.analytics);
    } else {
      res.status(500).json({ error: 'Failed to load analytics' });
    }
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const data = await readDataWithCache();
    if (data) {
      const completedOrders = data.orders ? data.orders.filter(order => order.status === 'completed') : [];
      const stats = {
        orders: completedOrders.length,
        products: data.products ? data.products.length : 0,
        visitors: data.analytics ? data.analytics.visitors : 0,
        revenue: data.analytics ? data.analytics.revenue : 0
      };
      res.json(stats);
    } else {
      res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset data endpoint
app.post('/api/reset-data', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Starting data reset...');
    
    const currentData = await readDataWithCache();
    const productsCount = currentData?.products?.length || 0;
    const ordersCount = currentData?.orders?.length || 0;
    
    const hashedPassword = await bcrypt.hash('user1234', 10);
    const resetData = {
      settings: {
        storeName: "My Store",
        heroTitle: "Welcome to Our Store",
        heroDescription: "Discover our amazing products with great offers and fast delivery.",
        currency: "DA",
        language: "en",
        storeStatus: true,
        theme: {
          primary: "#4361ee",
          secondary: "#3a0ca3",
          accent: "#f72585",
          background: "#ffffff",
          text: "#212529"
        },
        contact: {
          phone: "+213 123 456 789",
          whatsapp: "+213 123 456 789",
          email: "info@mystore.com",
          address: "Algiers, Algeria",
          workingHours: "8:00 AM - 5:00 PM",
          workingDays: "Saturday - Thursday"
        },
        social: {
          facebook: "",
          twitter: "",
          instagram: "",
          youtube: ""
        },
        logo: "",
        favicon: ""
      },
      user: {
        name: "Admin User",
        role: "System Administrator",
        avatar: "",
        password: hashedPassword,
        lastPasswordChange: new Date().toISOString()
      },
      products: [],
      orders: [],
      analytics: {
        visitors: 0,
        ordersCount: 0,
        revenue: 0
      }
    };

    await fs.writeFile(DATA_FILE, JSON.stringify(resetData, null, 2));
    clearCache();
    
    console.log('✅ Data reset completed');
    
    res.json({ 
      success: true, 
      message: 'Store data has been completely reset',
      resetSummary: {
        productsDeleted: productsCount,
        ordersDeleted: ordersCount,
        analyticsReset: true,
        settingsReset: true
      }
    });
    
  } catch (error) {
    console.error('❌ Reset data error:', error);
    res.status(500).json({ error: 'Failed to reset store data' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize and start server
const startServer = async () => {
  try {
    await ensureUploadsDir();
    await initializeDataFile();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🏪 Store: http://localhost:${PORT}`);
      console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin`);
      console.log(`🔑 Default password: user1234`);
      console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
      console.log(`⚡ Performance: CACHE ENABLED`);
      console.log(`📊 Data file: ${DATA_FILE}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
