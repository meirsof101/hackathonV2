// server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-this-in-production';

// Database setup
const db = new sqlite3.Database('./agriconnect.db');

// Create users table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        farm_name TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        location TEXT,
        phone TEXT,
        crop_types TEXT,
        farm_size TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'agriconnect-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, farmName, farmerName, location, phone, cropTypes, farmSize } = req.body;

        // Validate required fields
        if (!email || !password || !farmName || !farmerName) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }

        // Check if user already exists
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Insert new user
            const stmt = db.prepare(`INSERT INTO users 
                (email, password_hash, farm_name, farmer_name, location, phone, crop_types, farm_size) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

            stmt.run([email, passwordHash, farmName, farmerName, location, phone, cropTypes, farmSize], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create account' });
                }

                res.status(201).json({ 
                    message: 'Account created successfully',
                    userId: this.lastID
                });
            });

            stmt.finalize();
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        try {
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return res.status(400).json({ error: 'Invalid email or password' });
            }

            // Create JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    farmName: user.farm_name,
                    farmerName: user.farmer_name,
                    location: user.location
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });
});

// Get user profile endpoint
app.get('/api/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, email, farm_name, farmer_name, location, phone, crop_types, farm_size, created_at FROM users WHERE id = ?', 
        [req.user.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                farmName: user.farm_name,
                farmerName: user.farmer_name,
                location: user.location,
                phone: user.phone,
                cropTypes: user.crop_types,
                farmSize: user.farm_size,
                createdAt: user.created_at
            }
        });
    });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});
// MARKETPLACE ROUTES
// ===================

// Get all marketplace items
app.get('/api/marketplace', (req, res) => {
    const { category, search, limit = 20, offset = 0 } = req.query;
    
    let sql = `SELECT m.*, u.farmer_name, u.location as seller_location 
               FROM marketplace_items m 
               JOIN users u ON m.seller_id = u.id 
               WHERE m.status = 'active'`;
    let params = [];
    
    if (category) {
        sql += ' AND m.category = ?';
        params.push(category);
    }
    
    if (search) {
        sql += ' AND (m.title LIKE ? OR m.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ items });
    });
});

// Create marketplace item
app.post('/api/marketplace', authenticateToken, (req, res) => {
    const { title, description, category, price, quantity, unit, location } = req.body;
    
    if (!title || !category || !price) {
        return res.status(400).json({ error: 'Title, category, and price are required' });
    }
    
    const sql = `INSERT INTO marketplace_items 
                (seller_id, title, description, category, price, quantity, unit, location) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [req.user.userId, title, description, category, price, quantity, unit, location], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create item' });
        }
        res.status(201).json({ message: 'Item created successfully', itemId: this.lastID });
    });
});

// Get single marketplace item
app.get('/api/marketplace/:id', (req, res) => {
    const sql = `SELECT m.*, u.farmer_name, u.location as seller_location, u.phone, u.email
                FROM marketplace_items m 
                JOIN users u ON m.seller_id = u.id 
                WHERE m.id = ?`;
    
    db.get(sql, [req.params.id], (err, item) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ item });
    });
});

// ===================
// FARM MANAGEMENT ROUTES
// ===================

// Get farmer's crops
app.get('/api/farm/crops', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM farm_crops WHERE farmer_id = ? ORDER BY planting_date DESC`;
    
    db.all(sql, [req.user.userId], (err, crops) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ crops });
    });
});

// Add new crop
app.post('/api/farm/crops', authenticateToken, (req, res) => {
    const { crop_name, variety, planting_date, expected_harvest, area_planted, notes } = req.body;
    
    if (!crop_name || !planting_date) {
        return res.status(400).json({ error: 'Crop name and planting date are required' });
    }
    
    const sql = `INSERT INTO farm_crops 
                (farmer_id, crop_name, variety, planting_date, expected_harvest, area_planted, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [req.user.userId, crop_name, variety, planting_date, expected_harvest, area_planted, notes], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add crop' });
        }
        res.status(201).json({ message: 'Crop added successfully', cropId: this.lastID });
    });
});

// Get farm activities
app.get('/api/farm/activities', authenticateToken, (req, res) => {
    const sql = `SELECT a.*, c.crop_name 
                FROM farm_activities a 
                LEFT JOIN farm_crops c ON a.crop_id = c.id 
                WHERE a.farmer_id = ? 
                ORDER BY a.date DESC`;
    
    db.all(sql, [req.user.userId], (err, activities) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ activities });
    });
});

// Add farm activity
app.post('/api/farm/activities', authenticateToken, (req, res) => {
    const { crop_id, activity_type, description, date, cost, notes } = req.body;
    
    if (!activity_type || !date) {
        return res.status(400).json({ error: 'Activity type and date are required' });
    }
    
    const sql = `INSERT INTO farm_activities 
                (farmer_id, crop_id, activity_type, description, date, cost, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [req.user.userId, crop_id, activity_type, description, date, cost, notes], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add activity' });
        }
        res.status(201).json({ message: 'Activity added successfully', activityId: this.lastID });
    });
});

// Get financial records
app.get('/api/farm/finances', authenticateToken, (req, res) => {
    const { type, startDate, endDate } = req.query;
    let sql = `SELECT * FROM farm_finances WHERE farmer_id = ?`;
    let params = [req.user.userId];
    
    if (type) {
        sql += ' AND type = ?';
        params.push(type);
    }
    
    if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
    }
    
    sql += ' ORDER BY date DESC';
    
    db.all(sql, params, (err, finances) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ finances });
    });
});

// Add financial record
app.post('/api/farm/finances', authenticateToken, (req, res) => {
    const { type, category, amount, description, date } = req.body;
    
    if (!type || !category || !amount || !date) {
        return res.status(400).json({ error: 'Type, category, amount, and date are required' });
    }
    
    const sql = `INSERT INTO farm_finances 
                (farmer_id, type, category, amount, description, date) 
                VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [req.user.userId, type, category, amount, description, date], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to add financial record' });
        }
        res.status(201).json({ message: 'Financial record added successfully', recordId: this.lastID });
    });
});

// ===================
// FARMER CONNECTION ROUTES
// ===================

// Get all farmers (for discovery)
app.get('/api/farmers', authenticateToken, (req, res) => {
    const { search, location, crop_types } = req.query;
    let sql = `SELECT id, farmer_name, farm_name, location, crop_types, phone 
               FROM users WHERE id != ?`;
    let params = [req.user.userId];
    
    if (search) {
        sql += ' AND (farmer_name LIKE ? OR farm_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    if (location) {
        sql += ' AND location LIKE ?';
        params.push(`%${location}%`);
    }
    
    if (crop_types) {
        sql += ' AND crop_types LIKE ?';
        params.push(`%${crop_types}%`);
    }
    
    sql += ' ORDER BY farmer_name LIMIT 50';
    
    db.all(sql, params, (err, farmers) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ farmers });
    });
});

// Follow a farmer
app.post('/api/farmers/:id/follow', authenticateToken, (req, res) => {
    const followingId = req.params.id;
    
    if (followingId == req.user.userId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    const sql = `INSERT INTO farmer_connections (follower_id, following_id) VALUES (?, ?)`;
    
    db.run(sql, [req.user.userId, followingId], function(err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(400).json({ error: 'Already following this farmer' });
            }
            return res.status(500).json({ error: 'Failed to follow farmer' });
        }
        res.json({ message: 'Successfully followed farmer' });
    });
});

// Get farmer's connections
app.get('/api/farmers/connections', authenticateToken, (req, res) => {
    const sql = `SELECT u.id, u.farmer_name, u.farm_name, u.location, u.crop_types
                FROM farmer_connections fc
                JOIN users u ON fc.following_id = u.id
                WHERE fc.follower_id = ?
                ORDER BY u.farmer_name`;
    
    db.all(sql, [req.user.userId], (err, connections) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ connections });
    });
});

// Send message to farmer
app.post('/api/messages', authenticateToken, (req, res) => {
    const { receiver_id, subject, message } = req.body;
    
    if (!receiver_id || !message) {
        return res.status(400).json({ error: 'Receiver and message are required' });
    }
    
    const sql = `INSERT INTO messages (sender_id, receiver_id, subject, message) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [req.user.userId, receiver_id, subject, message], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to send message' });
        }
        res.status(201).json({ message: 'Message sent successfully', messageId: this.lastID });
    });
});

// Get user's messages
app.get('/api/messages', authenticateToken, (req, res) => {
    const sql = `SELECT m.*, u.farmer_name as sender_name 
                FROM messages m 
                JOIN users u ON m.sender_id = u.id 
                WHERE m.receiver_id = ? 
                ORDER BY m.created_at DESC`;
    
    db.all(sql, [req.user.userId], (err, messages) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ messages });
    });
});

// ===================
// COMMUNITY ROUTES
// ===================

// Get community posts
app.get('/api/community/posts', (req, res) => {
    const { category, limit = 20, offset = 0 } = req.query;
    let sql = `SELECT p.*, u.farmer_name, u.farm_name 
               FROM community_posts p 
               JOIN users u ON p.author_id = u.id`;
    let params = [];
    
    if (category) {
        sql += ' WHERE p.category = ?';
        params.push(category);
    }
    
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, posts) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ posts });
    });
});

// Create community post
app.post('/api/community/posts', authenticateToken, (req, res) => {
    const { title, content, category } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const sql = `INSERT INTO community_posts (author_id, title, content, category) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [req.user.userId, title, content, category], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create post' });
        }
        res.status(201).json({ message: 'Post created successfully', postId: this.lastID });
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`AgriConnect server running on http://localhost:${PORT}`);
    console.log('Visit http://localhost:3000 to access your website');
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});