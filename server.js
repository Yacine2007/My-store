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

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// تكوين multer لرفع الملفات - إصلاح التخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, 'uploads');
    // إنشاء مجلد التحميلات إذا لم يكن موجوداً
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // إنشاء اسم فريد للملف
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    // التحقق من نوع الملف
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Data file path
const DATA_FILE = path.join(__dirname, 'data.json');

// إنشاء مجلد التحميلات إذا لم يكن موجوداً
const ensureUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, 'uploads');
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
    
    // تحقق من صحة البيانات
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
        password: hashedPassword
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
    const parsedData = JSON.parse(data);
    
    // تأكد من وجود جميع الحقول الأساسية
    if (!parsedData.user) {
      console.log('🔄 Creating missing user field');
      parsedData.user = {
        name: "Admin User",
        role: "System Administrator",
        avatar: "",
        password: await bcrypt.hash('user1234', 10)
      };
    }
    
    if (!parsedData.settings) {
      console.log('🔄 Creating missing settings field');
      parsedData.settings = {
        storeName: "My Store",
        heroTitle: "Welcome to Our Store",
        heroDescription: "Discover our amazing products with great offers and fast delivery.",
        currency: "DA",
        language: "en",
        storeStatus: true
      };
    }
    
    if (!parsedData.products) parsedData.products = [];
    if (!parsedData.orders) parsedData.orders = [];
    if (!parsedData.analytics) parsedData.analytics = { visitors: 0, ordersCount: 0, revenue: 0 };
    
    return parsedData;
  } catch (error) {
    console.error('❌ Error reading data:', error);
    return null;
  }
};

// Write data to file
const writeData = async (data) => {
  try {
    // تأكد من وجود جميع الحقول الأساسية قبل الحفظ
    const completeData = {
      settings: data.settings || {},
      user: data.user || {},
      products: data.products || [],
      orders: data.orders || [],
      analytics: data.analytics || { visitors: 0, ordersCount: 0, revenue: 0 }
    };
    
    await fs.writeFile(DATA_FILE, JSON.stringify(completeData, null, 2));
    console.log('✅ Data saved successfully to data.json');
    return true;
  } catch (error) {
    console.error('❌ Error writing data:', error);
    return false;
  }
};

// رفع الصور - إصلاح النظام
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // إنشاء رابط للصورة
    const imageUrl = `/uploads/${req.file.filename}`;
    
    console.log('✅ Image uploaded successfully:', imageUrl);
    
    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image: ' + error.message });
  }
});

// رفع الصور بدون مصادقة (للمتجر)
app.post('/api/upload-public', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // إنشاء رابط للصورة
    const imageUrl = `/uploads/${req.file.filename}`;
    
    console.log('✅ Public image uploaded successfully:', imageUrl);
    
    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Public upload error:', error);
    res.status(500).json({ error: 'Failed to upload image: ' + error.message });
  }
});

// خدمة ملفات التحميلات
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
    message: 'Server is running correctly',
    uploadsDir: path.join(__dirname, 'uploads')
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

// Debug endpoint
app.get('/api/debug', async (req, res) => {
  try {
    const data = await readData();
    const uploadsDir = path.join(__dirname, 'uploads');
    const uploadsExist = fs.existsSync(uploadsDir);
    
    if (data) {
      res.json({
        hasData: true,
        userExists: !!data.user,
        settings: data.settings,
        productsCount: data.products.length,
        ordersCount: data.orders.length,
        uploadsDirExists: uploadsExist,
        filePath: DATA_FILE
      });
    } else {
      res.json({ hasData: false });
    }
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const data = await readData();

  if (!data || !data.user) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const isValid = await bcrypt.compare(password, data.user.password);
    
    if (isValid) {
      const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '24h' });
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
      res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// باقي ال endpoints تبقى كما هي بدون تغيير...
// [يتبع باقي الكود كما هو بدون تغيير في دوال products, orders, settings, etc.]

// Change password
app.put('/api/user/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All password fields are required' });
  }

  const data = await readData();

  if (!data) {
    return res.status(500).json({ error: 'Server error' });
  }

  try {
    const isValid = await bcrypt.compare(currentPassword, data.user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    data.user.password = await bcrypt.hash(newPassword, 10);
    const success = await writeData(data);

    if (success) {
      res.json({ success: true, message: 'Password updated successfully' });
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
    const data = await readData();
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
    const data = await readData();

    if (!data) {
      return res.status(500).json({ error: 'Server error - no data found' });
    }

    // تحديث الإعدادات مع الحفاظ على القيم الحالية
    data.settings = { 
      ...data.settings, 
      ...settings 
    };

    const success = await writeData(data);

    if (success) {
      console.log('✅ Settings updated successfully');
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
    const data = await readData();

    if (!data) {
      return res.status(500).json({ error: 'Server error - no data found' });
    }

    if (!data.user) {
      data.user = {};
    }

    // تحديث بيانات المستخدم
    data.user.name = name || data.user.name;
    data.user.avatar = avatar || data.user.avatar;

    const success = await writeData(data);

    if (success) {
      console.log('✅ Profile updated successfully');
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
    const data = await readData();
    if (data && data.user) {
      res.json({
        name: data.user.name,
        role: data.user.role,
        avatar: data.user.avatar
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
    const data = await readData();
    if (data && data.products) {
      // إصلاح روابط الصور
      const productsWithFixedImages = data.products.map(product => {
        if (product.images && Array.isArray(product.images)) {
          product.images = product.images.map(img => {
            if (img.startsWith('data:image')) {
              return img; // إذا كانت base64 تبقى كما هي
            }
            // إذا كانت اسم ملف فقط، أضف المسار
            if (!img.startsWith('http') && !img.startsWith('/')) {
              return `/uploads/${img}`;
            }
            return img;
          });
        }
        return product;
      });
      
      res.json(productsWithFixedImages);
    } else {
      res.status(500).json({ error: 'Failed to load products' });
    }
  } catch (error) {
    console.error('❌ Products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add product
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    const productData = req.body;
    const data = await readData();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const newProduct = {
      id: Date.now(),
      name: productData.name,
      description: productData.description,
      price: parseFloat(productData.price),
      quantity: parseInt(productData.quantity),
      category: productData.category,
      status: productData.status !== undefined ? productData.status : true,
      deliveryAvailable: productData.deliveryAvailable !== undefined ? productData.deliveryAvailable : true,
      images: productData.images || [],
      createdAt: new Date().toISOString()
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const productData = req.body;
    const data = await readData();

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
      description: productData.description,
      price: parseFloat(productData.price),
      quantity: parseInt(productData.quantity),
      category: productData.category,
      status: productData.status !== undefined ? productData.status : true,
      deliveryAvailable: productData.deliveryAvailable !== undefined ? productData.deliveryAvailable : true,
      images: productData.images || data.products[productIndex].images
    };

    const success = await writeData(data);

    if (success) {
      res.json({ success: true, product: data.products[productIndex] });
    } else {
      res.status(500).json({ error: 'Failed to update product' });
    }
  } catch (error) {
    console.error('❌ Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const data = await readData();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    data.products = data.products.filter(p => p.id !== productId);
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
    const data = await readData();
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

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const data = await readData();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const newOrder = {
      id: Date.now(),
      items: orderData.items,
      customerName: orderData.customerName,
      description: orderData.description,
      address: orderData.address,
      phone: orderData.phone,
      deliveryOption: orderData.deliveryOption || 'delivery',
      status: 'pending',
      total: orderData.total || orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      createdAt: new Date().toISOString()
    };

    if (!data.orders) {
      data.orders = [];
    }

    data.orders.push(newOrder);
    
    // تحديث الإحصائيات
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const data = await readData();

    if (!data) {
      return res.status(500).json({ error: 'Server error' });
    }

    const order = data.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;

    // إذا تم تغيير الحالة إلى "مكتمل" ولم يكن مكتملاً من قبل، أضف الإيرادات
    if (status === 'completed' && oldStatus !== 'completed') {
      data.analytics.ordersCount += 1;
      data.analytics.revenue += order.total;
    }
    // إذا تم تغيير الحالة من "مكتمل" إلى حالة أخرى، اطرح الإيرادات
    else if (oldStatus === 'completed' && status !== 'completed') {
      data.analytics.ordersCount -= 1;
      data.analytics.revenue -= order.total;
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
    const data = await readData();

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
    const data = await readData();
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
    const data = await readData();
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
    await initializeDataFile();
    res.json({ success: true, message: 'Data reset successfully' });
  } catch (error) {
    console.error('❌ Reset data error:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error: ' + error.message });
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
      console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
      console.log(`📊 Data file: ${DATA_FILE}`);
      console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
