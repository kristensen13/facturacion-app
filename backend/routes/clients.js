const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// GET /api/clientes
router.get('/', (req, res) => {
  const clientes = db.prepare(`
    SELECT * FROM clientes
    WHERE activo = 1
    ORDER BY nombre ASC
  `).all();
  res.json(clientes);
});

// GET /api/clientes/:id
router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(cliente);
});

// POST /api/clientes
router.post('/', (req, res) => {
  const { nombre, nif, direccion, provincia, ciudad, cp, email, telefono, iva } = req.body;

  if (!nombre || !nif) return res.status(400).json({ error: 'nombre y nif son obligatorios' });

  const info = db.prepare(`
    INSERT INTO clientes (nombre, nif, direccion, provincia, ciudad, cp, email, telefono, iva)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, nif, direccion || '', provincia || '', ciudad || '', cp || '', email || null, telefono || null, iva ?? 0.21);

  const nuevo = db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(nuevo);
});

// PUT /api/clientes/:id
router.put('/:id', (req, res) => {
  const { nombre, nif, direccion, provincia, ciudad, cp, email, telefono, iva } = req.body;
  const cliente = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

  db.prepare(`
    UPDATE clientes
    SET nombre=?, nif=?, direccion=?, provincia=?, ciudad=?, cp=?, email=?, telefono=?, iva=?
    WHERE id=?
  `).run(nombre, nif, direccion, provincia, ciudad, cp, email || null, telefono || null, iva ?? 0.21, req.params.id);

  res.json(db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id));
});

// DELETE /api/clientes/:id  (soft delete)
router.delete('/:id', (req, res) => {
  const info = db.prepare('UPDATE clientes SET activo = 0 WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ ok: true });
});

module.exports = router;
