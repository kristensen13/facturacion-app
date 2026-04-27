const PDFDocument = require('pdfkit');

/**
 * Genera el PDF de una factura y lo escribe en el stream de respuesta.
 * @param {object} data  - { empresa, cliente, factura, lineas }
 * @param {object} res   - Express response object (pipe destino)
 */
function generarPDF(data, res) {
  const { empresa, cliente, factura, lineas } = data;

  const doc = new PDFDocument({ margins: { top: 50, left: 50, right: 50, bottom: 30 }, size: 'A4' });

  // ─── Headers HTTP ───────────────────────────────────────────────
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="factura_${factura.numero}.pdf"`);
  doc.pipe(res);

  // ─── Colores y fuentes ──────────────────────────────────────────
  const AZUL   = '#1a3a5c';
  const GRIS   = '#6b7280';
  const LINEA  = '#e5e7eb';
  const NEGRO  = '#111827';
  const VERDE  = '#059669';

  // ─── Cabecera ───────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 120).fill(AZUL);

  doc.fillColor('white')
     .font('Helvetica-Bold')
     .fontSize(26)
     .text('FACTURA', 50, 30);

  doc.font('Helvetica')
     .fontSize(11)
     .text(`Nº ${String(factura.numero).padStart(4,'0')}`, 50, 62)
     .text(`Fecha: ${formatFecha(factura.fecha)}`, 50, 78);

  // Datos emisor (derecha)
  doc.font('Helvetica-Bold')
     .fontSize(12)
     .text(empresa.nombre, 300, 25, { align: 'right', width: 245 });
  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#cbd5e1')
     .text(`NIF: ${empresa.nif}`, 300, 42, { align: 'right', width: 245 })
     .text(empresa.direccion, 300, 54, { align: 'right', width: 245 })
     .text(`${empresa.ciudad}, ${empresa.cp}`, 300, 66, { align: 'right', width: 245 });

  if (empresa.iban) {
    doc.text(`IBAN: ${empresa.iban}`, 300, 78, { align: 'right', width: 245 });
  }

  // ─── Datos cliente ──────────────────────────────────────────────
  doc.fillColor(NEGRO).font('Helvetica-Bold').fontSize(9)
     .text('CLIENTE', 50, 140);

  doc.moveTo(50, 150).lineTo(545, 150).strokeColor(LINEA).lineWidth(1).stroke();

  doc.font('Helvetica-Bold').fontSize(11).fillColor(NEGRO)
     .text(cliente.nombre, 50, 158);
  doc.font('Helvetica').fontSize(10).fillColor(GRIS)
     .text(`NIF/CIF: ${cliente.nif}`, 50, 174)
     .text(cliente.direccion, 50, 188)
     .text(`${cliente.ciudad}, ${cliente.provincia} ${cliente.cp}`, 50, 202);

  // Estado factura (derecha)
  const estadoColor = factura.estado === 'Pagada' ? VERDE : factura.estado === 'Enviada' ? '#2563eb' : GRIS;
  doc.roundedRect(380, 155, 165, 28, 4).fill(estadoColor);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('white')
     .text(factura.estado.toUpperCase(), 380, 163, { align: 'center', width: 165 });

  // ─── Tabla de líneas ────────────────────────────────────────────
  const tableTop = 245;
  const colConcepto = 50;
  const colImporte  = 445;
  const rowH = 30;

  // Cabecera tabla
  doc.rect(50, tableTop, 495, 28).fill(AZUL);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
     .text('Concepto', colConcepto + 8, tableTop + 8)
     .text('Importe (€)', colImporte, tableTop + 8, { align: 'right', width: 95 });

  // Líneas
  let y = tableTop + 28;
  lineas.forEach((linea, i) => {
    const bg = i % 2 === 0 ? '#f9fafb' : 'white';
    doc.rect(50, y, 495, rowH).fill(bg);
    doc.font('Helvetica').fontSize(10).fillColor(NEGRO)
       .text(linea.concepto, colConcepto + 8, y + 9, { width: 380 })
       .text(formatEuro(linea.importe), colImporte, y + 9, { align: 'right', width: 95 });
    y += rowH;
  });

  // ─── Totales ────────────────────────────────────────────────────
  const baseImponible = lineas.reduce((s, l) => s + l.importe, 0);
  const ivaPorc       = cliente.iva || 0.21;
  const cuotaIVA      = baseImponible * ivaPorc;
  const total         = baseImponible + cuotaIVA;

  const totalesX = 350;
  y += 12;

  const fila = (label, valor, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(10)
       .fillColor(bold ? NEGRO : GRIS)
       .text(label, totalesX, y)
       .text(formatEuro(valor), totalesX + 60, y, { align: 'right', width: 135 });
    y += 18;
  };

  doc.moveTo(totalesX, y - 6).lineTo(545, y - 6).strokeColor(LINEA).lineWidth(0.5).stroke();
  fila('Base imponible:', baseImponible);
  fila(`IVA (${Math.round(ivaPorc * 100)}%):`, cuotaIVA);
  doc.moveTo(totalesX, y).lineTo(545, y).strokeColor(AZUL).lineWidth(1).stroke();
  y += 8;
  fila('TOTAL:', total, true);

  // ─── Pie de página ──────────────────────────────────────────────
  const footerY = doc.page.height - 80;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(LINEA).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(GRIS)
     .text(
       `Conforme a lo establecido en el RGPD y la LOPDGDD, la información facilitada será tratada por ${empresa.nombre} con el fin de prestar y facturar los servicios solicitados. Los datos no se cederán a terceros salvo lo que exija la ley.`,
       50, footerY + 10, { width: 495, align: 'center' }
     );

  doc.end();
}

// ─── Helpers ────────────────────────────────────────────────────────
function formatFecha(isoString) {
  if (!isoString) return '';
  const [y, m, d] = isoString.split('-');
  return `${d}/${m}/${y}`;
}

function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

/**
 * Genera el PDF de un presupuesto y lo escribe en el stream de respuesta.
 * @param {object} data  - { empresa, cliente, presupuesto, lineas }
 * @param {object} res   - Express response object (pipe destino)
 */
function generarPresupuestoPDF(data, res) {
  const { empresa, cliente, presupuesto, lineas } = data;

  const doc = new PDFDocument({ margins: { top: 50, left: 50, right: 50, bottom: 30 }, size: 'A4' });

  // ─── Headers HTTP ───────────────────────────────────────────────
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="presupuesto_${presupuesto.numero}.pdf"`);
  doc.pipe(res);

  // ─── Colores y fuentes ──────────────────────────────────────────
  const AZUL   = '#1a3a5c';
  const GRIS   = '#6b7280';
  const LINEA  = '#e5e7eb';
  const NEGRO  = '#111827';
  const VERDE  = '#059669';
  const NARANJA = '#ea580c';

  // ─── Cabecera ───────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 120).fill(AZUL);

  doc.fillColor('white')
     .font('Helvetica-Bold')
     .fontSize(26)
     .text('PRESUPUESTO', 50, 30);

  doc.font('Helvetica')
     .fontSize(11)
     .text(`Nº ${String(presupuesto.numero).padStart(4,'0')}`, 50, 62)
     .text(`Fecha: ${formatFecha(presupuesto.fecha)}`, 50, 78);

  if (presupuesto.validez_hasta) {
    doc.text(`Válido hasta: ${formatFecha(presupuesto.validez_hasta)}`, 50, 94);
  }

  // Datos emisor (derecha)
  doc.font('Helvetica-Bold')
     .fontSize(12)
     .text(empresa.nombre, 300, 25, { align: 'right', width: 245 });
  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#cbd5e1')
     .text(`NIF: ${empresa.nif}`, 300, 42, { align: 'right', width: 245 })
     .text(empresa.direccion, 300, 54, { align: 'right', width: 245 })
     .text(`${empresa.ciudad}, ${empresa.cp}`, 300, 66, { align: 'right', width: 245 });

  if (empresa.iban) {
    doc.text(`IBAN: ${empresa.iban}`, 300, 78, { align: 'right', width: 245 });
  }

  // ─── Datos cliente ──────────────────────────────────────────────
  doc.fillColor(NEGRO).font('Helvetica-Bold').fontSize(9)
     .text('CLIENTE', 50, 140);

  doc.moveTo(50, 150).lineTo(545, 150).strokeColor(LINEA).lineWidth(1).stroke();

  doc.font('Helvetica-Bold').fontSize(11).fillColor(NEGRO)
     .text(cliente.nombre, 50, 158);
  doc.font('Helvetica').fontSize(10).fillColor(GRIS)
     .text(`NIF/CIF: ${cliente.nif}`, 50, 174)
     .text(cliente.direccion, 50, 188)
     .text(`${cliente.ciudad}, ${cliente.provincia} ${cliente.cp}`, 50, 202);

  // Estado presupuesto (derecha)
  const estadoColor = presupuesto.estado === 'Aceptado' ? VERDE : presupuesto.estado === 'Rechazado' ? '#dc2626' : presupuesto.estado === 'Enviado' ? '#2563eb' : GRIS;
  doc.roundedRect(380, 155, 165, 28, 4).fill(estadoColor);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('white')
     .text(presupuesto.estado.toUpperCase(), 380, 163, { align: 'center', width: 165 });

  // ─── Tabla de líneas ────────────────────────────────────────────
  const tableTop = 245;
  const colConcepto = 50;
  const colImporte  = 445;
  const rowH = 30;

  // Cabecera tabla
  doc.rect(50, tableTop, 495, 28).fill(AZUL);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
     .text('Concepto', colConcepto + 8, tableTop + 8)
     .text('Importe (€)', colImporte, tableTop + 8, { align: 'right', width: 95 });

  // Líneas
  let y = tableTop + 28;
  lineas.forEach((linea, i) => {
    const bg = i % 2 === 0 ? '#f9fafb' : 'white';
    doc.rect(50, y, 495, rowH).fill(bg);
    doc.font('Helvetica').fontSize(10).fillColor(NEGRO)
       .text(linea.concepto, colConcepto + 8, y + 9, { width: 380 })
       .text(formatEuro(linea.importe), colImporte, y + 9, { align: 'right', width: 95 });
    y += rowH;
  });

  // ─── Totales ────────────────────────────────────────────────────
  const baseImponible = lineas.reduce((s, l) => s + l.importe, 0);
  const ivaPorc       = cliente.iva || 0.21;
  const cuotaIVA      = baseImponible * ivaPorc;
  const total         = baseImponible + cuotaIVA;

  const totalesX = 350;
  y += 12;

  const fila = (label, valor, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(10)
       .fillColor(bold ? NEGRO : GRIS)
       .text(label, totalesX, y)
       .text(formatEuro(valor), totalesX + 60, y, { align: 'right', width: 135 });
    y += 18;
  };

  doc.moveTo(totalesX, y - 6).lineTo(545, y - 6).strokeColor(LINEA).lineWidth(0.5).stroke();
  fila('Base imponible:', baseImponible);
  fila(`IVA (${Math.round(ivaPorc * 100)}%):`, cuotaIVA);
  doc.moveTo(totalesX, y).lineTo(545, y).strokeColor(AZUL).lineWidth(1).stroke();
  y += 8;
  fila('TOTAL:', total, true);

  // ─── Pie de página ──────────────────────────────────────────────
  const footerY = doc.page.height - 80;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(LINEA).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(GRIS)
     .text(
       `Este presupuesto tiene carácter informativo y no constituye una factura. Validez según fecha indicada. Conforme a lo establecido en el RGPD y la LOPDGDD, la información facilitada será tratada por ${empresa.nombre} con el fin de prestar y facturar los servicios solicitados.`,
       50, footerY + 10, { width: 495, align: 'center' }
     );

  doc.end();
}

module.exports = { generarPDF, generarPresupuestoPDF };
