// Seed inicial con los datos del Excel de Sebastian
const db = require('./db');

// Si ya hay datos no hacer nada (evita duplicados en cada arranque)
(function runSeed() {
  const empresaCount = db.prepare('SELECT COUNT(*) as count FROM empresa').get();
  const clienteCount = db.prepare('SELECT COUNT(*) as count FROM clientes').get();
  if (empresaCount.count > 0 || clienteCount.count > 0) {
    console.log('✅ Base de datos ya inicializada, omitiendo seed.');
    return;  // sale de la función sin hacer nada
  }

console.log('🌱 Iniciando seed de la base de datos...');

// Datos de la empresa (del Excel - hoja General)
const empresa = db.prepare(`
  INSERT OR REPLACE INTO empresa (id, nombre, nif, direccion, ciudad, cp, iban)
  VALUES (1, ?, ?, ?, ?, ?, ?)
`);
empresa.run(
  'SEBASTIAN LLORENTE BASTIDA',
  '48549946M',
  'Calle Barreras, 2',
  'Puebla de Soto (Murcia)',
  '30836',
  'ES55 0081 1016 1800 0223 1430'
);
console.log('✅ Empresa configurada');

// Clientes existentes (del Excel - hoja General)
const insertCliente = db.prepare(`
  INSERT OR IGNORE INTO clientes (nombre, nif, direccion, provincia, ciudad, cp, iva)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertCliente.run('JAVIER TORRES GARCIA',     '48543268C', 'Calle Isabel la Católica, 1',      'Murcia', 'Alcantarilla',  '30820', 0.21);
insertCliente.run('Fundación Cepaim Acción Integral con Migrantes', 'G73600553', 'Av. Fabián Escribano Moreno nº 77', 'Murcia', 'Murcia', '30570', 0.21);
insertCliente.run('Gastro Verso S.L.',         'B-21988399','Calle Simón García nº1',           'Murcia', 'Murcia',        '',      0.21);
console.log('✅ 3 clientes importados');

// Catálogo de servicios (del Excel - hoja Catálogo)
const insertCatalogo = db.prepare(`
  INSERT OR IGNORE INTO catalogo (concepto, precio) VALUES (?, ?)
`);
insertCatalogo.run('Reparación de electrodomésticos (días laborables)', null);
insertCatalogo.run('Reparación de electrodomésticos (festivos/fines de semana)', null);
insertCatalogo.run('Reparación lavadora: tubo de desagüe', null);
insertCatalogo.run('Desplazamiento, diagnóstico y mano de obra', 50.00);
insertCatalogo.run('Reparación lavadora: botonera', null);
insertCatalogo.run('Marco + base suko', 12.00);
insertCatalogo.run('Desplazamiento y mano de obra', 50.00);
console.log('✅ Catálogo importado');

// Facturas históricas (del Excel - hoja Archivo Facturas)
// Helper: convierte número de serie Excel a fecha ISO
function excelDateToISO(serial) {
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}

// Insertar facturas agrupadas por número
const insertFactura = db.prepare(`
  INSERT OR IGNORE INTO facturas (numero, fecha, cliente_id, estado)
  VALUES (?, ?, ?, 'Enviada')
`);
const insertLinea = db.prepare(`
  INSERT INTO factura_lineas (factura_id, concepto, importe) VALUES (?, ?, ?)
`);

// Datos del Excel (numero, fecha_serial, cliente_nombre, lineas[{concepto,importe}])
const historial = [
  { num: 1,  fecha: 45128, cliente: 'JAVIER TORRES GARCIA', lineas: [{ concepto: 'Reparación de electrodomésticos (días laborables)', importe: 2565 }] },
  { num: 2,  fecha: 45138, cliente: 'JAVIER TORRES GARCIA', lineas: [
      { concepto: 'Reparación de electrodomésticos (días laborables)', importe: 600 },
      { concepto: 'Reparación de electrodomésticos (días laborables)', importe: 600 },
      { concepto: 'Reparación de electrodomésticos (festivos/fines de semana)', importe: 595 }
    ]
  },
  { num: 59, fecha: 46127, cliente: 'Fundación Cepaim Acción Integral con Migrantes', lineas: [{ concepto: 'Desplazamiento, diagnóstico y mano de obra', importe: 57.85 }] },
  { num: 60, fecha: 46127, cliente: 'Fundación Cepaim Acción Integral con Migrantes', lineas: [{ concepto: 'Desplazamiento, diagnóstico y mano de obra', importe: 57.85 }] },
  { num: 61, fecha: 46128, cliente: 'Gastro Verso S.L.', lineas: [
      { concepto: 'Marco + base suko', importe: 12 },
      { concepto: 'Desplazamiento y mano de obra', importe: 50 }
    ]
  },
];

const getClienteId = db.prepare('SELECT id FROM clientes WHERE nombre = ?');

for (const f of historial) {
  const cliente = getClienteId.get(f.cliente);
  if (!cliente) { console.warn(`⚠️  Cliente no encontrado: ${f.cliente}`); continue; }
  const info = insertFactura.run(f.num, excelDateToISO(f.fecha), cliente.id);
  if (info.changes > 0) {
    for (const linea of f.lineas) insertLinea.run(info.lastInsertRowid, linea.concepto, linea.importe);
  }
}
console.log('✅ 5 facturas históricas importadas');

console.log('\n🎉 Seed completado. Base de datos lista.');
})(); // cierre de la IIFE
