const express = require('express');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt'); // For secure password hashing
const pool = require('./db/pool'); // Database connection pool
const crudRoutes = require('./routes/crud'); // Import dynamic CRUD routes
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for parsing JSON and URL-encoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Define login attempts log file
const logFilePath = path.join(logsDir, 'login_attempts.log');

// Log login attempts
const logLoginAttempt = (username, status) => {
    const logEntry = `${new Date().toISOString()} - Username: ${username}, Status: ${status}\n`;
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
};

// Load users from users.json
const usersFilePath = './users.json';
let users = {};

if (fs.existsSync(usersFilePath)) {
    try {
        users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        console.log('Users loaded securely from users.json');
    } catch (err) {
        console.error('Error reading users.json:', err);
        users = {};
    }
} else {
    console.error('Error: users.json file not found. Ensure this file exists locally.');
}

// Prevent sensitive data from being sent to the client
const hideSensitiveData = (req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
};
app.use(hideSensitiveData);

// Configure session middleware using SESSION_SECRET from .env
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'fallback-secret-key', // Fallback if SESSION_SECRET is not set
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 10 * 60 * 1000, // 10 minutes of inactivity
            httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        },
    })
);

// Middleware to protect routes and enforce session validity
const requireLogin = (req, res, next) => {
    try {
        if (req.session.user) {
            // Reset session expiration on activity
            req.session._garbage = Date();
            req.session.touch();
            next();
        } else {
            // Save the intended URL and redirect to login
            req.session.redirectTo = req.originalUrl;
            res.redirect('/login');
        }
    } catch (err) {
        console.error('Error in requireLogin middleware:', err.message);
        res.status(500).send('Internal server error');
    }
};

// Rate limiter middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes.',
    },
});

// Apply rate limiting globally
app.use(apiLimiter);

// Serve the login page
app.get('/login', (req, res) => {
    const error = req.query.error || ''; // Retrieve error message if any
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Handle login requests
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check credentials
        if (users[username] && (await bcrypt.compare(password, users[username]))) {
            req.session.user = username;
            logLoginAttempt(username, 'Success');

            // Redirect to the originally intended URL or default to /sql-playground
            const redirectTo = req.session.redirectTo || '/sql-playground';
            delete req.session.redirectTo; // Clear the redirectTo session variable
            res.redirect(redirectTo);
        } else {
            logLoginAttempt(username || 'Unknown', 'Failure');
            res.redirect('/login?error=Invalid%20credentials'); // Pass error message
        }
    } catch (err) {
        console.error('Error handling login:', err.message);
        res.status(500).send('Internal server error during login.');
    }
});

// Fetch all available tables dynamically
app.get('/api/tables', requireLogin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public';
        `);
        const tables = result.rows.map(row => row.table_name);
        res.status(200).json({ tables });
    } catch (err) {
        console.error('Error fetching tables:', err.message);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

// Create a new table dynamically
app.post('/api/tables', requireLogin, async (req, res) => {
    const { tableName, columns } = req.body;

    if (!tableName || !columns || !Array.isArray(columns)) {
        return res.status(400).json({ error: 'Invalid request payload' });
    }

    const columnDefinitions = columns
        .map(col => `${col.name} ${col.type} ${col.required ? 'NOT NULL' : ''}`)
        .join(', ');

    const createTableQuery = `
        CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            ${columnDefinitions}
        );
    `;

    try {
        await pool.query(createTableQuery);
        res.status(201).json({ message: `Table "${tableName}" created successfully.` });
    } catch (err) {
        console.error('Error creating table:', err.message);
        res.status(500).json({ error: 'Failed to create table' });
    }
});

// Route SQL Playground queries dynamically
app.post('/api/sql-playground', requireLogin, async (req, res) => {
    const { query } = req.body;

    try {
        const result = await pool.query(query);
        res.status(200).json({ rows: result.rows });
    } catch (err) {
        console.error('Error executing query:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// Integrate dynamic CRUD routes
app.use('/api', requireLogin, crudRoutes);

// Swagger Documentation
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Growth DB CRUD API',
            version: '1.0.0',
            description: 'API for managing CRUD operations dynamically for Growth DB',
        },
    },
    apis: ['./routes/crud.js'], // Swagger annotations are defined in this file
};
console.log('Swagger loading files from: ./routes/crud.js');

// Generate Swagger documentation
const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Serve Swagger UI with Custom Title and Favicon
app.use(
    '/api-docs',
    requireLogin, // Ensure the user is logged in to access Swagger UI
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs, {
        customSiteTitle: 'Crio.Do | Growth DB', // Custom browser tab title
        customfavIcon: 'https://www.crio.do/favicon-32x32.png?v=9e7df616765f0413e5015879d4cc5dc9', // Custom favicon
        customCss: `
            .swagger-ui .topbar { background: #007bff; }
            .swagger-ui .topbar-wrapper a { color: white; }
        `,
    })
);

// Serve SQL Playground
app.get('/sql-playground', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sql-playground.html'));
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

// Error Handlers
app.use((req, res, next) => {
    res.status(404).send('Not Found');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));