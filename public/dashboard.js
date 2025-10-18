// API Configuration
const API_BASE_URL = 'https://my-store-p63u.onrender.com/api';
let authToken = localStorage.getItem('adminToken');

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const adminName = document.getElementById('adminName');
const adminAvatar = document.getElementById('adminAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const notification = document.getElementById('notification');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const notificationClose = document.getElementById('notificationClose');

// Stats Elements
const ordersCount = document.getElementById('ordersCount');
const productsCount = document.getElementById('productsCount');
const visitorsCount = document.getElementById('visitorsCount');
const revenueAmount = document.getElementById('revenueAmount');

// Tab Management
const menuItems = document.querySelectorAll('.menu-item[data-tab]');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎉 Dashboard page loaded');
    initializeDashboard();
    setupEventListeners();
    initializeMobileOptimizations();
});

function initializeDashboard() {
    console.log('🎯 Initializing dashboard...');
    
    // Check API health first
    checkApiHealth().then(isHealthy => {
        if (!isHealthy) {
            showNotification('Error', 'API server is not responding. Please try again later.', 'error');
            return;
        }
        
        // Check authentication
        if (authToken) {
            console.log('🔑 Token found, verifying...');
            verifyToken();
        } else {
            console.log('🔐 No token found, showing login');
            showLoginPage();
        }
    }).catch(error => {
        console.error('❌ API health check failed:', error);
        showNotification('Connection Error', 'Unable to connect to server. Please check your internet connection.', 'error');
    });
}

async function checkApiHealth() {
    console.log('🔍 Checking API health...');
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('✅ API is healthy:', data);
        return data.status === 'OK';
    } catch (error) {
        console.error('❌ API health check failed:', error);
        return false;
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Token verified, user:', userData.name);
            updateUserInfo(userData);
            showDashboard();
            loadDashboardData();
        } else {
            console.log('❌ Token verification failed');
            localStorage.removeItem('adminToken');
            authToken = null;
            showLoginPage();
        }
    } catch (error) {
        console.error('❌ Token verification error:', error);
        showNotification('Connection Error', 'Unable to verify authentication. Please try again.', 'error');
    }
}

function updateUserInfo(userData) {
    adminName.textContent = userData.name || 'Admin User';
    console.log('👤 User info updated:', userData.name);
}

function showLoginPage() {
    loginPage.style.display = 'flex';
    dashboard.style.display = 'none';
}

function showDashboard() {
    loginPage.style.display = 'none';
    dashboard.style.display = 'flex';
    console.log('📊 Dashboard displayed');
}

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Mobile menu toggle
    menuToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Tab switching
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
    
    // Notification close
    notificationClose.addEventListener('click', hideNotification);
    
    // Settings tabs
    const settingsTabs = document.querySelectorAll('.tab[data-tab]');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchSettingsTab(tabId);
        });
    });
    
    // Product management
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => openProductModal());
    }
    
    // Image upload handling
    setupImageUploads();
    
    // Reset store confirmation
    const resetConfirmInput = document.getElementById('resetConfirmInput');
    const resetStoreBtn = document.getElementById('resetStoreBtn');
    
    if (resetConfirmInput && resetStoreBtn) {
        resetConfirmInput.addEventListener('input', function() {
            resetStoreBtn.disabled = this.value !== 'RESET';
        });
        
        resetStoreBtn.addEventListener('click', handleResetStore);
    }
    
    console.log('✅ Event listeners setup complete');
}

function initializeMobileOptimizations() {
    // Add touch-specific optimizations
    document.addEventListener('touchstart', function() {}, { passive: true });
    
    // Prevent zoom on double-tap for buttons
    const buttons = document.querySelectorAll('button, .menu-item, .action-btn');
    buttons.forEach(button => {
        button.style.touchAction = 'manipulation';
    });
    
    // Improve scrolling performance
    const scrollElements = document.querySelectorAll('.table-responsive, .modal-content');
    scrollElements.forEach(element => {
        element.style.webkitOverflowScrolling = 'touch';
    });
    
    console.log('📱 Mobile optimizations initialized');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const password = passwordInput.value.trim();
    if (!password) {
        showNotification('Error', 'Please enter your password', 'error');
        return;
    }
    
    const loginBtn = loginForm.querySelector('button');
    const originalText = loginBtn.innerHTML;
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
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            showNotification('Success', 'Login successful!', 'success');
            setTimeout(() => {
                verifyToken();
            }, 1000);
        } else {
            const errorData = await response.json();
            showNotification('Login Failed', errorData.message || 'Invalid password', 'error');
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showNotification('Connection Error', 'Unable to connect to server. Please try again.', 'error');
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('adminToken');
    authToken = null;
    showNotification('Success', 'Logged out successfully', 'success');
    setTimeout(() => {
        showLoginPage();
    }, 1000);
}

function toggleSidebar() {
    sidebar.classList.toggle('show');
    sidebarOverlay.style.display = sidebar.classList.contains('show') ? 'block' : 'none';
}

function closeSidebar() {
    sidebar.classList.remove('show');
    sidebarOverlay.style.display = 'none';
}

function switchTab(tabId) {
    // Update active menu item
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        }
    });
    
    // Update active tab content
    tabContents.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Update header title
    const headerTitle = document.querySelector('.header h1');
    const activeMenuItem = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    if (headerTitle && activeMenuItem) {
        const tabName = activeMenuItem.querySelector('span').textContent;
        headerTitle.textContent = tabName;
    }
    
    // Load tab-specific data
    loadTabData(tabId);
}

function switchSettingsTab(tabId) {
    const tabs = document.querySelectorAll('.tab[data-tab]');
    const tabContents = document.querySelectorAll('#settings-tab .tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateStats(stats);
            console.log('📈 Stats loaded:', stats);
        }
        
        // Load recent orders
        const ordersResponse = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            updateRecentOrders(orders);
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('Error', 'Failed to load dashboard data', 'error');
    }
}

function updateStats(stats) {
    if (ordersCount) ordersCount.textContent = stats.orders || 0;
    if (productsCount) productsCount.textContent = stats.products || 0;
    if (visitorsCount) visitorsCount.textContent = stats.visitors || 0;
    if (revenueAmount) revenueAmount.textContent = `${stats.revenue || 0} DA`;
}

function updateRecentOrders(orders) {
    const tableBody = document.querySelector('#recentOrdersTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const recentOrders = orders.slice(0, 5); // Show only 5 most recent
    
    recentOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customerName || 'N/A'}</td>
            <td>${order.total || 0} DA</td>
            <td><span class="status-badge ${order.status || 'pending'}">${order.status || 'pending'}</span></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-btn btn-primary" onclick="viewOrderDetails(${order.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function loadTabData(tabId) {
    switch (tabId) {
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

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const products = await response.json();
            updateProductsTable(products);
        }
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showNotification('Error', 'Failed to load products', 'error');
    }
}

function updateProductsTable(products) {
    const tableBody = document.querySelector('#productsTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                ${product.images && product.images.length > 0 ? 
                    `<img src="${product.images[0]}" alt="${product.name}" class="product-thumbnail" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZThlY2VmIi8+Cjx0ZXh0IHg9IjIwIiB5PSIyMiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTUc8L3RleHQ+Cjwvc3ZnPg=='">` : 
                    '<div class="no-image">No Image</div>'
                }
            </td>
            <td>${product.name}</td>
            <td>${product.price || 0} DA</td>
            <td>${product.quantity || 0}</td>
            <td>${product.category || 'Uncategorized'}</td>
            <td>${product.delivery === false ? 'Pickup Only' : 'Available'}</td>
            <td><span class="status-badge ${product.status ? 'active' : 'inactive'}">${product.status ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-group">
                    <button class="action-btn btn-primary" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const orders = await response.json();
            updateOrdersTable(orders);
        }
    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showNotification('Error', 'Failed to load orders', 'error');
    }
}

function updateOrdersTable(orders) {
    const tableBody = document.querySelector('#ordersTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customerName || 'N/A'}</td>
            <td>${order.customerPhone || 'N/A'}</td>
            <td>${order.items ? order.items.length : 0}</td>
            <td>${order.total || 0} DA</td>
            <td>${order.deliveryOption === 'pickup' ? 'Pickup' : 'Delivery'}</td>
            <td><span class="status-badge ${order.status || 'pending'}">${order.status || 'pending'}</span></td>
            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-group">
                    <button class="action-btn btn-primary" onclick="viewOrderDetails(${order.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-success" onclick="updateOrderStatus(${order.id}, 'completed')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn btn-danger" onclick="updateOrderStatus(${order.id}, 'cancelled')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const settings = await response.json();
            populateSettingsForm(settings);
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
    }
}

function populateSettingsForm(settings) {
    // General settings
    if (settings.storeName) document.getElementById('storeName').value = settings.storeName;
    if (settings.heroTitle) document.getElementById('heroTitle').value = settings.heroTitle;
    if (settings.heroDescription) document.getElementById('heroDescription').value = settings.heroDescription;
    if (settings.currency) document.getElementById('currency').value = settings.currency;
    if (settings.language) document.getElementById('language').value = settings.language;
    if (settings.storeLogo) {
        document.getElementById('storeLogo').value = settings.storeLogo;
        const logoPreview = document.getElementById('logoPreview');
        logoPreview.src = settings.storeLogo;
        logoPreview.style.display = 'block';
    }
    if (settings.storeStatus !== undefined) document.getElementById('storeStatus').value = settings.storeStatus.toString();
    
    // Theme settings
    if (settings.primaryColor) {
        document.getElementById('primaryColor').value = settings.primaryColor;
        document.getElementById('primaryColorText').value = settings.primaryColor;
    }
    if (settings.secondaryColor) {
        document.getElementById('secondaryColor').value = settings.secondaryColor;
        document.getElementById('secondaryColorText').value = settings.secondaryColor;
    }
    if (settings.accentColor) {
        document.getElementById('accentColor').value = settings.accentColor;
        document.getElementById('accentColorText').value = settings.accentColor;
    }
    if (settings.backgroundColor) {
        document.getElementById('backgroundColor').value = settings.backgroundColor;
        document.getElementById('backgroundColorText').value = settings.backgroundColor;
    }
    if (settings.textColor) {
        document.getElementById('textColor').value = settings.textColor;
        document.getElementById('textColorText').value = settings.textColor;
    }
    
    // Contact settings
    if (settings.contactPhone) document.getElementById('contactPhone').value = settings.contactPhone;
    if (settings.contactWhatsapp) document.getElementById('contactWhatsapp').value = settings.contactWhatsapp;
    if (settings.contactEmail) document.getElementById('contactEmail').value = settings.contactEmail;
    if (settings.contactAddress) document.getElementById('contactAddress').value = settings.contactAddress;
    if (settings.workingHours) document.getElementById('workingHours').value = settings.workingHours;
    if (settings.workingDays) document.getElementById('workingDays').value = settings.workingDays;
    
    // Social media settings
    if (settings.facebookUrl) document.getElementById('facebookUrl').value = settings.facebookUrl;
    if (settings.twitterUrl) document.getElementById('twitterUrl').value = settings.twitterUrl;
    if (settings.instagramUrl) document.getElementById('instagramUrl').value = settings.instagramUrl;
    if (settings.youtubeUrl) document.getElementById('youtubeUrl').value = settings.youtubeUrl;
}

async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            populateProfileForm(profile);
        }
    } catch (error) {
        console.error('❌ Error loading profile:', error);
    }
}

function populateProfileForm(profile) {
    if (profile.name) document.getElementById('adminNameInput').value = profile.name;
    if (profile.role) document.getElementById('adminRole').value = profile.role;
    if (profile.avatar) {
        document.getElementById('adminAvatar').value = profile.avatar;
        const avatarPreview = document.getElementById('avatarPreview');
        avatarPreview.src = profile.avatar;
        avatarPreview.style.display = 'block';
    }
}

// Product Modal Functions
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    if (productId) {
        title.textContent = 'Edit Product';
        loadProductData(productId);
    } else {
        title.textContent = 'Add Product';
        form.reset();
        document.getElementById('productId').value = '';
        document.getElementById('imagePreviewContainer').innerHTML = '';
    }
    
    modal.classList.add('show');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('show');
}

async function loadProductData(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const product = await response.json();
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productPrice').value = product.price || '';
            document.getElementById('productQuantity').value = product.quantity || '';
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productDelivery').value = product.delivery === false ? 'false' : 'true';
            document.getElementById('productStatus').value = product.status ? 'true' : 'false';
            
            // Load images
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            imagePreviewContainer.innerHTML = '';
            
            if (product.images && product.images.length > 0) {
                product.images.forEach(image => {
                    const img = document.createElement('img');
                    img.src = image;
                    img.className = 'image-preview';
                    img.onerror = function() {
                        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZThlY2VmIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTUc8L3RleHQ+Cjwvc3ZnPg==';
                    };
                    imagePreviewContainer.appendChild(img);
                });
            }
        }
    } catch (error) {
        console.error('❌ Error loading product data:', error);
        showNotification('Error', 'Failed to load product data', 'error');
    }
}

async function saveProduct(formData) {
    try {
        const url = formData.get('id') ? 
            `${API_BASE_URL}/products/${formData.get('id')}` : 
            `${API_BASE_URL}/products`;
            
        const method = formData.get('id') ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            showNotification('Success', `Product ${formData.get('id') ? 'updated' : 'created'} successfully`, 'success');
            closeProductModal();
            loadProducts();
        } else {
            const errorData = await response.json();
            showNotification('Error', errorData.message || 'Failed to save product', 'error');
        }
    } catch (error) {
        console.error('❌ Error saving product:', error);
        showNotification('Error', 'Failed to save product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Success', 'Product deleted successfully', 'success');
            loadProducts();
        } else {
            showNotification('Error', 'Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showNotification('Error', 'Failed to delete product', 'error');
    }
}

// Order Functions
async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const order = await response.json();
            showOrderDetailsModal(order);
        }
    } catch (error) {
        console.error('❌ Error loading order details:', error);
        showNotification('Error', 'Failed to load order details', 'error');
    }
}

function showOrderDetailsModal(order) {
    const modal = document.getElementById('orderDetailsModal');
    document.getElementById('orderDetailsId').textContent = order.id;
    document.getElementById('orderCustomerName').textContent = order.customerName || 'N/A';
    document.getElementById('orderCustomerPhone').textContent = order.customerPhone || 'N/A';
    document.getElementById('orderCustomerAddress').textContent = order.customerAddress || 'N/A';
    document.getElementById('orderDeliveryOption').textContent = order.deliveryOption === 'pickup' ? 'Pickup' : 'Delivery';
    document.getElementById('orderTotalAmount').textContent = `${order.total || 0} DA`;
    document.getElementById('orderNotes').textContent = order.specialNotes || 'No special notes provided.';
    document.getElementById('orderStatusSelect').value = order.status || 'pending';
    
    // Populate order items
    const itemsList = document.getElementById('orderItemsList');
    itemsList.innerHTML = '';
    
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'order-item';
            itemDiv.innerHTML = `
                <div class="order-item-details">
                    <strong>${item.name}</strong>
                    <span>${item.quantity} x ${item.price} DA</span>
                </div>
            `;
            itemsList.appendChild(itemDiv);
        });
    }
    
    modal.classList.add('show');
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification('Success', `Order status updated to ${status}`, 'success');
            loadOrders();
            if (document.getElementById('dashboard-tab').classList.contains('active')) {
                loadDashboardData();
            }
        } else {
            showNotification('Error', 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('❌ Error updating order status:', error);
        showNotification('Error', 'Failed to update order status', 'error');
    }
}

// Settings Functions
async function saveSettings(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Success', 'Settings saved successfully', 'success');
        } else {
            showNotification('Error', 'Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showNotification('Error', 'Failed to save settings', 'error');
    }
}

// Profile Functions
async function updateProfile(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const updatedProfile = await response.json();
            updateUserInfo(updatedProfile);
            showNotification('Success', 'Profile updated successfully', 'success');
        } else {
            showNotification('Error', 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showNotification('Error', 'Failed to update profile', 'error');
    }
}

// Reset Store Function
async function handleResetStore() {
    if (!confirm('Are you absolutely sure? This will delete ALL your data including products, orders, and settings. This action cannot be undone!')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/reset`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Success', 'Store data has been reset successfully', 'success');
            document.getElementById('resetConfirmInput').value = '';
            document.getElementById('resetStoreBtn').disabled = true;
            loadDashboardData();
        } else {
            showNotification('Error', 'Failed to reset store data', 'error');
        }
    } catch (error) {
        console.error('❌ Error resetting store:', error);
        showNotification('Error', 'Failed to reset store data', 'error');
    }
}

// Image Upload Handling
function setupImageUploads() {
    // Product image upload
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
            uploadArea.style.background = '#f8f9ff';
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#ddd';
            uploadArea.style.background = 'transparent';
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ddd';
            uploadArea.style.background = 'transparent';
            handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
    }
    
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                uploadImage(file);
            }
        });
    }
    
    function uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
        
        fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.url) {
                // Add image to preview
                const img = document.createElement('img');
                img.src = data.url;
                img.className = 'image-preview';
                img.onerror = function() {
                    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZThlY2VmIi8+Cjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmM3NTdkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JTUc8L3RleHQ+Cjwvc3ZnPg==';
                };
                imagePreviewContainer.appendChild(img);
                
                // Update images textarea
                const imagesTextarea = document.getElementById('productImages');
                const currentImages = imagesTextarea.value ? imagesTextarea.value.split('\n') : [];
                currentImages.push(data.url);
                imagesTextarea.value = currentImages.join('\n');
            }
        })
        .catch(error => {
            console.error('❌ Error uploading image:', error);
            showNotification('Error', 'Failed to upload image', 'error');
        })
        .finally(() => {
            progressBar.style.display = 'none';
        });
    }
    
    // Setup other upload areas (logo, avatar)
    setupSingleImageUpload('logoUploadArea', 'logoFileInput', 'logoPreview', 'storeLogo');
    setupSingleImageUpload('avatarUploadArea', 'avatarFileInput', 'avatarPreview', 'adminAvatar');
}

function setupSingleImageUpload(uploadAreaId, fileInputId, previewId, hiddenInputId) {
    const uploadArea = document.getElementById(uploadAreaId);
    const fileInput = document.getElementById(fileInputId);
    const preview = document.getElementById(previewId);
    const hiddenInput = document.getElementById(hiddenInputId);
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                uploadSingleImage(file, preview, hiddenInput);
            }
        });
    }
}

function uploadSingleImage(file, previewElement, hiddenInput) {
    const formData = new FormData();
    formData.append('image', file);
    
    fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.url) {
            previewElement.src = data.url;
            previewElement.style.display = 'block';
            hiddenInput.value = data.url;
        }
    })
    .catch(error => {
        console.error('❌ Error uploading image:', error);
        showNotification('Error', 'Failed to upload image', 'error');
    });
}

// Form Submission Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Product form
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('name', document.getElementById('productName').value);
            formData.append('description', document.getElementById('productDescription').value);
            formData.append('price', document.getElementById('productPrice').value);
            formData.append('quantity', document.getElementById('productQuantity').value);
            formData.append('category', document.getElementById('productCategory').value);
            formData.append('delivery', document.getElementById('productDelivery').value === 'true');
            formData.append('status', document.getElementById('productStatus').value === 'true');
            
            const productId = document.getElementById('productId').value;
            if (productId) {
                formData.append('id', productId);
            }
            
            // Add images
            const imagesTextarea = document.getElementById('productImages');
            if (imagesTextarea.value) {
                const images = imagesTextarea.value.split('\n').filter(url => url.trim());
                images.forEach((url, index) => {
                    formData.append(`images[${index}]`, url);
                });
            }
            
            saveProduct(formData);
        });
    }
    
    // Settings form
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                storeName: document.getElementById('storeName').value,
                heroTitle: document.getElementById('heroTitle').value,
                heroDescription: document.getElementById('heroDescription').value,
                currency: document.getElementById('currency').value,
                language: document.getElementById('language').value,
                storeLogo: document.getElementById('storeLogo').value,
                storeStatus: document.getElementById('storeStatus').value === 'true',
                
                // Theme
                primaryColor: document.getElementById('primaryColor').value,
                secondaryColor: document.getElementById('secondaryColor').value,
                accentColor: document.getElementById('accentColor').value,
                backgroundColor: document.getElementById('backgroundColor').value,
                textColor: document.getElementById('textColor').value,
                
                // Contact
                contactPhone: document.getElementById('contactPhone').value,
                contactWhatsapp: document.getElementById('contactWhatsapp').value,
                contactEmail: document.getElementById('contactEmail').value,
                contactAddress: document.getElementById('contactAddress').value,
                workingHours: document.getElementById('workingHours').value,
                workingDays: document.getElementById('workingDays').value,
                
                // Social
                facebookUrl: document.getElementById('facebookUrl').value,
                twitterUrl: document.getElementById('twitterUrl').value,
                instagramUrl: document.getElementById('instagramUrl').value,
                youtubeUrl: document.getElementById('youtubeUrl').value
            };
            
            saveSettings(formData);
        });
    }
    
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('adminNameInput').value,
                avatar: document.getElementById('adminAvatar').value
            };
            
            updateProfile(formData);
        });
    }
    
    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                showNotification('Error', 'New passwords do not match', 'error');
                return;
            }
            
            changePassword(currentPassword, newPassword);
        });
    }
    
    // Order status update
    const updateOrderStatusBtn = document.getElementById('updateOrderStatusBtn');
    if (updateOrderStatusBtn) {
        updateOrderStatusBtn.addEventListener('click', function() {
            const orderId = document.getElementById('orderDetailsId').textContent;
            const status = document.getElementById('orderStatusSelect').value;
            updateOrderStatus(orderId, status);
        });
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').classList.remove('show');
        });
    });
    
    // Close modals when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
});

async function changePassword(currentPassword, newPassword) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        if (response.ok) {
            showNotification('Success', 'Password changed successfully', 'success');
            document.getElementById('passwordForm').reset();
        } else {
            const errorData = await response.json();
            showNotification('Error', errorData.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('❌ Error changing password:', error);
        showNotification('Error', 'Failed to change password', 'error');
    }
}

// Notification System
function showNotification(title, message, type = 'info') {
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    // Set notification color based on type
    const icon = notification.querySelector('.notification-icon i');
    const notificationElement = notification.querySelector('.notification');
    
    notification.classList.remove('success', 'error', 'warning', 'info');
    notification.classList.add(type);
    
    // Update icon
    switch (type) {
        case 'success':
            icon.className = 'fas fa-check';
            notification.style.borderLeftColor = 'var(--success)';
            break;
        case 'error':
            icon.className = 'fas fa-exclamation-triangle';
            notification.style.borderLeftColor = 'var(--danger)';
            break;
        case 'warning':
            icon.className = 'fas fa-exclamation-circle';
            notification.style.borderLeftColor = 'var(--warning)';
            break;
        default:
            icon.className = 'fas fa-info-circle';
            notification.style.borderLeftColor = 'var(--primary)';
    }
    
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

function hideNotification() {
    notification.classList.remove('show');
}

// Global functions for HTML onclick handlers
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.viewOrderDetails = viewOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.closeProductModal = closeProductModal;

console.log('✅ Dashboard initialized successfully');