const express  = require('express');
const router   = express.Router();
const db       = require('../database/db');
const { generarPDF } = require('../services/pdfService');
const { generarCSV } = require('../services/exportService');

// ── Helpers ─────────────────────────────────────────────────────────────────
function enriquecerFactura(factura) {
  if (!factura) return null;
  const lineas  = db.prepare('SELECT * FROM factura_lineas WHERE factura_id = ? ORDER BY id').all(factura.id);
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(factura.cliente_id);
  const base    = lineas.reduce((s, l) => s + l.importe, 0);
  const iva     = +(base * (cliente?.iva || 0.21)).toFixed(2);
  return { ...factura, cliente, lineas, base_imponible: +base.toFixed(2), iva_importe: iva, total: +(base + iva).toFixed(2) };
}

// ── GET /api/facturas ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { estado, cliente_id, año, mes, search } = req.query;
  let sql   = `
    SELECT f.*, c.nombre AS cliente_nombre, c.nif AS cliente_nif, c.iva AS cliente_iva
    FROM facturas f
    JOIN clientes c ON c.id = f.cliente_id
    WHERE 1=1
  `;
  const params = [];

  if (estado)     { sql += ' AND f.estado = ?';                 params.push(estado); }
  if (cliente_id) { sql += ' AND f.cliente_id = ?';             params.push(cliente_id); }
  if (año)        { sql += " AND strftime('%Y', f.fecha) = ?";  params.push(String(año)); }
  if (mes)        { sql += " AND strftime('%m', f.fecha) = ?";  params.push(String(mes).padStart(2,'0')); }
  if (search)     { sql += ' AND (f.numero LIKE ? OR c.nombre LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY f.numero DESC';

  const facturas = db.prepare(sql).all(...params);

  const resultado = facturas.map(f => {
    const lineas = db.prepare('SELECT * FROM factura_lineas WHERE factura_id = ?').all(f.id);
    const base   = lineas.reduce((s, l) => s + l.importe, 0);
    const iva    = +(base * (f.cliente_iva || 0.21)).toFixed(2);
    return { ...f, lineas, base_imponible: +base.toFixed(2), iva_importe: iva, total: +(base + iva).toFixed(2) };
  });

  res.json(resultado);
});

// ── GET /api/facturas/next-numero ────────────────────────────────────────────
router.get('/next-numero', (req, res) => {
  const last = db.prepare('SELECT MAX(numero) AS max FROM facturas').get();
  res.json({ numero: (last.max || 0) + 1 });
});

// ── GET /api/facturas/stats ──────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const año = req.query.año || new Date().getFullYear();
  const rows = db.prepare(`
    SELECT
      COUNT(*) AS total_facturas,
      SUM(fl.importe) AS total_base,
      SUM(fl.importe * c.iva) AS total_iva
    FROM facturas f
    JOIN factura_lineas fl ON fl.factura_id = f.id
    JOIN clientes c ON c.id = f.cliente_id
    WHERE strftime('%Y', f.fecha) = ? AND f.estado != 'Anulada'
  `).get(String(año));

  const porEstado = db.prepare(`
    SELECT estado, COUNT(*) AS count
    FROM facturas
    WHERE strftime('%Y', fecha) = ?
    GROUP BY estado
  `).all(String(año));

  const porMes = db.prepare(`
    SELECT strftime('%m', f.fecha) AS mes, SUM(fl.importe) AS base
    FROM facturas f
    JOIN factura_lineas fl ON fl.factura_id = f.id
    WHERE strftime('%Y', f.fecha) = ? AND f.estado != 'Anulada'
    GROUP BY mes ORDER BY mes
  `).all(String(año));

  res.json({ ...rows, por_estado: porEstado, por_mes: porMes });
});

// ── GET /api/facturas/export/csv ─────────────────────────────────────────────
router.get('/export/csv', (req, res) => {
  const { año } = req.query;
  let sql = `
    SELECT f.*, c.nombre AS cliente_nombre, c.nif AS cliente_nif, c.iva AS cliente_iva
    FROM facturas f JOIN clientes c ON c.id = f.cliente_id
    WHERE f.estado != 'Anulada'
  `;
  const params = [];
  if (año) { sql += " AND strftime('%Y', f.fecha) = ?"; params.push(String(año)); }
  sql += ' ORDER BY f.numero';

  const facturas = db.prepare(sql).all(...params).map(f => ({
    ...f,
    lineas: db.prepare('SELECT * FROM factura_lineas WHERE factura_id = ?').all(f.id)
  }));

  const csv = generarCSV(facturas);
  const filename = año ? `facturas_${año}.csv` : 'facturas.csv';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM para Excel
});

// ── GET /api/facturas/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(enriquecerFactura(factura));
});

// ── GET /api/facturas/:id/pdf ────────────────────────────────────────────────
router.get('/:id/pdf', (req, res) => {
  const factura = db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id);
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

  const enriquecida = enriquecerFactura(factura);
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();

  generarPDF({ empresa, cliente: enriquecida.cliente, factura: enriquecida, lineas: enriquecida.lineas }, res);
});

// ── POST /api/facturas ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { cliente_id, fecha, lineas, estado, notas } = req.body;

  if (!cliente_id || !fecha || !lineas?.length) {
    return res.status(400).json({ error: 'cliente_id, fecha y lineas son obligatorios' });
  }

  // Siguiente número automático
  const last   = db.prepare('SELECT MAX(numero) AS max FROM facturas').get();
  const numero = (last.max || 0) + 1;

  const crearFactura = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO facturas (numero, fecha, cliente_id, estado, notas)
      VALUES (?, ?, ?, ?, ?)
    `).run(numero, fecha, cliente_id, estado || 'Borrador', notas || null);

    const facturaId = info.lastInsertRowid;

    for (const linea of lineas) {
      db.prepare('INSERT INTO factura_lineas (factura_id, concepto, importe) VALUES (?, ?, ?)')
        .run(facturaId, linea.concepto, linea.importe);
    }

    return db.prepare('SELECT * FROM facturas WHERE id = ?').get(facturaId);
  });

  const nueva = crearFactura();
  res.status(201).json(enriquecerFactura(nueva));
});

// ── PUT /api/facturas/:id ────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { cliente_id, fecha, lineas, estado, notas, iva_pagado } = req.body;
  const existe = db.prepare('SELECT id FROM facturas WHERE id = ?').get(req.params.id);
  if (!existe) return res.status(404).json({ error: 'Factura no encontrada' });

  const actualizar = db.transaction(() => {
    db.prepare(`
      UPDATE facturas SET cliente_id=?, fecha=?, estado=?, notas=?, iva_pagado=? WHERE id=?
    `).run(cliente_id, fecha, estado, notas || null, iva_pagado ? 1 : 0, req.params.id);

    if (lineas) {
      db.prepare('DELETE FROM factura_lineas WHERE factura_id = ?').run(req.params.id);
      for (const linea of lineas) {
        db.prepare('INSERT INTO factura_lineas (factura_id, concepto, importe) VALUES (?, ?, ?)')
          .run(req.params.id, linea.concepto, linea.importe);
      }
    }
  });

  actualizar();
  res.json(enriquecerFactura(db.prepare('SELECT * FROM facturas WHERE id = ?').get(req.params.id)));
});

// ── DELETE /api/facturas/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const info = db.prepare("UPDATE facturas SET estado = 'Anulada' WHERE id = ?").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json({ ok: true });
});

module.exports = router;
