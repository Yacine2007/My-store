const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.access('uploads');
  } catch {
    await fs.mkdir('uploads');
  }
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadsDir();
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Data file path
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data file
const initializeDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
  } catch {
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
          accent: "#f72585"
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
        }
      },
      user: {
        name: "Admin User",
        role: "System Administrator",
        avatar: "default-avatar.png",
        password: "$2a$10$8K1p/a0dRTlB0ZQ1F8c.3Oc3J3p3a3a3a3a3a3a3a3a3a3a3a3a3a" // user1234
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
  }
};

// Read data from file
const readData = async () => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return null;
  }
};

// Write data to file
const writeData = async (data) => {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data:', error);
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

// Serve dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve store frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const data = await readData();

  if (!data) {
    return res.status(500).json({ error: 'Server error' });
  }

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
});

// Change password
app.post('/api/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const data = await readData();

  if (!data) {
    return res.status(500).json({ error: 'Server error' });
  }

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
});

// Get settings
app.get('/api/settings', async (req, res) => {
  const data = await readData();
  if (data) {
    res.json(data.settings);
  } else {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Update settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  const settings = req.body;
  const data = await readData();

  if (!data) {
    return res.status(500).json({ error: 'Server error' });
  }

  data.settings = { ...data.settings, ...settings };
  const success = await writeData(data);

  if (success) {
    res.json({ success: true, message: 'Settings updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  const { name } = req.body;
  const data = await readData();

  if (!data) {
    return res.status(500).json({ error: 'Server error' });
  }

  data.user.name = name;

  if (req.file) {
    data.user.avatar = req.file.filename;
  }

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
});

// Get products
app.get('/api/products', async (req, res) => {
  const data = await readData();
  if (data) {
    res.json(data.products);
  } else {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Add product
app.post('/api/products', authenticateToken, upload.array('images', 5), async (req, res) => {
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
    status: productData.status === 'true',
    images: req.files ? req.files.map(file => file.filename) : [],
    createdAt: new Date().toISOString()
  };

  data.products.push(newProduct);
  const success = await writeData(data);

  if (success) {
    res.json({ success: true, product: newProduct });
  } else {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Update product
app.put('/api/products/:id', authenticateToken, upload.array('images', 5), async (req, res) => {
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
    status: productData.status === 'true'
  };

  if (req.files && req.files.length > 0) {
    data.products[productIndex].images = req.files.map(file => file.filename);
  }

  const success = await writeData(data);

  if (success) {
    res.json({ success: true, product: data.products[productIndex] });
  } else {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
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
});

// Get orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  const data = await readData();
  if (data) {
    res.json(data.orders);
  } else {
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
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
    status: 'pending',
    total: orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    createdAt: new Date().toISOString()
  };

  data.orders.push(newOrder);
  
  // Update analytics
  data.analytics.ordersCount += 1;
  data.analytics.revenue += newOrder.total;

  const success = await writeData(data);

  if (success) {
    res.json({ success: true, orderId: newOrder.id });
  } else {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
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

  order.status = status;
  const success = await writeData(data);

  if (success) {
    res.json({ success: true, message: 'Order status updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Track visitor
app.post('/api/analytics/visitor', async (req, res) => {
  const data = await readData();

  if (data) {
    data.analytics.visitors += 1;
    await writeData(data);
  }

  res.json({ success: true });
});

// Get analytics
app.get('/api/analytics', authenticateToken, async (req, res) => {
  const data = await readData();
  if (data) {
    res.json(data.analytics);
  } else {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  const data = await readData();
  if (data) {
    const stats = {
      orders: data.orders.length,
      products: data.products.length,
      visitors: data.analytics.visitors,
      revenue: data.analytics.revenue
    };
    res.json(stats);
  } else {
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

// Initialize and start server
const startServer = async () => {
  await initializeDataFile();
  await ensureUploadsDir();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Store: http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
  });
};

startServer();
