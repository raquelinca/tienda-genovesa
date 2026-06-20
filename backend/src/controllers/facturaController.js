const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { construirFacturaXML, EMISOR } = require('../utils/sriFactura');

// Carpeta donde se guardan los XML generados (gitignore recomendado)
const CARPETA_XML = path.join(__dirname, '..', '..', 'facturas');
if (!fs.existsSync(CARPETA_XML)) fs.mkdirSync(CARPETA_XML, { recursive: true });

// Trae la venta y sus detalles desde la BD
async function obtenerVenta(venta_id) {
  const [ventas] = await db.query(`
    SELECT v.*,
      COALESCE(v.cliente_nombre, 'CONSUMIDOR FINAL') AS cliente_nombre,
      COALESCE(v.cliente_cedula, '9999999999999')    AS cliente_cedula
    FROM ventas v WHERE v.id = ?
  `, [venta_id]);

  if (ventas.length === 0) return null;

  const [detalles] = await db.query(`
    SELECT dv.*, p.nombre AS producto_nombre
    FROM detalle_venta dv
    JOIN productos p ON dv.producto_id = p.id
    WHERE dv.venta_id = ?
  `, [venta_id]);

  return { venta: ventas[0], detalles };
}

// ---------------------------------------------------------------------
//  GET /api/factura/xml/:venta_id
//  Genera el XML conforme al SRI, lo guarda en /facturas y lo descarga.
//  Este es el archivo que luego FIRMAS con tu certificado .p12.
// ---------------------------------------------------------------------
const generarFacturaXML = async (req, res) => {
  try {
    const data = await obtenerVenta(req.params.venta_id);
    if (!data) return res.status(404).json({ ok: false, mensaje: 'Venta no encontrada' });

    const { xml, claveAcceso, nombreArchivo } = construirFacturaXML(data.venta, data.detalles);

    // Guardar en disco (queda disponible para el paso de firma)
    const ruta = path.join(CARPETA_XML, nombreArchivo);
    fs.writeFileSync(ruta, xml, 'utf8');

    // Guardar la clave de acceso en la venta (útil para consultar autorización)
    await db.query(`UPDATE ventas SET clave_acceso = ? WHERE id = ?`,
      [claveAcceso, req.params.venta_id]).catch(() => {}); // ignora si la columna no existe

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
    res.send(xml);
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

// ---------------------------------------------------------------------
//  GET /api/factura/pdf/:venta_id   →  RIDE (representación impresa) en PDF
// ---------------------------------------------------------------------
const generarFacturaPDF = async (req, res) => {
  try {
    const data = await obtenerVenta(req.params.venta_id);
    if (!data) return res.status(404).json({ ok: false, mensaje: 'Venta no encontrada' });

    const { venta, detalles } = data;
    const { claveAcceso, secuencial } = construirFacturaXML(venta, detalles);
    const fecha = new Date(venta.fecha);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Factura_${secuencial}.pdf`);
    doc.pipe(res);

    doc.rect(0, 0, 612, 100).fill('#1565C0');
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text(EMISOR.razonSocial, 40, 20);
    doc.fontSize(11).font('Helvetica')
      .text(`RUC: ${EMISOR.ruc}`, 40, 44)
      .text(`Dirección: ${EMISOR.dirMatriz}`, 40, 58)
      .text(`Ambiente: ${EMISOR.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}`, 40, 72);

    doc.rect(380, 10, 190, 80).fill('#0D47A1');
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
      .text('FACTURA', 390, 18)
      .text(`No. ${EMISOR.estab}-${EMISOR.ptoEmi}-${secuencial}`, 390, 34);
    doc.fontSize(9).font('Helvetica')
      .text(`Fecha: ${fecha.toLocaleDateString('es-EC')}`, 390, 52)
      .text(`Clave: ${claveAcceso.substring(0, 20)}...`, 390, 66);

    doc.fillColor('#1565C0').fontSize(12).font('Helvetica-Bold').text('DATOS DEL CLIENTE', 40, 120);
    doc.moveTo(40, 136).lineTo(570, 136).strokeColor('#BBDEFB').stroke();
    doc.fillColor('#333').fontSize(11).font('Helvetica')
      .text(`Cliente: ${venta.cliente_nombre}`, 40, 142)
      .text(`Identificación: ${venta.cliente_cedula}`, 40, 158)
      .text(`Forma de pago: ${String(venta.tipo_pago).toUpperCase()}`, 40, 174);

    doc.fillColor('#1565C0').fontSize(12).font('Helvetica-Bold').text('DETALLE DE PRODUCTOS', 40, 200);
    doc.moveTo(40, 216).lineTo(570, 216).strokeColor('#BBDEFB').stroke();
    doc.rect(40, 221, 530, 20).fill('#E3F2FD');
    doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold');
    doc.text('Descripción', 48, 226);
    doc.text('Cant.', 320, 226);
    doc.text('P. Unit.', 380, 226);
    doc.text('Subtotal', 470, 226);

    let y = 246;
    detalles.forEach((d, i) => {
      if (i % 2 === 0) doc.rect(40, y - 3, 530, 18).fill('#F8F9FA');
      doc.fillColor('#333').fontSize(10).font('Helvetica');
      doc.text(d.producto_nombre, 48, y);
      doc.text(String(d.cantidad), 320, y);
      doc.text(`$${parseFloat(d.precio_unitario).toFixed(2)}`, 380, y);
      doc.text(`$${parseFloat(d.subtotal).toFixed(2)}`, 470, y);
      y += 18;
    });

    doc.rect(380, y + 10, 190, 40).fill('#E3F2FD');
    doc.fillColor('#1565C0').fontSize(14).font('Helvetica-Bold')
      .text('TOTAL:', 390, y + 20)
      .text(`$${parseFloat(venta.total).toFixed(2)}`, 470, y + 20);

    doc.fillColor('#666').fontSize(8).font('Helvetica')
      .text(`Clave de acceso: ${claveAcceso}`, 40, y + 70, { align: 'center' });
    if (EMISOR.ambiente !== '2') {
      doc.fillColor('#999').fontSize(8)
        .text('Documento generado en ambiente de PRUEBAS — No válido tributariamente', 40, y + 85, { align: 'center' });
    }
    doc.end();
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

// ---------------------------------------------------------------------
//  POST /api/factura/enviar-sri/:venta_id
//  Flujo REAL: genera el XML → lo firma con tu .p12 → lo envía al SRI →
//  devuelve la autorización. Requiere firma .p12 configurada (ver .env).
// ---------------------------------------------------------------------
const { firmarYEnviar } = require('../utils/firmarYEnviar');

const enviarSRI = async (req, res) => {
  try {
    const data = await obtenerVenta(req.params.venta_id);
    if (!data) return res.status(404).json({ ok: false, mensaje: 'Venta no encontrada' });

    const { xml, claveAcceso } = construirFacturaXML(data.venta, data.detalles);
    const resultado = await firmarYEnviar(xml, claveAcceso);

    if (!resultado.ok) {
      // Falta firma, librería o el SRI devolvió error: mensaje claro, sin romper
      return res.status(400).json({ ok: false, paso: resultado.paso, mensaje: resultado.mensaje });
    }

    // Guardar estado en la venta (ignora si las columnas no existen)
    await db.query(`UPDATE ventas SET clave_acceso = ?, estado_sri = 'AUTORIZADO' WHERE id = ?`,
      [claveAcceso, req.params.venta_id]).catch(() => {});

    res.json({ ok: true, claveAcceso, autorizacion: resultado.autorizacion });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { generarFacturaXML, generarFacturaPDF, enviarSRI };