require('dotenv').config();
const { Pool } = require('pg');

// Use environment variables for sensitive data
const pool = new Pool({
    user: process.env.DB_USER,        // Postgres username from .env
    host: process.env.DB_HOST,        // Hostname or IP address
    database: process.env.DB_NAME,    // Database name
    password: process.env.DB_PASSWORD,// Postgres password from .env
    port: process.env.DB_PORT || 5432 // Default to port 5432 if not defined
});

module.exports = pool;
