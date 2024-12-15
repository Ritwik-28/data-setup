const express = require('express');
const pool = require('../db/pool');
const rateLimit = require('express-rate-limit');
const router = express.Router();

/**
 * Rate limiter for the API
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes.',
});

/**
 * Middleware: Validate table name
 */
const validateTableName = async (req, res, next) => {
    const { table } = req.params;

    try {
        const validTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        const tableNames = validTables.rows.map(row => row.table_name);

        if (!tableNames.includes(table)) {
            return res.status(400).json({ error: `Invalid table name: ${table}` });
        }
        next();
    } catch (err) {
        console.error('Error validating table name:', err.message);
        res.status(500).json({ error: 'Internal server error while validating table name.' });
    }
};

/**
 * Swagger Tags
 */
/**
 * @swagger
 * tags:
 *   - name: Dynamic Table API
 *     description: APIs for dynamically interacting with database tables
 */

/**
 * Dynamic Route: Retrieve all rows from a table with optional pagination.
 * @swagger
 * /api/{table}:
 *   get:
 *     summary: Retrieve all rows from a table with pagination.
 *     tags:
 *       - Dynamic Table API
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the table to query.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of rows per page.
 *     responses:
 *       200:
 *         description: Successful response with rows and pagination details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalItems:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: Invalid table name.
 *       500:
 *         description: Internal server error.
 */
router.get('/:table', apiLimiter, validateTableName, async (req, res) => {
    const { table } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const totalResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const totalItems = parseInt(totalResult.rows[0].count);

        const result = await pool.query(`SELECT * FROM ${table} LIMIT $1 OFFSET $2`, [limit, offset]);
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            totalItems,
            currentPage: page,
            totalPages,
            data: result.rows,
        });
    } catch (err) {
        console.error(`Error fetching data from table ${table}:`, err.message);
        res.status(500).json({ error: `Error fetching data from table ${table}: ${err.message}` });
    }
});

/**
 * Dynamic Route: Insert a new row into a table.
 * @swagger
 * /api/{table}:
 *   post:
 *     summary: Insert a new row into a table.
 *     tags:
 *       - Dynamic Table API
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the table to insert data into.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Row inserted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       400:
 *         description: Invalid request payload.
 *       500:
 *         description: Internal server error.
 */
router.post('/:table', apiLimiter, validateTableName, async (req, res) => {
    const { table } = req.params;
    const data = req.body;

    try {
        const columns = Object.keys(data).join(', ');
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        const result = await pool.query(
            `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
            values
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(`Error inserting data into table ${table}:`, err.message);
        res.status(500).json({ error: `Error inserting data into table ${table}: ${err.message}` });
    }
});

/**
 * Dynamic Route: Update a row in a table by ID.
 * @swagger
 * /api/{table}/{id}:
 *   put:
 *     summary: Update a row in a table by ID.
 *     tags:
 *       - Dynamic Table API
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the table to update data in.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the row to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Row updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       500:
 *         description: Internal server error.
 */
router.put('/:table/:id', apiLimiter, validateTableName, async (req, res) => {
    const { table, id } = req.params;
    const data = req.body;

    try {
        const updates = Object.keys(data)
            .map((key, i) => `${key} = $${i + 1}`)
            .join(', ');
        const values = Object.values(data);

        const result = await pool.query(
            `UPDATE ${table} SET ${updates} WHERE id = $${values.length + 1} RETURNING *`,
            [...values, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`Error updating data in table ${table}:`, err.message);
        res.status(500).json({ error: `Error updating data in table ${table}: ${err.message}` });
    }
});

/**
 * Dynamic Route: Delete a row from a table by ID.
 * @swagger
 * /api/{table}/{id}:
 *   delete:
 *     summary: Delete a row from a table by ID.
 *     tags:
 *       - Dynamic Table API
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the table to delete data from.
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the row to delete.
 *     responses:
 *       204:
 *         description: Row deleted successfully.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:table/:id', apiLimiter, validateTableName, async (req, res) => {
    const { table, id } = req.params;

    try {
        await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
        res.status(204).send();
    } catch (err) {
        console.error(`Error deleting data from table ${table}:`, err.message);
        res.status(500).json({ error: `Error deleting data from table ${table}: ${err.message}` });
    }
});

/**
 * Create a new table dynamically.
 * @swagger
 * /api/create-table:
 *   post:
 *     summary: Create a new table dynamically.
 *     tags:
 *       - Dynamic Table API
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tableName:
 *                 type: string
 *               columns:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     constraints:
 *                       type: string
 *     responses:
 *       201:
 *         description: Table created successfully.
 *       500:
 *         description: Internal server error.
 */
router.post('/create-table', apiLimiter, async (req, res) => {
    const { tableName, columns } = req.body;

    if (!tableName || !Array.isArray(columns)) {
        return res.status(400).json({ error: 'Invalid table structure. Ensure tableName and columns are provided.' });
    }

    try {
        const columnsDefinition = columns
            .map(col => `${col.name} ${col.type} ${col.constraints || ''}`)
            .join(', ');
        await pool.query(`CREATE TABLE ${tableName} (${columnsDefinition})`);
        res.status(201).json({ message: `Table ${tableName} created successfully.` });
    } catch (err) {
        console.error('Error creating table:', err.message);
        res.status(500).json({ error: `Error creating table: ${err.message}` });
    }
});

module.exports = router;