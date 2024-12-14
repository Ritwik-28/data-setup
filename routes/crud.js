const express = require('express');
const pool = require('../db/pool');
const { check, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const json2csv = require('json2csv').parse; // For CSV download

/**
 * Rate limiter for the SQL Playground
 */
const sqlPlaygroundLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes.',
});

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create a new item
 *     description: Add a new item to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the item.
 *                 example: "Example Item"
 *               value:
 *                 type: string
 *                 description: The value of the item.
 *                 example: "12345"
 *     responses:
 *       201:
 *         description: The created item.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: "Example Item"
 *                 value:
 *                   type: string
 *                   example: "12345"
 */
router.post(
    '/items',
    [
        check('name').isString().notEmpty().withMessage('Name is required and must be a string'),
        check('value').isString().notEmpty().withMessage('Value is required and must be a string'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, value } = req.body;
        try {
            const result = await pool.query(
                'INSERT INTO items (name, value) VALUES ($1, $2) RETURNING *',
                [name, value]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error creating item:', err.message);
            res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
        }
    }
);

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Retrieve all items with pagination
 *     description: Get a list of all items from the database with pagination support.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number (default is 1).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of items per page (default is 10).
 *     responses:
 *       200:
 *         description: A list of items with pagination.
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
 */
router.get('/items', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const totalResult = await pool.query('SELECT COUNT(*) FROM items');
        const totalItems = parseInt(totalResult.rows[0].count);

        const result = await pool.query('SELECT * FROM items LIMIT $1 OFFSET $2', [limit, offset]);
        const totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            totalItems,
            currentPage: page,
            totalPages,
            data: result.rows,
        });
    } catch (err) {
        console.error('Error retrieving items:', err.message);
        res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
});

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Update an item
 *     description: Update the details of an existing item.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the item to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: The updated item.
 */
router.put('/items/:id', async (req, res) => {
    const { id } = req.params;
    const { name, value } = req.body;

    try {
        const result = await pool.query(
            'UPDATE items SET name = $1, value = $2 WHERE id = $3 RETURNING *',
            [name, value, id]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating item:', err.message);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
});

/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Delete an item
 *     description: Remove an item from the database.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the item to delete.
 *     responses:
 *       204:
 *         description: Item deleted successfully.
 */
router.delete('/items/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM items WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting item:', err.message);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
});

/**
 * @swagger
 * /api/sql-playground:
 *   post:
 *     summary: Execute custom SQL query
 *     description: Execute any valid SQL query.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: Query executed successfully.
 */
router.post('/sql-playground', sqlPlaygroundLimiter, async (req, res) => {
    const { query } = req.body;

    try {
        const result = await pool.query(query);

        // Handle CSV download
        if (req.query.download === 'csv') {
            const csv = json2csv(result.rows);
            res.header('Content-Type', 'text/csv');
            res.attachment('query_results.csv');
            return res.send(csv);
        }

        res.status(200).json({ rows: result.rows });
    } catch (err) {
        console.error('SQL Error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;