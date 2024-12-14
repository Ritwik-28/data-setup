const express = require('express');
const pool = require('../db/pool');
const { check, validationResult } = require('express-validator');
const router = express.Router();

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
 *                   description: Total number of items in the database.
 *                 currentPage:
 *                   type: integer
 *                   description: Current page number.
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The item ID.
 *                       name:
 *                         type: string
 *                         description: The item name.
 *                       value:
 *                         type: string
 *                         description: The item value.
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
 *                 example: "Updated Item"
 *               value:
 *                 type: string
 *                 example: "67890"
 *     responses:
 *       200:
 *         description: The updated item.
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
 *                   example: "Updated Item"
 *                 value:
 *                   type: string
 *                   example: "67890"
 */
router.put(
    '/items/:id',
    [
        check('id').isInt().withMessage('ID must be an integer'),
        check('name').optional().isString().withMessage('Name must be a string'),
        check('value').optional().isString().withMessage('Value must be a string'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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
            res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
        }
    }
);

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
 *         description: No content (item deleted successfully).
 */
router.delete(
    '/items/:id',
    [check('id').isInt().withMessage('ID must be an integer')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;

        try {
            await pool.query('DELETE FROM items WHERE id = $1', [id]);
            res.status(204).send();
        } catch (err) {
            console.error('Error deleting item:', err.message);
            res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
        }
    }
);

module.exports = router;