const express = require('express');
const bodyParser = require('body-parser');
const crudRoutes = require('./routes/crud');

const app = express();
const PORT = 5000;

app.use(bodyParser.json());

// Routes
app.use('/api', crudRoutes);

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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
