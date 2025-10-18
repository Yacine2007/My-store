// API Configuration
const API_BASE_URL = 'https://my-store-p63u.onrender.com/api';
const TOKEN_KEY = 'admin_token';

// Global Variables
let currentUser = null;
let dashboardData = null;
let settingsData = null;
let products = [];
let orders = [];

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const notification = document.getElementById('notification');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const notificationClose = document.getElementById('notificationClose');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎉 Dashboard page loaded');
    console.log('🚀 Using API Base URL:', API_BASE_URL);
    
    initDashboard();
    setupEventListeners();
    initMobileOptimizations();
});

// Enhanced API Request Helper
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };

    // Remove Content-Type for FormData requests
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    console.log(`🔄 API Request: ${endpoint}`, config.method || 'GET');

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error(`❌ API Error (${endpoint}):`, error);
        throw error;
    }
}

// Dashboard Initialization
async function initDashboard() {
    console.log('🎯 Initializing dashboard...');
    
    // Check API health
    const isHealthy = await checkAPIHealth();
    if (!isHealthy) {
        showLogin();
        return;
    }
    
    // Check authentication
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        console.log('🔑 Token found, verifying...');
        await verifyToken(token);
    } else {
        console.log('❌ No token found, showing login');
        showLogin();
    }
}

// API Health Check
async function checkAPIHealth() {
    try {
        console.log('🔍 Checking API health...');
        const response = await fetch(`${API_BASE_URL}/health`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ API is healthy:', data);
        return true;
    } catch (error) {
        console.error('❌ API health check failed:', error);
        showNotification('Connection Error', 'Unable to connect to server. Please try again later.', 'error');
        return false;
    }
}

// Token Verification
async function verifyToken(token) {
    try {
        const data = await apiRequest('/user/profile');
        
        if (data && data.name) {
            currentUser = data;
            console.log('✅ Token verified, user:', data.name);
            showDashboard();
            loadDashboardData();
        } else {
            throw new Error('Invalid user data received');
        }
    } catch (error) {
        console.error('❌ Token verification failed:', error);
        localStorage.removeItem(TOKEN_KEY);
        showLogin();
        showNotification('Session Expired', 'Please login again', 'warning');
    }
}

// Show Login Page
function showLogin() {
    loginPage.style.display = 'flex';
    dashboard.style.display = 'none';
    loadStoreSettingsForLogin();
}

// Show Dashboard
function showDashboard() {
    loginPage.style.display = 'none';
    dashboard.style.display = 'flex';
    updateUserInfo();
}

// Load Store Settings for Login Page
async function loadStoreSettingsForLogin() {
    try {
        const settings = await apiRequest('/settings');
        if (settings && settings.logo) {
            document.getElementById('loginLogo').src = settings.logo;
        }
    } catch (error) {
        console.log('⚠️ Could not load store settings for login');
    }
}

// Update User Info
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.name;
        document.getElementById('adminNameInput').value = currentUser.name;
        document.getElementById('adminRole').value = currentUser.role || 'System Administrator';
        
        // Update avatar if available
        const adminAvatar = document.getElementById('adminAvatar');
        if (currentUser.avatar) {
            adminAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="${currentUser.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            adminAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
        
        console.log('👤 User info updated:', currentUser.name);
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        await Promise.all([
            loadDashboardStats(),
            loadOrders(),
            loadSettings()
        ]);
        
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Error', 'Failed to load dashboard data', 'error');
    }
}

// Load Dashboard Stats
async function loadDashboardStats() {
    try {
        const stats = await apiRequest('/dashboard/stats');
        updateStats(stats);
        console.log('📈 Stats loaded:', stats);
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        // Set default values
        updateStats({ orders: 0, products: 0, visitors: 0, revenue: 0 });
    }
}

// Update Stats Display
function updateStats(stats) {
    document.getElementById('ordersCount').textContent = stats.orders || 0;
    document.getElementById('productsCount').textContent = stats.products || 0;
    document.getElementById('visitorsCount').textContent = stats.visitors || 0;
    document.getElementById('revenueAmount').textContent = `${stats.revenue || 0} DA`;
}

// Setup Event Listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Mobile menu toggle
    menuToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
    
    // Notification close
    notificationClose.addEventListener('click', hideNotification);
    
    // Tab navigation
    document.querySelectorAll('.menu-item[data-tab]').forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
            
            // Close sidebar on mobile after selecting a tab
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });
    
    // Settings tabs
    document.querySelectorAll('#settings-tab .tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchSettingsTab(tabId);
        });
    });
    
    // Forms
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSave);
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
    
    // Product management
    document.getElementById('addProductBtn').addEventListener('click', showAddProductModal);
    document.getElementById('productForm').addEventListener('submit', handleProductSave);
    
    // Image uploads
    setupImageUploads();
    
    // Color pickers
    setupColorPickers();
    
    // Reset store confirmation
    setupResetStoreConfirmation();
    
    // Order management
    document.getElementById('updateOrderStatusBtn').addEventListener('click', updateOrderStatusFromModal);
    
    // Modal close events
    setupModalEvents();
    
    console.log('✅ Event listeners setup complete');
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    
    if (!password) {
        showNotification('Error', 'Please enter password', 'error');
        return;
    }
    
    // Show loading state
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;
    
    try {
        const data = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        if (data.success && data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
            currentUser = data.user || { name: 'Admin User' };
            
            showNotification('Success', `Welcome back, ${currentUser.name}!`, 'success');
            
            setTimeout(() => {
                showDashboard();
                loadDashboardData();
            }, 1000);
            
        } else {
            throw new Error(data.error || 'Authentication failed');
        }
        
    } catch (error) {
        console.error('❌ Login failed:', error);
        showNotification('Error', error.message || 'Login failed. Please check your password.', 'error');
    } finally {
        // Reset button state
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Handle Logout
function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    showNotification('Info', 'You have been logged out', 'info');
    setTimeout(() => {
        showLogin();
    }, 1000);
}

// Toggle Sidebar (Mobile)
function toggleSidebar() {
    sidebar.classList.toggle('active');
    if (sidebarOverlay) {
        sidebarOverlay.classList.toggle('active');
    }
    
    // Prevent body scroll when sidebar is open
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Switch Tabs
function switchTab(tabId) {
    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeMenuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    if (activeMenuItem) {
        activeMenuItem.classList.add('active');
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Update header title
    const headerTitle = document.querySelector('.header h1');
    if (activeMenuItem) {
        const tabName = activeMenuItem.querySelector('span').textContent;
        headerTitle.textContent = tabName;
    }
    
    // Load tab-specific data
    switch(tabId) {
        case 'dashboard-tab':
            loadDashboardStats();
            loadRecentOrders();
            break;
        case 'products-tab':
            loadProducts();
            break;
        case 'orders-tab':
            loadOrders();
            break;
        case 'settings-tab':
            loadSettings();
            break;
        case 'profile-tab':
            loadProfile();
            break;
    }
}

// Switch Settings Tabs
function switchSettingsTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('#settings-tab .tab[data-tab]').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`#settings-tab .tab[data-tab="${tabId}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#settings-tab .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// Load Products
async function loadProducts() {
    try {
        products = await apiRequest('/products');
        displayProducts(products);
        displayProductsMobile(products);
        console.log('📦 Products loaded:', products.length);
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showNotification('Error', 'Failed to load products', 'error');
    }
}

// Load Orders
async function loadOrders() {
    try {
        orders = await apiRequest('/orders');
        displayOrders(orders);
        displayOrdersMobile(orders);
        updateRecentOrders(orders);
        console.log('📋 Orders loaded:', orders.length);
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showNotification('Error', 'Failed to load orders', 'error');
    }
}

// Load Recent Orders
function loadRecentOrders() {
    if (orders.length > 0) {
        updateRecentOrders(orders);
        updateRecentOrdersMobile(orders);
    }
}

// Load Settings
async function loadSettings() {
    try {
        settingsData = await apiRequest('/settings');
        populateSettingsForm(settingsData);
        console.log('⚙️ Settings loaded');
    } catch (error) {
        console.error('❌ Error loading settings:', error);
    }
}

// Load Profile
async function loadProfile() {
    try {
        const userData = await apiRequest('/user/profile');
        currentUser = userData;
        populateProfileForm(userData);
        console.log('👤 Profile loaded');
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        showNotification('Error', 'Failed to load profile data', 'error');
    }
}

// Display Products - Desktop Table
function displayProducts(products) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #6c757d; padding: 20px;">
                    No products found. <a href="#" onclick="showAddProductModal()" style="color: #4361ee;">Add your first product</a>
                </td>
            </tr>
        `;
        return;
    }
    
    products.forEach(product => {
        const imageUrl = product.images && product.images.length > 0 ? 
            product.images[0] : 
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjhGOUZBIiByeD0iNCIvPgo8cGF0aCBkPSJNMzAgMjBIMjBWMzBIMzBWMjBaIiBmaWxsPSIjQzVDOUM5Ii8+CjxwYXRoIGQ9Ik0yNSAxNUMzMS4wODI1IDE1IDM2IDIwLjA0MjUgMzYgMjYuNUMzNiAzMi45NTc1IDMxLjA4MjUgMzggMjUgMzhDMTguOTE3NSAzOCAxNCAzMi45NTc1IDE0IDI2LjVDMTQgMjAuMDQyNSAxOC45MTc1IDE1IDI1IDE1WiIgZmlsbD0iI0M1QzlDOSIvPgo8L3N2Zz4K';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${imageUrl}" alt="${product.name}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjhGOUZBIiByeD0iNCIvPgo8cGF0aCBkPSJNMzAgMjBIMjBWMzBIMzBWMjBaIiBmaWxsPSIjQzVDOUM5Ii8+CjxwYXRoIGQ9Ik0yNSAxNUMzMS4wODI1IDE1IDM2IDIwLjA0MjUgMzYgMjYuNUMzNiAzMi45NTc1IDMxLjA4MjUgMzggMjUgMzhDMTguOTE3NSAzOCAxNCAzMi45NTc1IDE0IDI2LjVDMTQgMjAuMDQyNSAxOC45MTc1IDE1IDI1IDE1WiIgZmlsbD0iI0M1QzlDOSIvPgo8L3N2Zz4K'">
            </td>
            <td>${product.name}</td>
            <td>${product.price} DA</td>
            <td>${product.quantity}</td>
            <td>${product.category || 'Uncategorized'}</td>
            <td>
                <span class="status-badge ${product.deliveryAvailable ? 'active' : 'inactive'}">
                    ${product.deliveryAvailable ? 'Available' : 'Pickup Only'}
                </span>
            </td>
            <td>
                <span class="status-badge ${product.status ? 'active' : 'inactive'}">
                    ${product.status ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="action-group">
                    <button class="action-btn btn-primary" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-danger" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Display Products - Mobile Cards
function displayProductsMobile(products) {
    const container = document.getElementById('productsMobile');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = `
            <div class="mobile-card" style="text-align: center; color: #6c757d; padding: 20px;">
                No products found. <a href="#" onclick="showAddProductModal()" style="color: #4361ee;">Add your first product</a>
            </div>
        `;
        return;
    }
    
    products.forEach(product => {
        const imageUrl = product.images && product.images.length > 0 ? 
            product.images[0] : 
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjhGOUZBIiByeD0iNCIvPgo8cGF0aCBkPSJNMzAgMjBIMjBWMzBIMzBWMjBaIiBmaWxsPSIjQzVDOUM5Ii8+CjxwYXRoIGQ9Ik0yNSAxNUMzMS4wODI1IDE1IDM2IDIwLjA0MjUgMzYgMjYuNUMzNiAzMi45NTc1IDMxLjA4MjUgMzggMjUgMzhDMTguOTE3NSAzOCAxNCAzMi45NTc1IDE0IDI2LjVDMTQgMjAuMDQyNSAxOC45MTc1IDE1IDI1IDE1WiIgZmlsbD0iI0M1QzlDOSIvPgo8L3N2Zz4K';
        
        const card = document.createElement('div');
        card.className = 'mobile-product-card';
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-title">${product.name}</div>
                <div class="mobile-card-actions">
                    <button class="action-btn btn-primary" onclick="editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-danger" onclick="deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="mobile-card-body">
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Image</div>
                        <img src="${imageUrl}" alt="${product.name}" 
                             style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjhGOUZBIiByeD0iNCIvPgo8cGF0aCBkPSJNMzAgMjBIMjBWMzBIMzBWMjBaIiBmaWxsPSIjQzVDOUM5Ii8+CjxwYXRoIGQ9Ik0yNSAxNUMzMS4wODI1IDE1IDM2IDIwLjA0MjUgMzYgMjYuNUMzNiAzMi45NTc1IDMxLjA4MjUgMzggMjUgMzhDMTguOTE3NSAzOCAxNCAzMi45NTc1IDE0IDI2LjVDMTQgMjAuMDQyNSAxOC45MTc1IDE1IDI1IDE1WiIgZmlsbD0iI0M1QzlDOSIvPgo8L3N2Zz4K'">
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Price</div>
                        <div class="mobile-card-value">${product.price} DA</div>
                    </div>
                </div>
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Quantity</div>
                        <div class="mobile-card-value">${product.quantity}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Category</div>
                        <div class="mobile-card-value">${product.category || 'Uncategorized'}</div>
                    </div>
                </div>
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Delivery</div>
                        <span class="status-badge ${product.deliveryAvailable ? 'active' : 'inactive'}">
                            ${product.deliveryAvailable ? 'Available' : 'Pickup Only'}
                        </span>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Status</div>
                        <span class="status-badge ${product.status ? 'active' : 'inactive'}">
                            ${product.status ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="mobile-card-actions compact">
                <button class="btn btn-primary" onclick="showProductDetailsMobile('${product.id}')" style="flex: 1;">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn btn-primary" onclick="editProduct('${product.id}')" style="flex: 1;">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Display Orders - Desktop Table
function displayOrders(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #6c757d; padding: 20px;">
                    No orders yet
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        const itemsCount = order.items ? order.items.length : 0;
        const itemsText = itemsCount === 1 ? '1 item' : `${itemsCount} items`;
        
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customerName}</td>
            <td>${order.phone}</td>
            <td>${itemsText}</td>
            <td>${order.total} DA</td>
            <td>
                <span class="status-badge ${order.deliveryOption === 'delivery' ? 'active' : 'inactive'}">
                    ${order.deliveryOption === 'delivery' ? 'Delivery' : 'Pickup'}
                </span>
            </td>
            <td>
                <select onchange="updateOrderStatus('${order.id}', this.value)" class="form-control">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-btn btn-primary" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Display Orders - Mobile Cards
function displayOrdersMobile(orders) {
    const container = document.getElementById('ordersMobile');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="mobile-card" style="text-align: center; color: #6c757d; padding: 20px;">
                No orders yet
            </div>
        `;
        return;
    }
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    orders.forEach(order => {
        const itemsCount = order.items ? order.items.length : 0;
        const itemsText = itemsCount === 1 ? '1 item' : `${itemsCount} items`;
        
        const card = document.createElement('div');
        card.className = 'mobile-order-card';
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-title">Order #${order.id}</div>
                <div class="mobile-card-actions">
                    <button class="action-btn btn-primary" onclick="viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="mobile-card-body">
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Customer</div>
                        <div class="mobile-card-value">${order.customerName}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Phone</div>
                        <div class="mobile-card-value">${order.phone}</div>
                    </div>
                </div>
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Items</div>
                        <div class="mobile-card-value">${itemsText}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Total</div>
                        <div class="mobile-card-value">${order.total} DA</div>
                    </div>
                </div>
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Delivery</div>
                        <span class="status-badge ${order.deliveryOption === 'delivery' ? 'active' : 'inactive'}">
                            ${order.deliveryOption === 'delivery' ? 'Delivery' : 'Pickup'}
                        </span>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Date</div>
                        <div class="mobile-card-value">${new Date(order.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="mobile-card-section full">
                    <div class="mobile-card-field compact">
                        <div class="mobile-card-label">Status</div>
                        <select onchange="updateOrderStatus('${order.id}', this.value)" class="form-control" style="min-width: 120px;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="mobile-card-actions compact">
                <button class="btn btn-primary" onclick="viewOrderDetails('${order.id}')" style="flex: 1;">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Update Recent Orders (Dashboard) - Desktop
function updateRecentOrders(orders) {
    const tbody = document.querySelector('#recentOrdersTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Get recent orders (last 5)
    const recentOrders = orders.slice(0, 5);
    
    if (recentOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6c757d; padding: 20px;">
                    No recent orders
                </td>
            </tr>
        `;
        return;
    }
    
    recentOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customerName}</td>
            <td>${order.total} DA</td>
            <td>
                <span class="status-badge ${order.status}">
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-btn btn-primary" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update Recent Orders - Mobile
function updateRecentOrdersMobile(orders) {
    const container = document.getElementById('recentOrdersMobile');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get recent orders (last 5)
    const recentOrders = orders.slice(0, 5);
    
    if (recentOrders.length === 0) {
        container.innerHTML = `
            <div class="mobile-card" style="text-align: center; color: #6c757d; padding: 20px;">
                No recent orders
            </div>
        `;
        return;
    }
    
    recentOrders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'mobile-order-card';
        card.innerHTML = `
            <div class="mobile-card-header">
                <div class="mobile-card-title">Order #${order.id}</div>
                <div class="mobile-card-actions">
                    <button class="action-btn btn-primary" onclick="viewOrderDetails('${order.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="mobile-card-body">
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Customer</div>
                        <div class="mobile-card-value">${order.customerName}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Amount</div>
                        <div class="mobile-card-value">${order.total} DA</div>
                    </div>
                </div>
                <div class="mobile-card-section">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Status</div>
                        <span class="status-badge ${order.status}">
                            ${order.status}
                        </span>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Date</div>
                        <div class="mobile-card-value">${new Date(order.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
            <div class="mobile-card-actions compact">
                <button class="btn btn-primary" onclick="viewOrderDetails('${order.id}')" style="flex: 1;">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Show Product Details in Mobile Modal
async function showProductDetailsMobile(productId) {
    try {
        const product = await apiRequest(`/products/${productId}`);
        
        const images = product.images && product.images.length > 0 ? product.images : ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjhGOUZBIiByeD0iNCIvPgo8cGF0aCBkPSJNMzAgMjBIMjBWMzBIMzBWMjBaIiBmaWxsPSIjQzVDOUM5Ii8+CjxwYXRoIGQ9Ik0yNSAxNUMzMS4wODI1IDE1IDM2IDIwLjA0MjUgMzYgMjYuNUMzNiAzMi45NTc1IDMxLjA4MjUgMzggMjUgMzhDMTguOTE3NSAzOCAxNCAzMi45NTc1IDE0IDI2LjVDMTQgMjAuMDQyNSAxOC45MTc1IDE1IDI1IDE1WiIgZmlsbD0iI0M1QzlDOSIvPgo8L3N2Zz4K'];
        const mainImage = images[0];
        
        let imagesHTML = '';
        if (images.length > 1) {
            imagesHTML = `
                <div class="product-thumbnails">
                    ${images.map((img, index) => `
                        <img src="${img}" alt="Thumbnail ${index + 1}" class="product-thumbnail ${index === 0 ? 'active' : ''}" 
                             onclick="changeProductImageMobile('${img}', this)">
                    `).join('')}
                </div>
            `;
        }
        
        const detailsContent = `
            <div class="product-gallery-mobile">
                <img src="${mainImage}" alt="${product.name}" class="product-main-image-mobile" id="mainProductImageMobile">
                ${imagesHTML}
            </div>
            <div class="product-info-details-mobile">
                <h3 style="margin-bottom: 15px; color: var(--dark);">${product.name}</h3>
                
                <div class="mobile-card-section" style="margin-bottom: 15px;">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Category</div>
                        <div class="mobile-card-value">${product.category || 'Uncategorized'}</div>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">In Stock</div>
                        <div class="mobile-card-value">${product.quantity}</div>
                    </div>
                </div>
                
                <div class="mobile-card-section" style="margin-bottom: 15px;">
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Delivery</div>
                        <span class="status-badge ${product.deliveryAvailable ? 'active' : 'inactive'}">
                            ${product.deliveryAvailable ? 'Available' : 'Pickup Only'}
                        </span>
                    </div>
                    <div class="mobile-card-field">
                        <div class="mobile-card-label">Status</div>
                        <span class="status-badge ${product.status ? 'active' : 'inactive'}">
                            ${product.status ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <div class="mobile-card-label">Description</div>
                    <p style="color: var(--gray); margin-top: 5px;">${product.description || 'No description available.'}</p>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <div class="product-price" style="font-size: 2rem; color: var(--primary); font-weight: bold;">${product.price} DA</div>
                </div>
                
                <div class="mobile-card-actions compact">
                    <button class="btn btn-primary" onclick="editProduct('${product.id}'); closeModal(document.getElementById('productDetailsModal'));" style="flex: 1;">
                        <i class="fas fa-edit"></i> Edit Product
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('productDetailsMobile').innerHTML = detailsContent;
        showModal(document.getElementById('productDetailsModal'));
    } catch (error) {
        console.error('❌ Error loading product details:', error);
        showNotification('Error', 'Failed to load product details', 'error');
    }
}

// Change product image in mobile modal
function changeProductImageMobile(imageUrl, element) {
    document.getElementById('mainProductImageMobile').src = imageUrl;
    document.querySelectorAll('#productDetailsModal .product-thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    element.classList.add('active');
}

// Populate Settings Form
function populateSettingsForm(settings) {
    if (!settings) return;
    
    // General Settings
    document.getElementById('storeName').value = settings.storeName || '';
    document.getElementById('heroTitle').value = settings.heroTitle || '';
    document.getElementById('heroDescription').value = settings.heroDescription || '';
    document.getElementById('currency').value = settings.currency || 'DA';
    document.getElementById('language').value = settings.language || 'en';
    document.getElementById('storeLogo').value = settings.logo || '';
    document.getElementById('storeStatus').value = settings.storeStatus ? 'true' : 'false';
    
    // Theme Settings
    if (settings.theme) {
        document.getElementById('primaryColor').value = settings.theme.primary || '#4361ee';
        document.getElementById('primaryColorText').value = settings.theme.primary || '#4361ee';
        document.getElementById('secondaryColor').value = settings.theme.secondary || '#3a0ca3';
        document.getElementById('secondaryColorText').value = settings.theme.secondary || '#3a0ca3';
        document.getElementById('accentColor').value = settings.theme.accent || '#f72585';
        document.getElementById('accentColorText').value = settings.theme.accent || '#f72585';
        document.getElementById('backgroundColor').value = settings.theme.background || '#ffffff';
        document.getElementById('backgroundColorText').value = settings.theme.background || '#ffffff';
        document.getElementById('textColor').value = settings.theme.text || '#212529';
        document.getElementById('textColorText').value = settings.theme.text || '#212529';
    }
    
    // Contact Settings
    if (settings.contact) {
        document.getElementById('contactPhone').value = settings.contact.phone || '';
        document.getElementById('contactWhatsapp').value = settings.contact.whatsapp || '';
        document.getElementById('contactEmail').value = settings.contact.email || '';
        document.getElementById('contactAddress').value = settings.contact.address || '';
        document.getElementById('workingHours').value = settings.contact.workingHours || '';
        document.getElementById('workingDays').value = settings.contact.workingDays || '';
    }
    
    // Social Media
    if (settings.social) {
        document.getElementById('facebookUrl').value = settings.social.facebook || '';
        document.getElementById('twitterUrl').value = settings.social.twitter || '';
        document.getElementById('instagramUrl').value = settings.social.instagram || '';
        document.getElementById('youtubeUrl').value = settings.social.youtube || '';
    }
    
    // Update logo preview
    const logoPreview = document.getElementById('logoPreview');
    if (settings.logo && logoPreview) {
        logoPreview.src = settings.logo;
        logoPreview.style.display = 'block';
    }
    
    // Update login logo
    const loginLogo = document.getElementById('loginLogo');
    if (settings.logo && loginLogo) {
        loginLogo.src = settings.logo;
    }
}

// Populate Profile Form
function populateProfileForm(userData) {
    if (!userData) return;
    
    document.getElementById('adminNameInput').value = userData.name || '';
    document.getElementById('adminRole').value = userData.role || 'System Administrator';
    document.getElementById('adminAvatar').value = userData.avatar || '';
    
    // Update avatar preview
    const avatarPreview = document.getElementById('avatarPreview');
    if (userData.avatar && avatarPreview) {
        avatarPreview.src = userData.avatar;
        avatarPreview.style.display = 'block';
    }
}

// Handle Settings Save
async function handleSettingsSave(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        const settings = {
            storeName: document.getElementById('storeName').value,
            heroTitle: document.getElementById('heroTitle').value,
            heroDescription: document.getElementById('heroDescription').value,
            currency: document.getElementById('currency').value,
            language: document.getElementById('language').value,
            logo: document.getElementById('storeLogo').value,
            storeStatus: document.getElementById('storeStatus').value === 'true',
            theme: {
                primary: document.getElementById('primaryColor').value,
                secondary: document.getElementById('secondaryColor').value,
                accent: document.getElementById('accentColor').value,
                background: document.getElementById('backgroundColor').value,
                text: document.getElementById('textColor').value
            },
            contact: {
                phone: document.getElementById('contactPhone').value,
                whatsapp: document.getElementById('contactWhatsapp').value,
                email: document.getElementById('contactEmail').value,
                address: document.getElementById('contactAddress').value,
                workingHours: document.getElementById('workingHours').value,
                workingDays: document.getElementById('workingDays').value
            },
            social: {
                facebook: document.getElementById('facebookUrl').value,
                twitter: document.getElementById('twitterUrl').value,
                instagram: document.getElementById('instagramUrl').value,
                youtube: document.getElementById('youtubeUrl').value
            }
        };
        
        await apiRequest('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        showNotification('Success', 'Settings saved successfully!', 'success');
        
        // Apply theme changes immediately
        applyTheme(settings);
        
        // Update language if changed
        const newLanguage = document.getElementById('language').value;
        if (newLanguage !== 'en') {
            translatePage(newLanguage);
        }
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showNotification('Error', 'Failed to save settings: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Profile Update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        const profileData = {
            name: document.getElementById('adminNameInput').value,
            avatar: document.getElementById('adminAvatar').value
        };
        
        if (!profileData.name.trim()) {
            throw new Error('Please enter your name');
        }
        
        const updatedUser = await apiRequest('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        
        currentUser = updatedUser;
        updateUserInfo();
        showNotification('Success', 'Profile updated successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showNotification('Error', 'Failed to update profile: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Password Change
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';
        submitBtn.disabled = true;
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            throw new Error('All password fields are required');
        }
        
        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match');
        }
        
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }
        
        await apiRequest('/user/password', {
            method: 'PUT',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        showNotification('Success', 'Password changed successfully!', 'success');
        document.getElementById('passwordForm').reset();
        
    } catch (error) {
        console.error('❌ Error changing password:', error);
        showNotification('Error', 'Failed to change password: ' + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Apply Theme
function applyTheme(settings) {
    const root = document.documentElement;
    
    if (settings.theme) {
        if (settings.theme.primary) {
            root.style.setProperty('--primary', settings.theme.primary);
        }
        if (settings.theme.secondary) {
            root.style.setProperty('--secondary', settings.theme.secondary);
        }
        if (settings.theme.accent) {
            root.style.setProperty('--accent', settings.theme.accent);
        }
        if (settings.theme.background) {
            root.style.setProperty('--light', settings.theme.background);
        }
        if (settings.theme.text) {
            root.style.setProperty('--dark', settings.theme.text);
        }
    }
}

// Translate Page
function translatePage(targetLanguage) {
    if (targetLanguage === 'en') {
        // If target is English, remove translation
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
        return;
    }
    
    // Use Google Translate
    const googleTranslateScript = document.createElement('script');
    googleTranslateScript.type = 'text/javascript';
    googleTranslateScript.src = `//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit`;
    document.head.appendChild(googleTranslateScript);
    
    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,ar,fr',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
        
        // Set direction for RTL languages
        if (targetLanguage === 'ar') {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
        
        document.documentElement.lang = targetLanguage;
    };
}

// Setup Image Uploads
function setupImageUploads() {
    // Logo upload
    const logoUploadArea = document.getElementById('logoUploadArea');
    const logoFileInput = document.getElementById('logoFileInput');
    
    if (logoUploadArea && logoFileInput) {
        logoUploadArea.addEventListener('click', () => logoFileInput.click());
        setupDragAndDrop(logoUploadArea, handleLogoUpload);
        logoFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleLogoUpload(e.target.files[0]);
            }
        });
    }
    
    // Avatar upload
    const avatarUploadArea = document.getElementById('avatarUploadArea');
    const avatarFileInput = document.getElementById('avatarFileInput');
    
    if (avatarUploadArea && avatarFileInput) {
        avatarUploadArea.addEventListener('click', () => avatarFileInput.click());
        setupDragAndDrop(avatarUploadArea, handleAvatarUpload);
        avatarFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleAvatarUpload(e.target.files[0]);
            }
        });
    }
    
    // Product images upload
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        setupDragAndDrop(uploadArea, handleProductImagesUpload);
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleProductImagesUpload(e.target.files);
            }
        });
    }
}

// Setup Drag and Drop
function setupDragAndDrop(uploadArea, handler) {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handler(files);
        }
    });
}

// Handle Logo Upload
async function handleLogoUpload(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Error', 'Please select an image file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Error', 'File size must be less than 10MB', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const result = await apiRequest('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (result.success && result.imageUrl) {
            // Update preview
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.src = result.imageUrl;
                logoPreview.style.display = 'block';
            }
            
            // Update hidden field
            document.getElementById('storeLogo').value = result.imageUrl;
            
            // Update login logo
            const loginLogo = document.getElementById('loginLogo');
            if (loginLogo) {
                loginLogo.src = result.imageUrl;
            }
            
            showNotification('Success', 'Logo uploaded successfully!', 'success');
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('❌ Error uploading logo:', error);
        showNotification('Error', 'Failed to upload logo', 'error');
    }
}

// Handle Avatar Upload
async function handleAvatarUpload(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Error', 'Please select an image file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Error', 'File size must be less than 10MB', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const result = await apiRequest('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (result.success && result.imageUrl) {
            // Update preview
            const avatarPreview = document.getElementById('avatarPreview');
            if (avatarPreview) {
                avatarPreview.src = result.imageUrl;
                avatarPreview.style.display = 'block';
            }
            
            // Update hidden field
            document.getElementById('adminAvatar').value = result.imageUrl;
            
            // Update admin avatar
            const adminAvatar = document.getElementById('adminAvatar');
            if (adminAvatar) {
                adminAvatar.innerHTML = `<img src="${result.imageUrl}" alt="${currentUser?.name || 'Admin'}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
            
            showNotification('Success', 'Profile picture uploaded successfully!', 'success');
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('❌ Error uploading avatar:', error);
        showNotification('Error', 'Failed to upload profile picture', 'error');
    }
}

// Handle Product Images Upload
async function handleProductImagesUpload(files) {
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const productImages = document.getElementById('productImages');
    
    if (progressBar) progressBar.style.display = 'block';
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showNotification('Error', 'Please select image files only', 'error');
        if (progressBar) progressBar.style.display = 'none';
        return;
    }
    
    const uploadedUrls = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        if (file.size > 10 * 1024 * 1024) {
            showNotification('Error', `File ${file.name} is too large (max 10MB)`, 'error');
            continue;
        }
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const result = await apiRequest('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (result.success && result.imageUrl) {
                uploadedUrls.push(result.imageUrl);
                
                // Update progress
                if (progressFill) {
                    const progress = ((i + 1) / imageFiles.length) * 100;
                    progressFill.style.width = `${progress}%`;
                }
                
                // Add image preview
                if (imagePreviewContainer) {
                    const img = document.createElement('img');
                    img.src = result.imageUrl;
                    img.className = 'image-preview';
                    img.style.display = 'block';
                    imagePreviewContainer.appendChild(img);
                }
            }
        } catch (error) {
            console.error('❌ Error uploading image:', error);
            showNotification('Error', `Failed to upload: ${file.name}`, 'error');
        }
    }
    
    // Update product images field
    if (productImages) {
        productImages.value = uploadedUrls.join(',');
    }
    
    if (progressBar) {
        progressBar.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
    }
    
    if (uploadedUrls.length > 0) {
        showNotification('Success', `${uploadedUrls.length} images uploaded successfully!`, 'success');
    }
}

// Setup Color Pickers
function setupColorPickers() {
    // Primary color
    const primaryColor = document.getElementById('primaryColor');
    const primaryColorText = document.getElementById('primaryColorText');
    
    if (primaryColor && primaryColorText) {
        primaryColor.addEventListener('input', () => {
            primaryColorText.value = primaryColor.value;
        });
        
        primaryColorText.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(primaryColorText.value)) {
                primaryColor.value = primaryColorText.value;
            }
        });
    }
    
    // Secondary color
    const secondaryColor = document.getElementById('secondaryColor');
    const secondaryColorText = document.getElementById('secondaryColorText');
    
    if (secondaryColor && secondaryColorText) {
        secondaryColor.addEventListener('input', () => {
            secondaryColorText.value = secondaryColor.value;
        });
        
        secondaryColorText.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(secondaryColorText.value)) {
                secondaryColor.value = secondaryColorText.value;
            }
        });
    }
    
    // Accent color
    const accentColor = document.getElementById('accentColor');
    const accentColorText = document.getElementById('accentColorText');
    
    if (accentColor && accentColorText) {
        accentColor.addEventListener('input', () => {
            accentColorText.value = accentColor.value;
        });
        
        accentColorText.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(accentColorText.value)) {
                accentColor.value = accentColorText.value;
            }
        });
    }
    
    // Background color
    const backgroundColor = document.getElementById('backgroundColor');
    const backgroundColorText = document.getElementById('backgroundColorText');
    
    if (backgroundColor && backgroundColorText) {
        backgroundColor.addEventListener('input', () => {
            backgroundColorText.value = backgroundColor.value;
        });
        
        backgroundColorText.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(backgroundColorText.value)) {
                backgroundColor.value = backgroundColorText.value;
            }
        });
    }
    
    // Text color
    const textColor = document.getElementById('textColor');
    const textColorText = document.getElementById('textColorText');
    
    if (textColor && textColorText) {
        textColor.addEventListener('input', () => {
            textColorText.value = textColor.value;
        });
        
        textColorText.addEventListener('input', () => {
            if (/^#[0-9A-F]{6}$/i.test(textColorText.value)) {
                textColor.value = textColorText.value;
            }
        });
    }
}

// Setup Reset Store Confirmation
function setupResetStoreConfirmation() {
    const resetConfirmInput = document.getElementById('resetConfirmInput');
    const resetStoreBtn = document.getElementById('resetStoreBtn');
    
    if (resetConfirmInput && resetStoreBtn) {
        resetConfirmInput.addEventListener('input', function() {
            resetStoreBtn.disabled = this.value !== 'RESET';
        });
        
        resetStoreBtn.addEventListener('click', async function() {
            if (!resetStoreBtn.disabled) {
                const confirmed = confirm('🚨 FINAL WARNING 🚨\n\nYou are about to:\n• Delete ALL products\n• Delete ALL orders\n• Reset ALL analytics\n• Reset store settings\n• Keep admin profile\n\nThis action is PERMANENT and cannot be undone!\n\nClick OK to proceed or Cancel to abort.');
                if (confirmed) {
                    await resetStoreData();
                }
            }
        });
        
        // Prevent paste and lowercase input
        resetConfirmInput.addEventListener('paste', (e) => e.preventDefault());
        resetConfirmInput.addEventListener('keypress', (e) => {
            if (e.key >= 'a' && e.key <= 'z') {
                e.preventDefault();
                showNotification('Uppercase Required', 'Please type in UPPERCASE letters only.', 'warning');
            }
        });
    }
}

// Reset Store Data
async function resetStoreData() {
    const resetStoreBtn = document.getElementById('resetStoreBtn');
    const resetConfirmInput = document.getElementById('resetConfirmInput');
    
    if (!resetStoreBtn) return;
    
    const originalText = resetStoreBtn.innerHTML;
    
    try {
        resetStoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        resetStoreBtn.disabled = true;
        
        await apiRequest('/reset-data', {
            method: 'POST'
        });
        
        showNotification('Success', 'Store data has been reset successfully', 'success');
        
        if (resetConfirmInput) resetConfirmInput.value = '';
        resetStoreBtn.innerHTML = '<i class="fas fa-check"></i> Reset Complete!';
        resetStoreBtn.style.background = '#38a169';
        
        // Reload dashboard data after delay
        setTimeout(() => {
            window.location.reload();
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error resetting store:', error);
        resetStoreBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Reset Failed';
        resetStoreBtn.style.background = '#e53e3e';
        showNotification('Reset Failed', 'Failed to reset store data: ' + error.message, 'error');
        
        // Reset button after delay
        setTimeout(() => {
            resetStoreBtn.innerHTML = originalText;
            resetStoreBtn.disabled = false;
        }, 3000);
    }
}

// Setup Modal Events
function setupModalEvents() {
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    // Close modals with escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                closeModal(modal);
            });
        }
    });
    
    // Close modals with close button
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
}

// Close Modal
function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show Modal
function showModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Show Add Product Modal
function showAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
    
    const productImages = document.getElementById('productImages');
    if (productImages) productImages.value = '';
    
    showModal(document.getElementById('productModal'));
}

// Edit Product
async function editProduct(productId) {
    try {
        const product = await apiRequest(`/products/${productId}`);
        
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productDelivery').value = product.deliveryAvailable ? 'true' : 'false';
        document.getElementById('productStatus').value = product.status ? 'true' : 'false';
        
        // Handle images
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const productImages = document.getElementById('productImages');
        
        if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
        
        if (product.images && product.images.length > 0) {
            product.images.forEach(imageUrl => {
                if (imagePreviewContainer) {
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.className = 'image-preview';
                    img.style.display = 'block';
                    imagePreviewContainer.appendChild(img);
                }
            });
            if (productImages) productImages.value = product.images.join(',');
        }
        
        showModal(document.getElementById('productModal'));
    } catch (error) {
        console.error('❌ Error loading product:', error);
        showNotification('Error', 'Failed to load product details', 'error');
    }
}

// Handle Product Save
async function handleProductSave(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        const productId = document.getElementById('productId').value;
        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            quantity: parseInt(document.getElementById('productQuantity').value),
            category: document.getElementById('productCategory').value,
            deliveryAvailable: document.getElementById('productDelivery').value === 'true',
            status: document.getElementById('productStatus').value === 'true',
            images: document.getElementById('productImages').value ? 
                   document.getElementById('productImages').value.split(',') : []
        };
        
        if (!productData.name || !productData.price || !productData.quantity) {
            throw new Error('Please fill in all required fields');
        }
        
        const url = productId ? `/products/${productId}` : '/products';
        const method = productId ? 'PUT' : 'POST';
        
        await apiRequest(url, {
            method,
            body: JSON.stringify(productData)
        });
        
        showNotification('Success', `Product ${productId ? 'updated' : 'added'} successfully!`, 'success');
        closeModal(document.getElementById('productModal'));
        loadProducts();
        
    } catch (error) {
        console.error('❌ Error saving product:', error);
        showNotification('Error', `Failed to ${productId ? 'update' : 'add'} product: ` + error.message, 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Delete Product
async function deleteProduct(productId) {
    const confirmed = confirm('Are you sure you want to delete this product? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
        await apiRequest(`/products/${productId}`, {
            method: 'DELETE'
        });
        
        showNotification('Success', 'Product deleted successfully!', 'success');
        loadProducts();
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showNotification('Error', 'Failed to delete product', 'error');
    }
}

// View Order Details
async function viewOrderDetails(orderId) {
    try {
        const order = await apiRequest(`/orders/${orderId}`);
        
        document.getElementById('orderDetailsId').textContent = order.id;
        document.getElementById('orderCustomerName').textContent = order.customerName;
        document.getElementById('orderCustomerPhone').textContent = order.phone;
        document.getElementById('orderCustomerAddress').textContent = order.address || 'N/A';
        document.getElementById('orderDeliveryOption').textContent = order.deliveryOption === 'delivery' ? 'Delivery' : 'Pickup';
        document.getElementById('orderTotalAmount').textContent = `${order.total} DA`;
        document.getElementById('orderNotes').textContent = order.description || 'No special notes provided.';
        document.getElementById('orderStatusSelect').value = order.status;
        
        // Populate order items
        const itemsList = document.getElementById('orderItemsList');
        if (itemsList) {
            itemsList.innerHTML = '';
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'order-item';
                    itemDiv.innerHTML = `
                        <div class="order-item-details">
                            <strong>${item.productName}</strong><br>
                            <small>Quantity: ${item.quantity} × ${item.unitPrice} DA</small>
                        </div>
                        <div class="order-item-price">
                            ${item.total} DA
                        </div>
                    `;
                    itemsList.appendChild(itemDiv);
                });
            }
        }
        
        // Store current order ID for status update
        window.currentOrderId = orderId;
        
        showModal(document.getElementById('orderDetailsModal'));
    } catch (error) {
        console.error('❌ Error loading order details:', error);
        showNotification('Error', 'Failed to load order details', 'error');
    }
}

// Update Order Status from Modal
async function updateOrderStatusFromModal() {
    const statusSelect = document.getElementById('orderStatusSelect');
    if (!statusSelect || !window.currentOrderId) return;
    
    try {
        await updateOrderStatus(window.currentOrderId, statusSelect.value);
        closeModal(document.getElementById('orderDetailsModal'));
    } catch (error) {
        console.error('❌ Error updating order status:', error);
    }
}

// Update Order Status
async function updateOrderStatus(orderId, status) {
    try {
        await apiRequest(`/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        showNotification('Success', 'Order status updated successfully!', 'success');
        
        // Reload orders data
        loadOrders();
        loadRecentOrders();
        loadDashboardStats();
        
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        showNotification('Error', 'Failed to update order status', 'error');
        throw error;
    }
}

// Show Notification
function showNotification(title, message, type = 'info') {
    if (!notification || !notificationTitle || !notificationMessage) return;
    
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    // Set icon based on type
    const icon = notification.querySelector('.notification-icon i');
    if (icon) {
        icon.className = 'fas ' + (
            type === 'success' ? 'fa-check' :
            type === 'error' ? 'fa-exclamation-circle' :
            type === 'warning' ? 'fa-exclamation-triangle' :
            'fa-info-circle'
        );
    }
    
    // Set color based on type
    const notificationIcon = notification.querySelector('.notification-icon');
    if (notificationIcon) {
        notificationIcon.style.background = 
            type === 'success' ? 'var(--success)' :
            type === 'error' ? 'var(--danger)' :
            type === 'warning' ? 'var(--warning)' :
            'var(--primary)';
    }
    
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

// Hide Notification
function hideNotification() {
    if (notification) {
        notification.classList.remove('show');
    }
}

// Initialize Mobile Optimizations
function initMobileOptimizations() {
    console.log('📱 Mobile optimizations initialized');
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('active');
            }
            document.body.style.overflow = 'auto';
        }
    });
    
    // Add touch gestures for mobile
    let startX = 0;
    let currentX = 0;
    
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
    });
    
    document.addEventListener('touchmove', function(e) {
        currentX = e.touches[0].clientX;
    });
    
    document.addEventListener('touchend', function() {
        const diff = startX - currentX;
        
        // Swipe right to open sidebar
        if (diff < -50 && window.innerWidth <= 768 && startX < 50) {
            toggleSidebar();
        }
        
        // Swipe left to close sidebar
        if (diff > 50 && window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });
    
    // Prevent zoom on double tap
    let lastTap = 0;
    document.addEventListener('touchend', function(e) {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            e.preventDefault();
        }
        lastTap = currentTime;
    });
}

// Make functions globally available
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.showAddProductModal = showAddProductModal;
window.toggleSidebar = toggleSidebar;
window.showProductDetailsMobile = showProductDetailsMobile;
window.changeProductImageMobile = changeProductImageMobile;
window.closeModal = closeModal;

console.log('✅ Dashboard JavaScript loaded successfully');
