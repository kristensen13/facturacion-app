require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const db      = require('./database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// ── Empresa (config) ─────────────────────────────────────────────────────────
app.get('/api/empresa', (req, res) => {
  const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
  res.json(empresa || {});
});

app.put('/api/empresa', (req, res) => {
  const { nombre, nif, direccion, ciudad, cp, iban, email, telefono } = req.body;
  db.prepare(`
    INSERT OR REPLACE INTO empresa (id, nombre, nif, direccion, ciudad, cp, iban, email, telefono)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, nif, direccion, ciudad, cp, iban || null, email || null, telefono || null);
  res.json(db.prepare('SELECT * FROM empresa WHERE id = 1').get());
});

// ── Rutas principales ─────────────────────────────────────────────────────────
app.use('/api/clientes',  require('./routes/clients'));
app.use('/api/facturas',  require('./routes/invoices'));
app.use('/api/catalogo',  require('./routes/catalog'));
app.use('/api/presupuestos', require('./routes/quotes'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Facturación API corriendo en http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
