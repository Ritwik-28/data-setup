const express = require('express');
const bodyParser = require('body-parser');
const crudRoutes = require('./routes/crud');
const expressBasicAuth = require('express-basic-auth');
const fs = require('fs');

const app = express();
const PORT = 5000;

app.use(bodyParser.json());

// Routes
app.use('/api', crudRoutes);

// Load users from users.json
const usersFilePath = './users.json';
let users = {};

if (fs.existsSync(usersFilePath)) {
    // Read and parse users.json for credentials
    users = JSON.parse(fs.readFileSync(usersFilePath));
    console.log('Users loaded from users.json (securely in backend)');
} else {
    console.error('Error: users.json file not found. Ensure this file exists locally.');
}

// Prevent sensitive data from being sent to the client
const hideSensitiveData = (req, res, next) => {
    res.removeHeader('X-Powered-By'); // Hide server framework info
    next();
};
app.use(hideSensitiveData);

// Swagger Documentation
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Postgres CRUD API',
            version: '1.0.0',
            description: 'API for managing CRUD operations in Postgres',
        },
    },
    apis: ['./routes/crud.js'], // Swagger annotations are in this file
};
console.log('Swagger loading files from: ./routes/crud.js');

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Protect Swagger UI with Basic Authentication
app.use(
    '/api-docs',
    expressBasicAuth({
        users: users, // Load users from JSON file
        challenge: true, // Show login dialog in browser
        unauthorizedResponse: (req) => {
            return 'Unauthorized: You need valid credentials to access Swagger UI.';
        },
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs)
);

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
