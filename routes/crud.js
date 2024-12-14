const express = require('express');
const pool = require('../db/pool');
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
 *               value:
 *                 type: string
 *                 description: The value of the item.
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
 *                 name:
 *                   type: string
 *                 value:
 *                   type: string
 */
router.post('/items', async (req, res) => {
    const { name, value } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO items (name, value) VALUES ($1, $2) RETURNING *',
            [name, value]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Retrieve all items
 *     description: Get a list of all items from the database.
 *     responses:
 *       200:
 *         description: A list of items.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: The item ID.
 *                   name:
 *                     type: string
 *                     description: The item name.
 *                   value:
 *                     type: string
 *                     description: The item value.
 */
router.get('/items', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 value:
 *                   type: string
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
        res.status(500).json({ error: err.message });
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
 *         description: No content (item deleted successfully).
 */
router.delete('/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM items WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

