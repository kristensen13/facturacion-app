const express  = require('express');
const router   = express.Router();
const db       = require('../database/db');
const { generarPresupuestoPDF } = require('../services/pdfService');

// ── Helpers ─────────────────────────────────────────────────────────────────
function enriquecerPresupuesto(presupuesto) {
  if (!presupuesto) return null;
  const lineas  = db.prepare('SELECT * FROM presupuesto_lineas WHERE presupuesto_id = ? ORDER BY id').all(presupuesto.id);
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(presupuesto.cliente_id);
  const base    = lineas.reduce((s, l) => s + l.importe, 0);
  const iva     = +(base * (cliente?.iva || 0.21)).toFixed(2);
  return { ...presupuesto, cliente, lineas, base_imponible: +base.toFixed(2), iva_importe: iva, total: +(base + iva).toFixed(2) };
}

// ── GET /api/presupuestos ────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { estado, cliente_id, año, search } = req.query;
  let sql   = `
    SELECT p.*, c.nombre AS cliente_nombre, c.nif AS cliente_nif, c.iva AS cliente_iva
    FROM presupuestos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE 1=1
  `;
  const params = [];

  if (estado)     { sql += ' AND p.estado = ?';                 params.push(estado); }
  if (cliente_id) { sql += ' AND p.cliente_id = ?';             params.push(cliente_id); }
  if (año)        { sql += " AND strftime('%Y', p.fecha) = ?";  params.push(String(año)); }
  if (search)     { sql += ' AND (p.numero LIKE ? OR c.nombre LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY p.numero DESC';

  const presupuestos = db.prepare(sql).all(...params);

  const resultado = presupuestos.map(p => {
    const lineas = db.prepare('SELECT * FROM presupuesto_lineas WHERE presupuesto_id = ?').all(p.id);
    const base   = lineas.reduce((s, l) => s + l.importe, 0);
    const iva    = +(base * (p.cliente_iva || 0.21)).toFixed(2);
    return { ...p, lineas, base_imponible: +base.toFixed(2), iva_importe: iva, total: +(base + iva).toFixed(2) };
  });

  res.json(resultado);
});

// ── GET /api/presupuestos/next-numero ────────────────────────────────────────
router.get('/next-numero', (req, res) => {
  const last = db.prepare('SELECT MAX(numero) AS max FROM presupuestos').get();
  res.json({ numero: (last.max || 0) + 1 });
});

// ── GET /api/presupuestos/:id ────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const presupuesto = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  res.json(enriquecerPresupuesto(presupuesto));
});

// ── GET /api/presupuestos/:id/pdf ────────────────────────────────────────────
router.get('/:id/pdf', (req, res) => {
  const presupuesto = db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!presupuesto) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const enriquecido = enriquecerPresupuesto(presupuesto);
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();

  generarPresupuestoPDF({ empresa, cliente: enriquecido.cliente, presupuesto: enriquecido, lineas: enriquecido.lineas }, res);
});

// ── POST /api/presupuestos ───────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { cliente_id, fecha, validez_hasta, lineas, estado, notas } = req.body;

  if (!cliente_id || !fecha || !lineas?.length) {
    return res.status(400).json({ error: 'cliente_id, fecha y lineas son obligatorios' });
  }

  // Siguiente número automático
  const last   = db.prepare('SELECT MAX(numero) AS max FROM presupuestos').get();
  const numero = (last.max || 0) + 1;

  const crearPresupuesto = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO presupuestos (numero, fecha, validez_hasta, cliente_id, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(numero, fecha, validez_hasta || null, cliente_id, estado || 'Borrador', notas || null);

    const presupuestoId = info.lastInsertRowid;

    for (const linea of lineas) {
      db.prepare('INSERT INTO presupuesto_lineas (presupuesto_id, concepto, importe) VALUES (?, ?, ?)')
        .run(presupuestoId, linea.concepto, linea.importe);
    }

    return db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(presupuestoId);
  });

  const nuevo = crearPresupuesto();
  res.status(201).json(enriquecerPresupuesto(nuevo));
});

// ── PUT /api/presupuestos/:id ────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { cliente_id, fecha, validez_hasta, lineas, estado, notas } = req.body;
  const existe = db.prepare('SELECT id FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const actualizar = db.transaction(() => {
    db.prepare(`
      UPDATE presupuestos SET cliente_id=?, fecha=?, validez_hasta=?, estado=?, notas=? WHERE id=?
    `).run(cliente_id, fecha, validez_hasta || null, estado, notas || null, req.params.id);

    if (lineas) {
      db.prepare('DELETE FROM presupuesto_lineas WHERE presupuesto_id = ?').run(req.params.id);
      for (const linea of lineas) {
        db.prepare('INSERT INTO presupuesto_lineas (presupuesto_id, concepto, importe) VALUES (?, ?, ?)')
          .run(req.params.id, linea.concepto, linea.importe);
      }
    }
  });

  actualizar();
  res.json(enriquecerPresupuesto(db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id)));
});

// ── DELETE /api/presupuestos/:id ─────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM presupuestos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  res.json({ ok: true });
});

// ── PUT /api/presupuestos/:id/estado ─────────────────────────────────────────
router.put('/:id/estado', (req, res) => {
  const { estado } = req.body;
  const existe = db.prepare('SELECT id FROM presupuestos WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  db.prepare('UPDATE presupuestos SET estado = ? WHERE id = ?').run(estado, req.params.id);
  res.json(enriquecerPresupuesto(db.prepare('SELECT * FROM presupuestos WHERE id = ?').get(req.params.id)));
});

module.exports = router;
