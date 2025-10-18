// API Configuration
const API_BASE_URL = 'https://my-store-p63u.onrender.com/api';
const TOKEN_KEY = 'admin_token';

// Global Variables
let currentUser = null;
let dashboardData = null;
let settingsData = null;

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

// Dashboard Initialization
async function initDashboard() {
    console.log('🎯 Initializing dashboard...');
    
    // Check API health
    await checkAPIHealth();
    
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
        const data = await response.json();
        console.log('✅ API is healthy:', data);
        return true;
    } catch (error) {
        console.error('❌ API health check failed:', error);
        showNotification('Error', 'Unable to connect to server. Please try again later.', 'error');
        return false;
    }
}

// Token Verification
async function verifyToken(token) {
    try {
        console.log('🔄 Fetching:', `${API_BASE_URL}/user/profile`);
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            console.log('✅ Token verified, user:', userData.name);
            showDashboard();
            loadDashboardData();
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('❌ Token verification failed:', error);
        localStorage.removeItem(TOKEN_KEY);
        showLogin();
    }
}

// Show Login Page
function showLogin() {
    loginPage.style.display = 'flex';
    dashboard.style.display = 'none';
}

// Show Dashboard
function showDashboard() {
    loginPage.style.display = 'none';
    dashboard.style.display = 'flex';
    updateUserInfo();
}

// Update User Info
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.name;
        document.getElementById('adminNameInput').value = currentUser.name;
        document.getElementById('adminRole').value = currentUser.role || 'System Administrator';
        
        // Update avatar if available
        if (currentUser.avatar) {
            document.getElementById('adminAvatar').innerHTML = `<img src="${currentUser.avatar}" alt="${currentUser.name}">`;
        }
        
        console.log('👤 User info updated:', currentUser.name);
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateStats(stats);
            console.log('📈 Stats loaded:', stats);
        }
        
        // Load orders
        await loadOrders();
        
        // Load settings
        await loadSettings();
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Error', 'Failed to load dashboard data', 'error');
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
    sidebarOverlay.addEventListener('click', toggleSidebar);
    
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
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchSettingsTab(tabId);
        });
    });
    
    // Settings form
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSave);
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    
    // Password form
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
    
    // Product management
    document.getElementById('addProductBtn').addEventListener('click', showAddProductModal);
    
    // Image uploads
    setupImageUploads();
    
    // Color pickers
    setupColorPickers();
    
    // Reset store confirmation
    setupResetStoreConfirmation();
    
    console.log('✅ Event listeners setup complete');
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const loginBtn = loginForm.querySelector('button[type="submit"]');
    
    // Show loading state
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(TOKEN_KEY, data.token);
            currentUser = data.user;
            
            showNotification('Success', 'Login successful!', 'success');
            setTimeout(() => {
                showDashboard();
                loadDashboardData();
            }, 1000);
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        console.error('❌ Login failed:', error);
        showNotification('Error', 'Login failed. Please check your password.', 'error');
    } finally {
        // Reset button state
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
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
    sidebarOverlay.classList.toggle('active');
}

// Switch Tabs
function switchTab(tabId) {
    // Update menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.menu-item[data-tab="${tabId}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    // Update header title
    const headerTitle = document.querySelector('.header h1');
    const tabName = document.querySelector(`.menu-item[data-tab="${tabId}"] span`).textContent;
    headerTitle.textContent = tabName;
    
    // Load tab-specific data
    if (tabId === 'products-tab') {
        loadProducts();
    } else if (tabId === 'orders-tab') {
        loadOrders();
    }
}

// Switch Settings Tabs
function switchSettingsTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('#settings-tab .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// Load Products
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (response.ok) {
            const products = await response.json();
            displayProducts(products);
        }
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showNotification('Error', 'Failed to load products', 'error');
    }
}

// Load Orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayOrders(orders);
            updateRecentOrders(orders);
        }
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showNotification('Error', 'Failed to load orders', 'error');
    }
}

// Load Settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (response.ok) {
            settingsData = await response.json();
            populateSettingsForm(settingsData);
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
    }
}

// Display Products
function displayProducts(products) {
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                ${product.images && product.images.length > 0 ? 
                    `<img src="${product.images[0]}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : 
                    '<i class="fas fa-image" style="font-size: 1.5rem; color: #6c757d;"></i>'
                }
            </td>
            <td>${product.name}</td>
            <td>${product.price} DA</td>
            <td>${product.quantity}</td>
            <td>${product.category || 'Uncategorized'}</td>
            <td>
                <span class="status-badge ${product.delivery === 'true' || product.delivery === true ? 'active' : 'inactive'}">
                    ${product.delivery === 'true' || product.delivery === true ? 'Available' : 'Pickup Only'}
                </span>
            </td>
            <td>
                <span class="status-badge ${product.status === 'true' || product.status === true ? 'active' : 'inactive'}">
                    ${product.status === 'true' || product.status === true ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="action-group">
                    <button class="action-btn btn-primary" onclick="editProduct('${product._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-danger" onclick="deleteProduct('${product._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Display Orders
function displayOrders(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    tbody.innerHTML = '';
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order._id.slice(-6)}</td>
            <td>${order.customerName}</td>
            <td>${order.phone}</td>
            <td>${order.items ? order.items.length : 0} items</td>
            <td>${order.totalAmount || 0} DA</td>
            <td>
                <span class="status-badge ${order.deliveryOption === 'delivery' ? 'active' : 'inactive'}">
                    ${order.deliveryOption === 'delivery' ? 'Delivery' : 'Pickup'}
                </span>
            </td>
            <td>
                <span class="status-badge ${order.status}">
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn btn-primary" onclick="viewOrderDetails('${order._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-success" onclick="updateOrderStatus('${order._id}', 'completed')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn btn-danger" onclick="updateOrderStatus('${order._id}', 'cancelled')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update Recent Orders (Dashboard)
function updateRecentOrders(orders) {
    const tbody = document.querySelector('#recentOrdersTable tbody');
    tbody.innerHTML = '';
    
    // Get recent orders (last 5)
    const recentOrders = orders.slice(0, 5);
    
    recentOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order._id.slice(-6)}</td>
            <td>${order.customerName}</td>
            <td>${order.totalAmount || 0} DA</td>
            <td>
                <span class="status-badge ${order.status}">
                    ${order.status}
                </span>
            </td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-btn btn-primary" onclick="viewOrderDetails('${order._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Populate Settings Form
function populateSettingsForm(settings) {
    // General Settings
    document.getElementById('storeName').value = settings.storeName || '';
    document.getElementById('heroTitle').value = settings.heroTitle || '';
    document.getElementById('heroDescription').value = settings.heroDescription || '';
    document.getElementById('currency').value = settings.currency || 'DA';
    document.getElementById('language').value = settings.language || 'en';
    document.getElementById('storeLogo').value = settings.storeLogo || '';
    document.getElementById('storeStatus').value = settings.storeStatus || 'true';
    
    // Theme Settings
    document.getElementById('primaryColor').value = settings.primaryColor || '#4361ee';
    document.getElementById('primaryColorText').value = settings.primaryColor || '#4361ee';
    document.getElementById('secondaryColor').value = settings.secondaryColor || '#3a0ca3';
    document.getElementById('secondaryColorText').value = settings.secondaryColor || '#3a0ca3';
    document.getElementById('accentColor').value = settings.accentColor || '#f72585';
    document.getElementById('accentColorText').value = settings.accentColor || '#f72585';
    document.getElementById('backgroundColor').value = settings.backgroundColor || '#ffffff';
    document.getElementById('backgroundColorText').value = settings.backgroundColor || '#ffffff';
    document.getElementById('textColor').value = settings.textColor || '#212529';
    document.getElementById('textColorText').value = settings.textColor || '#212529';
    
    // Contact Settings
    document.getElementById('contactPhone').value = settings.contactPhone || '';
    document.getElementById('contactWhatsapp').value = settings.contactWhatsapp || '';
    document.getElementById('contactEmail').value = settings.contactEmail || '';
    document.getElementById('contactAddress').value = settings.contactAddress || '';
    document.getElementById('workingHours').value = settings.workingHours || '';
    document.getElementById('workingDays').value = settings.workingDays || '';
    
    // Social Media
    document.getElementById('facebookUrl').value = settings.facebookUrl || '';
    document.getElementById('twitterUrl').value = settings.twitterUrl || '';
    document.getElementById('instagramUrl').value = settings.instagramUrl || '';
    document.getElementById('youtubeUrl').value = settings.youtubeUrl || '';
    
    // Update logo preview
    if (settings.storeLogo) {
        document.getElementById('logoPreview').src = settings.storeLogo;
        document.getElementById('logoPreview').style.display = 'block';
    }
    
    // Update login logo
    if (settings.storeLogo) {
        document.getElementById('loginLogo').src = settings.storeLogo;
    }
}

// Handle Settings Save
async function handleSettingsSave(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const settings = {
        storeName: document.getElementById('storeName').value,
        heroTitle: document.getElementById('heroTitle').value,
        heroDescription: document.getElementById('heroDescription').value,
        currency: document.getElementById('currency').value,
        language: document.getElementById('language').value,
        storeLogo: document.getElementById('storeLogo').value,
        storeStatus: document.getElementById('storeStatus').value,
        primaryColor: document.getElementById('primaryColor').value,
        secondaryColor: document.getElementById('secondaryColor').value,
        accentColor: document.getElementById('accentColor').value,
        backgroundColor: document.getElementById('backgroundColor').value,
        textColor: document.getElementById('textColor').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactWhatsapp: document.getElementById('contactWhatsapp').value,
        contactEmail: document.getElementById('contactEmail').value,
        contactAddress: document.getElementById('contactAddress').value,
        workingHours: document.getElementById('workingHours').value,
        workingDays: document.getElementById('workingDays').value,
        facebookUrl: document.getElementById('facebookUrl').value,
        twitterUrl: document.getElementById('twitterUrl').value,
        instagramUrl: document.getElementById('instagramUrl').value,
        youtubeUrl: document.getElementById('youtubeUrl').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            },
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            showNotification('Success', 'Settings saved successfully!', 'success');
            
            // Apply theme changes immediately
            applyTheme(settings);
            
            // Update language if changed
            const newLanguage = document.getElementById('language').value;
            if (newLanguage !== 'en') {
                translatePage(newLanguage);
            }
        } else {
            throw new Error('Failed to save settings');
        }
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showNotification('Error', 'Failed to save settings', 'error');
    }
}

// Handle Profile Update
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const profileData = {
        name: document.getElementById('adminNameInput').value,
        avatar: document.getElementById('adminAvatar').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser = updatedUser;
            updateUserInfo();
            showNotification('Success', 'Profile updated successfully!', 'success');
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showNotification('Error', 'Failed to update profile', 'error');
    }
}

// Handle Password Change
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showNotification('Error', 'New passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response.ok) {
            showNotification('Success', 'Password changed successfully!', 'success');
            document.getElementById('passwordForm').reset();
        } else {
            throw new Error('Failed to change password');
        }
    } catch (error) {
        console.error('❌ Error changing password:', error);
        showNotification('Error', 'Failed to change password', 'error');
    }
}

// Setup Image Uploads
function setupImageUploads() {
    // Logo upload
    const logoUploadArea = document.getElementById('logoUploadArea');
    const logoFileInput = document.getElementById('logoFileInput');
    const logoPreview = document.getElementById('logoPreview');
    
    logoUploadArea.addEventListener('click', () => logoFileInput.click());
    logoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        logoUploadArea.style.borderColor = '#4361ee';
        logoUploadArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
    });
    logoUploadArea.addEventListener('dragleave', () => {
        logoUploadArea.style.borderColor = '#ced4da';
        logoUploadArea.style.backgroundColor = '';
    });
    logoUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        logoUploadArea.style.borderColor = '#ced4da';
        logoUploadArea.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleLogoUpload(files[0]);
        }
    });
    
    logoFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleLogoUpload(e.target.files[0]);
        }
    });
    
    // Avatar upload
    const avatarUploadArea = document.getElementById('avatarUploadArea');
    const avatarFileInput = document.getElementById('avatarFileInput');
    const avatarPreview = document.getElementById('avatarPreview');
    
    avatarUploadArea.addEventListener('click', () => avatarFileInput.click());
    avatarUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        avatarUploadArea.style.borderColor = '#4361ee';
        avatarUploadArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
    });
    avatarUploadArea.addEventListener('dragleave', () => {
        avatarUploadArea.style.borderColor = '#ced4da';
        avatarUploadArea.style.backgroundColor = '';
    });
    avatarUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        avatarUploadArea.style.borderColor = '#ced4da';
        avatarUploadArea.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleAvatarUpload(files[0]);
        }
    });
    
    avatarFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleAvatarUpload(e.target.files[0]);
        }
    });
    
    // Product images upload
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4361ee';
        uploadArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#ced4da';
        uploadArea.style.backgroundColor = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ced4da';
        uploadArea.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleProductImagesUpload(files);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleProductImagesUpload(e.target.files);
        }
    });
}

// Handle Logo Upload
async function handleLogoUpload(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Error', 'Please select an image file', 'error');
        return;
    }
    
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const logoPreview = document.getElementById('logoPreview');
    
    progressBar.style.display = 'block';
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update preview
            logoPreview.src = result.url;
            logoPreview.style.display = 'block';
            
            // Update hidden field
            document.getElementById('storeLogo').value = result.url;
            
            // Update login logo
            document.getElementById('loginLogo').src = result.url;
            
            showNotification('Success', 'Logo uploaded successfully!', 'success');
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('❌ Error uploading logo:', error);
        showNotification('Error', 'Failed to upload logo', 'error');
    } finally {
        progressBar.style.display = 'none';
        progressFill.style.width = '0%';
    }
}

// Handle Avatar Upload
async function handleAvatarUpload(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Error', 'Please select an image file', 'error');
        return;
    }
    
    const avatarPreview = document.getElementById('avatarPreview');
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update preview
            avatarPreview.src = result.url;
            avatarPreview.style.display = 'block';
            
            // Update hidden field
            document.getElementById('adminAvatar').value = result.url;
            
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
    
    progressBar.style.display = 'block';
    
    let uploadedUrls = [];
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        showNotification('Error', 'Please select image files only', 'error');
        progressBar.style.display = 'none';
        return;
    }
    
    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
                },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                uploadedUrls.push(result.url);
                
                // Update progress
                const progress = ((i + 1) / imageFiles.length) * 100;
                progressFill.style.width = `${progress}%`;
                
                // Add image preview
                const img = document.createElement('img');
                img.src = result.url;
                img.className = 'image-preview';
                img.style.display = 'block';
                imagePreviewContainer.appendChild(img);
                
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('❌ Error uploading image:', error);
            showNotification('Error', `Failed to upload image: ${file.name}`, 'error');
        }
    }
    
    // Update product images field
    productImages.value = uploadedUrls.join(',');
    
    progressBar.style.display = 'none';
    progressFill.style.width = '0%';
    
    if (uploadedUrls.length > 0) {
        showNotification('Success', `${uploadedUrls.length} images uploaded successfully!`, 'success');
    }
}

// Setup Color Pickers
function setupColorPickers() {
    // Primary color
    const primaryColor = document.getElementById('primaryColor');
    const primaryColorText = document.getElementById('primaryColorText');
    
    primaryColor.addEventListener('input', () => {
        primaryColorText.value = primaryColor.value;
    });
    
    primaryColorText.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(primaryColorText.value)) {
            primaryColor.value = primaryColorText.value;
        }
    });
    
    // Secondary color
    const secondaryColor = document.getElementById('secondaryColor');
    const secondaryColorText = document.getElementById('secondaryColorText');
    
    secondaryColor.addEventListener('input', () => {
        secondaryColorText.value = secondaryColor.value;
    });
    
    secondaryColorText.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(secondaryColorText.value)) {
            secondaryColor.value = secondaryColorText.value;
        }
    });
    
    // Accent color
    const accentColor = document.getElementById('accentColor');
    const accentColorText = document.getElementById('accentColorText');
    
    accentColor.addEventListener('input', () => {
        accentColorText.value = accentColor.value;
    });
    
    accentColorText.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(accentColorText.value)) {
            accentColor.value = accentColorText.value;
        }
    });
    
    // Background color
    const backgroundColor = document.getElementById('backgroundColor');
    const backgroundColorText = document.getElementById('backgroundColorText');
    
    backgroundColor.addEventListener('input', () => {
        backgroundColorText.value = backgroundColor.value;
    });
    
    backgroundColorText.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(backgroundColorText.value)) {
            backgroundColor.value = backgroundColorText.value;
        }
    });
    
    // Text color
    const textColor = document.getElementById('textColor');
    const textColorText = document.getElementById('textColorText');
    
    textColor.addEventListener('input', () => {
        textColorText.value = textColor.value;
    });
    
    textColorText.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(textColorText.value)) {
            textColor.value = textColorText.value;
        }
    });
}

// Apply Theme
function applyTheme(settings) {
    const root = document.documentElement;
    
    if (settings.primaryColor) {
        root.style.setProperty('--primary', settings.primaryColor);
    }
    if (settings.secondaryColor) {
        root.style.setProperty('--secondary', settings.secondaryColor);
    }
    if (settings.accentColor) {
        root.style.setProperty('--accent', settings.accentColor);
    }
    if (settings.backgroundColor) {
        root.style.setProperty('--light', settings.backgroundColor);
    }
    if (settings.textColor) {
        root.style.setProperty('--dark', settings.textColor);
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

// Setup Reset Store Confirmation
function setupResetStoreConfirmation() {
    const resetConfirmInput = document.getElementById('resetConfirmInput');
    const resetStoreBtn = document.getElementById('resetStoreBtn');
    
    resetConfirmInput.addEventListener('input', function() {
        resetStoreBtn.disabled = this.value !== 'RESET';
    });
    
    resetStoreBtn.addEventListener('click', async function() {
        if (!resetStoreBtn.disabled) {
            const confirmed = confirm('Are you absolutely sure? This will permanently delete ALL your store data and cannot be undone!');
            if (confirmed) {
                await resetStoreData();
            }
        }
    });
}

// Reset Store Data
async function resetStoreData() {
    try {
        const response = await fetch(`${API_BASE_URL}/reset`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (response.ok) {
            showNotification('Success', 'Store data has been reset successfully', 'success');
            document.getElementById('resetConfirmInput').value = '';
            document.getElementById('resetStoreBtn').disabled = true;
            
            // Reload dashboard data
            setTimeout(() => {
                loadDashboardData();
            }, 2000);
        } else {
            throw new Error('Reset failed');
        }
    } catch (error) {
        console.error('❌ Error resetting store:', error);
        showNotification('Error', 'Failed to reset store data', 'error');
    }
}

// Show Add Product Modal
function showAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreviewContainer').innerHTML = '';
    document.getElementById('productImages').value = '';
    
    const modal = document.getElementById('productModal');
    modal.classList.add('show');
}

// Edit Product
async function editProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (response.ok) {
            const product = await response.json();
            
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('productId').value = product._id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productQuantity').value = product.quantity;
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productDelivery').value = product.delivery;
            document.getElementById('productStatus').value = product.status;
            
            // Handle images
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            imagePreviewContainer.innerHTML = '';
            
            if (product.images && product.images.length > 0) {
                product.images.forEach(imageUrl => {
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.className = 'image-preview';
                    img.style.display = 'block';
                    imagePreviewContainer.appendChild(img);
                });
                document.getElementById('productImages').value = product.images.join(',');
            }
            
            const modal = document.getElementById('productModal');
            modal.classList.add('show');
        }
    } catch (error) {
        console.error('❌ Error loading product:', error);
        showNotification('Error', 'Failed to load product details', 'error');
    }
}

// Delete Product
async function deleteProduct(productId) {
    const confirmed = confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (response.ok) {
            showNotification('Success', 'Product deleted successfully!', 'success');
            loadProducts();
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showNotification('Error', 'Failed to delete product', 'error');
    }
}

// View Order Details
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            }
        });
        
        if (response.ok) {
            const order = await response.json();
            
            document.getElementById('orderDetailsId').textContent = order._id.slice(-6);
            document.getElementById('orderCustomerName').textContent = order.customerName;
            document.getElementById('orderCustomerPhone').textContent = order.phone;
            document.getElementById('orderCustomerAddress').textContent = order.address || 'N/A';
            document.getElementById('orderDeliveryOption').textContent = order.deliveryOption === 'delivery' ? 'Delivery' : 'Pickup';
            document.getElementById('orderTotalAmount').textContent = `${order.totalAmount || 0} DA`;
            document.getElementById('orderNotes').textContent = order.notes || 'No special notes provided.';
            document.getElementById('orderStatusSelect').value = order.status;
            
            // Populate order items
            const itemsList = document.getElementById('orderItemsList');
            itemsList.innerHTML = '';
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'order-item';
                    itemDiv.innerHTML = `
                        <div>
                            <strong>${item.name}</strong>
                            <div>Quantity: ${item.quantity}</div>
                            <div>Price: ${item.price} DA</div>
                        </div>
                        <div>${item.quantity * item.price} DA</div>
                    `;
                    itemsList.appendChild(itemDiv);
                });
            }
            
            // Set up update status button
            document.getElementById('updateOrderStatusBtn').onclick = () => {
                updateOrderStatus(order._id, document.getElementById('orderStatusSelect').value);
            };
            
            const modal = document.getElementById('orderDetailsModal');
            modal.classList.add('show');
        }
    } catch (error) {
        console.error('❌ Error loading order details:', error);
        showNotification('Error', 'Failed to load order details', 'error');
    }
}

// Update Order Status
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification('Success', `Order status updated to ${status}`, 'success');
            
            // Close modal if open
            document.getElementById('orderDetailsModal').classList.remove('show');
            
            // Reload orders
            loadOrders();
        } else {
            throw new Error('Update failed');
        }
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        showNotification('Error', 'Failed to update order status', 'error');
    }
}

// Show Notification
function showNotification(title, message, type = 'info') {
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    // Set icon based on type
    const icon = notification.querySelector('.notification-icon i');
    icon.className = 'fas ' + (
        type === 'success' ? 'fa-check' :
        type === 'error' ? 'fa-exclamation-circle' :
        type === 'warning' ? 'fa-exclamation-triangle' :
        'fa-info-circle'
    );
    
    // Set color based on type
    notification.style.borderLeftColor = 
        type === 'success' ? 'var(--success)' :
        type === 'error' ? 'var(--danger)' :
        type === 'warning' ? 'var(--warning)' :
        'var(--primary)';
    
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(hideNotification, 5000);
}

// Hide Notification
function hideNotification() {
    notification.classList.remove('show');
}

// Initialize Mobile Optimizations
function initMobileOptimizations() {
    console.log('📱 Mobile optimizations initialized');
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
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
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        }
        
        // Swipe left to close sidebar
        if (diff > 50 && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    });
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

// Close modals with escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }
});

// Close modals with close button
document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', function() {
        this.closest('.modal').classList.remove('show');
    });
});

// Handle product form submission
document.getElementById('productForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value),
        category: document.getElementById('productCategory').value,
        delivery: document.getElementById('productDelivery').value,
        status: document.getElementById('productStatus').value,
        images: document.getElementById('productImages').value ? document.getElementById('productImages').value.split(',') : []
    };
    
    try {
        const url = productId ? `${API_BASE_URL}/products/${productId}` : `${API_BASE_URL}/products`;
        const method = productId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem(TOKEN_KEY)}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            showNotification('Success', `Product ${productId ? 'updated' : 'added'} successfully!`, 'success');
            document.getElementById('productModal').classList.remove('show');
            loadProducts();
        } else {
            throw new Error('Operation failed');
        }
    } catch (error) {
        console.error('❌ Error saving product:', error);
        showNotification('Error', `Failed to ${productId ? 'update' : 'add'} product`, 'error');
    }
});

console.log('✅ Dashboard initialized successfully');
