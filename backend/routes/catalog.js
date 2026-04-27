const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// ── Catálogo ─────────────────────────────────────────────────────────────────

// GET /api/catalogo
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM catalogo WHERE activo = 1 ORDER BY concepto').all());
});

// POST /api/catalogo
router.post('/', (req, res) => {
  const { concepto, descripcion, precio } = req.body;
  if (!concepto) return res.status(400).json({ error: 'concepto es obligatorio' });
  const info = db.prepare('INSERT INTO catalogo (concepto, descripcion, precio) VALUES (?, ?, ?)').run(concepto, descripcion || null, precio ?? null);
  res.status(201).json(db.prepare('SELECT * FROM catalogo WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/catalogo/:id
router.put('/:id', (req, res) => {
  const { concepto, descripcion, precio } = req.body;
  db.prepare('UPDATE catalogo SET concepto=?, descripcion=?, precio=? WHERE id=?').run(concepto, descripcion || null, precio ?? null, req.params.id);
  res.json(db.prepare('SELECT * FROM catalogo WHERE id = ?').get(req.params.id));
});

// DELETE /api/catalogo/:id (soft)
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE catalogo SET activo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
