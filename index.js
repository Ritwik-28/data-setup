const express = require('express');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const crudRoutes = require('./routes/crud');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = 5000;

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
const logLoginAttempt = (username, password, status) => {
    const logEntry = `${new Date().toISOString()} - Username: ${username}, Password: ${password}, Status: ${status}\n`;
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
};

// Load users from users.json
const usersFilePath = './users.json';
let users = {};

if (fs.existsSync(usersFilePath)) {
    users = JSON.parse(fs.readFileSync(usersFilePath));
    console.log('Users loaded from users.json (securely in backend)');
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
        cookie: { maxAge: 10 * 60 * 1000 }, // 10 minutes of inactivity
    })
);

// Middleware to protect Swagger UI and enforce session validity
const requireLogin = (req, res, next) => {
    if (req.session.user) {
        // Reset session expiration on activity
        req.session._garbage = Date();
        req.session.touch();
        next();
    } else {
        res.redirect('/login'); // Redirect to custom login page
    }
};

// Serve the login page
app.get('/login', (req, res) => {
    const error = req.query.error || ''; // Retrieve error message if any
    res.sendFile(path.join(__dirname, 'public', 'login.html'), { error });
});

// Handle login requests
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check credentials
    if (users[username] && users[username] === password) {
        req.session.user = username;
        logLoginAttempt(username, password, 'Success');
        res.redirect('/api-docs');
    } else {
        logLoginAttempt(username || 'Unknown', password || 'Unknown', 'Failure');
        res.redirect('/login?error=Invalid%20credentials'); // Pass error message
    }
});

// Swagger Documentation
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Growth DB CRUD API',
            version: '1.0.0',
            description: 'API for managing CRUD operations in Growth DB',
        },
    },
    apis: ['./routes/crud.js'],
};
console.log('Swagger loading files from: ./routes/crud.js');

// Generate Swagger documentation
const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Serve Swagger UI with Custom Title and Favicon
app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs, {
        customSiteTitle: "Crio.Do | Growth DB", // Custom browser tab title
        customfavIcon: "https://www.crio.do/favicon-32x32.png?v=9e7df616765f0413e5015879d4cc5dc9", // Custom favicon
    })
);

// Routes
app.use('/api', crudRoutes);

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));