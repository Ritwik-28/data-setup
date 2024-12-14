const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// CREATE
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

// READ
router.get('/items', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
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

// DELETE
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
