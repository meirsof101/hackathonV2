// script.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and redirect accordingly
    checkAuthStatus();

    // Registration form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Load dashboard data if on dashboard page
    if (window.location.pathname === '/dashboard') {
        loadDashboardData();
    }
});

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('agriconnect_token');
    const currentPath = window.location.pathname;

    if (token) {
        // User is logged in
        if (currentPath === '/login' || currentPath === '/register') {
            // Redirect to dashboard if trying to access login/register
            window.location.href = '/dashboard';
        }
    } else {
        // User is not logged in
        if (currentPath === '/dashboard') {
            // Redirect to login if trying to access dashboard
            window.location.href = '/login';
        }
    }
}

// Handle registration
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        email: formData.get('email'),
        password: formData.get('password'),
        farmName: formData.get('farmName'),
        farmerName: formData.get('farmerName'),
        location: formData.get('location'),
        phone: formData.get('phone'),
        cropTypes: formData.get('cropTypes'),
        farmSize: formData.get('farmSize')
    };

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        const messageDiv = document.getElementById('message');

        if (response.ok) {
            showMessage(messageDiv, 'Registration successful! You can now login.', 'success');
            e.target.reset();
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        } else {
            showMessage(messageDiv, data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(document.getElementById('message'), 'Network error. Please try again.', 'error');
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();
        const messageDiv = document.getElementById('loginMessage');

        if (response.ok) {
            // Store token and user data
            localStorage.setItem('agriconnect_token', data.token);
            localStorage.setItem('agriconnect_user', JSON.stringify(data.user));
            
            showMessage(messageDiv, 'Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard after 1 second
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showMessage(messageDiv, data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(document.getElementById('loginMessage'), 'Network error. Please try again.', 'error');
    }
}

// Handle logout
async function handleLogout() {
    try {
        const token = localStorage.getItem('agriconnect_token');
        
        await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Clear local storage
        localStorage.removeItem('agriconnect_token');
        localStorage.removeItem('agriconnect_user');
        
        // Redirect to home page
        window.location.href = '/';
        
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear local storage and redirect even if API call fails
        localStorage.removeItem('agriconnect_token');
        localStorage.removeItem('agriconnect_user');
        window.location.href = '/';
    }
}

// Load dashboard data
async function loadDashboardData() {
    const token = localStorage.getItem('agriconnect_token');
    const user = JSON.parse(localStorage.getItem('agriconnect_user') || '{}');
    
    // Update welcome message
    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome && user.farmerName) {
        userWelcome.textContent = `Welcome, ${user.farmerName}!`;
    }
    
    // Load detailed profile information
    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayProfileInfo(data.user);
        } else {
            console.error('Failed to load profile data');
            document.getElementById('profileInfo').innerHTML = '<p><strong>Error loading profile data</strong></p>';
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('profileInfo').innerHTML = '<p><strong>Error loading profile data</strong></p>';
    }
}

// Display profile information
function displayProfileInfo(user) {
    const profileDiv = document.getElementById('profileInfo');
    
    if (!profileDiv) return;
    
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };
    
    profileDiv.innerHTML = `
        <p><strong>Farmer:</strong> ${user.farmerName}</p>
        <p><strong>Farm:</strong> ${user.farmName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        ${user.location ? `<p><strong>Location:</strong> ${user.location}</p>` : ''}
        ${user.phone ? `<p><strong>Phone:</strong> ${user.phone}</p>` : ''}
        ${user.cropTypes ? `<p><strong>Main Crops:</strong> ${user.cropTypes}</p>` : ''}
        ${user.farmSize ? `<p><strong>Farm Size:</strong> ${user.farmSize.charAt(0).toUpperCase() + user.farmSize.slice(1)}</p>` : ''}
        <p><strong>Member Since:</strong> ${formatDate(user.createdAt)}</p>
    `;
}

// Show message helper function
function showMessage(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    // Auto-hide error messages after 5 seconds
    if (type === 'error') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Utility function to get authentication headers
function getAuthHeaders() {
    const token = localStorage.getItem('agriconnect_token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Form validation helpers
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Add real-time form validation
document.addEventListener('DOMContentLoaded', function() {
    // Email validation
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                this.style.borderColor = '#dc3545';
                showValidationMessage(this, 'Please enter a valid email address');
            } else {
                this.style.borderColor = '#4a7c26';
                hideValidationMessage(this);
            }
        });
    });
    
    // Password validation
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validatePassword(this.value)) {
                this.style.borderColor = '#dc3545';
                showValidationMessage(this, 'Password must be at least 6 characters long');
            } else if (this.value) {
                this.style.borderColor = '#4a7c26';
                hideValidationMessage(this);
            }
        });
    });
});

function showValidationMessage(input, message) {
    hideValidationMessage(input); // Remove any existing message
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin-top: 0.25rem;';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
}

function hideValidationMessage(input) {
    const existingError = input.parentNode.querySelector('.validation-error');
    if (existingError) {
        existingError.remove();
    }
}