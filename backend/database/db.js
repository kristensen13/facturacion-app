const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database/facturacion.db';

// Ensure directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS empresa (
    id        INTEGER PRIMARY KEY CHECK (id = 1),
    nombre    TEXT NOT NULL,
    nif       TEXT NOT NULL,
    direccion TEXT NOT NULL,
    ciudad    TEXT NOT NULL,
    cp        TEXT NOT NULL,
    iban      TEXT,
    email     TEXT,
    telefono  TEXT
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    nif       TEXT NOT NULL UNIQUE,
    direccion TEXT NOT NULL,
    provincia TEXT NOT NULL,
    ciudad    TEXT NOT NULL,
    cp        TEXT NOT NULL,
    email     TEXT,
    telefono  TEXT,
    iva       REAL NOT NULL DEFAULT 0.21,
    activo    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS catalogo (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto     TEXT NOT NULL UNIQUE,
    descripcion  TEXT,
    precio       REAL,
    activo       INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS facturas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    numero         INTEGER NOT NULL UNIQUE,
    fecha          TEXT NOT NULL,
    cliente_id     INTEGER NOT NULL REFERENCES clientes(id),
    estado         TEXT NOT NULL DEFAULT 'Borrador'
                   CHECK (estado IN ('Borrador','Enviada','Pagada','Anulada')),
    notas          TEXT,
    iva_pagado     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS presupuestos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    numero         INTEGER NOT NULL UNIQUE,
    fecha          TEXT NOT NULL,
    validez_hasta  TEXT,
    cliente_id     INTEGER NOT NULL REFERENCES clientes(id),
    estado         TEXT NOT NULL DEFAULT 'Borrador'
                   CHECK (estado IN ('Borrador','Enviado','Aceptado','Rechazado')),
    notas          TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TRIGGER IF NOT EXISTS presupuestos_updated
    AFTER UPDATE ON presupuestos
    BEGIN
      UPDATE presupuestos SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

  CREATE TABLE IF NOT EXISTS factura_lineas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id  INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
    concepto    TEXT NOT NULL,
    importe     REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS presupuesto_lineas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    presupuesto_id INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
    concepto       TEXT NOT NULL,
    importe        REAL NOT NULL
  );

  CREATE TRIGGER IF NOT EXISTS facturas_updated
    AFTER UPDATE ON facturas
    BEGIN
      UPDATE facturas SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
`);

// ── Migración: limpiar duplicados y crear índices UNIQUE ─────────────────────
// CREATE TABLE IF NOT EXISTS no modifica tablas existentes, así que los índices
// se crean por separado. Si hay duplicados previos, se limpian primero.
(function migrateUniqueIndexes() {
  // Helper: limpia duplicados de una tabla antes de crear el índice UNIQUE
  function cleanAndIndex(table, uniqueCol, fkTables) {
    // Comprobar si el índice ya existe
    const idx = db.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='index' AND name=?"
    ).get(`idx_${table}_${uniqueCol}`);
    if (idx) return; // ya migrado

    // Eliminar duplicados: mantener el de menor id por cada valor único
    const dupes = db.prepare(
      `SELECT id, ${uniqueCol} FROM ${table} WHERE id NOT IN (SELECT MIN(id) FROM ${table} GROUP BY ${uniqueCol})`
    ).all();

    for (const dup of dupes) {
      const original = db.prepare(
        `SELECT MIN(id) as id FROM ${table} WHERE ${uniqueCol} = ?`
      ).get(dup[uniqueCol]);
      // Reasignar foreign keys antes de borrar
      for (const fk of fkTables) {
        db.prepare(`UPDATE ${fk.table} SET ${fk.col} = ? WHERE ${fk.col} = ?`).run(original.id, dup.id);
      }
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(dup.id);
    }

    if (dupes.length > 0) {
      console.log(`🧹 ${table}: eliminados ${dupes.length} duplicados`);
    }

    // Reactivar registros que estén inactivos
    db.prepare(`UPDATE ${table} SET activo = 1 WHERE activo = 0`).run();

    // Ahora sí crear el índice
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_${uniqueCol} ON ${table}(${uniqueCol})`);
  }

  cleanAndIndex('clientes', 'nif', [
    { table: 'facturas', col: 'cliente_id' },
    { table: 'presupuestos', col: 'cliente_id' }
  ]);
  cleanAndIndex('catalogo', 'concepto', []);
})();

module.exports = db;
