/**
 * Genera el CSV de exportación para software contable / Hacienda.
 * Replica el formato de la hoja "Importación" del Excel original.
 */
function generarCSV(facturas) {
  const cabecera = ['Num_fac', 'Fecha_Fac', 'CIF', 'Nombre_Cli', 'Imp_base', 'Porcen_Iva', 'Cuota_Iva'];
  const filas = [];

  for (const f of facturas) {
    const base   = f.lineas.reduce((s, l) => s + l.importe, 0);
    const ivaP   = Math.round((f.cliente_iva || 0.21) * 100);
    const cuota  = +(base * (f.cliente_iva || 0.21)).toFixed(2);

    filas.push([
      f.numero,
      f.fecha,
      f.cliente_nif,
      f.cliente_nombre,
      base.toFixed(2),
      ivaP,
      cuota,
    ]);
  }

  const lineas = [cabecera, ...filas].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  );

  return lineas.join('\r\n');
}

module.exports = { generarCSV };
