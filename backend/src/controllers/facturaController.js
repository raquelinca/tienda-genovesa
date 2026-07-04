const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { construirFacturaXML, EMISOR } = require('../utils/sriFactura');
const fs = require('fs');
const path = require('path');

// Carpeta donde se guardarán los XMLs generados
const CARPETA_XML = path.join(__dirname, '../../facturas_xml');
if (!fs.existsSync(CARPETA_XML)) fs.mkdirSync(CARPETA_XML, { recursive: true });

const generarFactura = async (req, res) => {
  try {
    const { venta_id } = req.params;

    const [ventas] = await db.query(`
      SELECT v.*,
        COALESCE(v.cliente_nombre, 'CONSUMIDOR FINAL') as cliente_nombre,
        COALESCE(v.cliente_cedula, '9999999999999') as cliente_cedula
      FROM ventas v WHERE v.id = ?
    `, [venta_id]);

    if (ventas.length === 0)
      return res.status(404).json({ ok: false, mensaje: 'Venta no encontrada' });

    const venta = ventas[0];

    const [detalles] = await db.query(`
      SELECT dv.*, p.nombre as producto_nombre
      FROM detalle_venta dv
      JOIN productos p ON dv.producto_id = p.id
      WHERE dv.venta_id = ?
    `, [venta_id]);

    // Generar XML usando sriFactura.js
    const { xml, claveAcceso, secuencial, nombreArchivo, totales } = construirFacturaXML(venta, detalles);

    // Guardar XML en carpeta facturas_xml
    const rutaXML = path.join(CARPETA_XML, nombreArchivo);
    fs.writeFileSync(rutaXML, xml, 'utf8');

    // Generar PDF (RIDE)
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Factura_${secuencial}.pdf`);
    doc.pipe(res);

    // Encabezado azul
    doc.rect(0, 0, 612, 100).fill('#1565C0');
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
      .text(EMISOR.razonSocial, 40, 15);
    doc.fontSize(10).font('Helvetica')
      .text(`RUC: ${EMISOR.ruc}`, 40, 38)
      .text(`Dirección: ${EMISOR.dirMatriz}`, 40, 52)
      .text(`Ambiente: ${EMISOR.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'}`, 40, 66);

    // Caja derecha — número de factura
    doc.rect(380, 10, 190, 80).fill('#0D47A1');
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
      .text('FACTURA', 390, 16)
      .text(`No. ${EMISOR.estab}-${EMISOR.ptoEmi}-${secuencial}`, 390, 32);
    doc.fontSize(9).font('Helvetica')
      .text(`Fecha: ${new Date(venta.fecha).toLocaleDateString('es-EC')}`, 390, 50)
      .text(`Clave: ${claveAcceso.substring(0, 24)}...`, 390, 64);

    // Datos del cliente
    doc.fillColor('#1565C0').fontSize(12).font('Helvetica-Bold')
      .text('DATOS DEL CLIENTE', 40, 118);
    doc.moveTo(40, 134).lineTo(570, 134).strokeColor('#BBDEFB').stroke();
    doc.fillColor('#333').fontSize(10).font('Helvetica')
      .text(`Cliente: ${venta.cliente_nombre}`, 40, 140)
      .text(`Identificación: ${venta.cliente_cedula}`, 40, 155)
      .text(`Forma de pago: ${venta.tipo_pago?.toUpperCase()}`, 40, 170);

    // Tabla de productos
    doc.fillColor('#1565C0').fontSize(12).font('Helvetica-Bold')
      .text('DETALLE DE PRODUCTOS', 40, 196);
    doc.moveTo(40, 212).lineTo(570, 212).strokeColor('#BBDEFB').stroke();

    // Encabezado tabla
    doc.rect(40, 217, 530, 20).fill('#E3F2FD');
    doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold');
    doc.text('Descripción', 48, 222);
    doc.text('Cant.', 300, 222);
    doc.text('P.Unit.', 360, 222);
    doc.text('Subtotal', 430, 222);
    doc.text('IVA 15%', 500, 222);

    let y = 242;
    for (const d of detalles) {
      if (y > 700) { doc.addPage(); y = 40; }
      const subtotal = parseFloat(d.subtotal);
      const iva = Math.round(subtotal * 15) / 100;
      if (detalles.indexOf(d) % 2 === 0)
        doc.rect(40, y - 3, 530, 18).fill('#F8F9FA');
      doc.fillColor('#333').fontSize(9).font('Helvetica');
      doc.text(d.producto_nombre.substring(0, 22), 48, y);
      doc.text(String(d.cantidad), 300, y);
      doc.text(`$${parseFloat(d.precio_unitario).toFixed(2)}`, 360, y);
      doc.text(`$${subtotal.toFixed(2)}`, 430, y);
      doc.text(`$${iva.toFixed(2)}`, 500, y);
      y += 18;
    }

    // Totales
    y += 10;
    doc.rect(350, y, 220, 60).fill('#E3F2FD');
    doc.fillColor('#333').fontSize(10).font('Helvetica');
    doc.text('Subtotal sin IVA:', 360, y + 6)
      .text(`$${totales.totalSinImpuestos.toFixed(2)}`, 510, y + 6);
    doc.text('IVA (15%):', 360, y + 22)
      .text(`$${totales.totalIva.toFixed(2)}`, 510, y + 22);
    doc.fillColor('#1565C0').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL:', 360, y + 38)
      .text(`$${totales.importeTotal.toFixed(2)}`, 510, y + 38);

    // Clave de acceso y nota
    doc.fillColor('#666').fontSize(7).font('Helvetica')
      .text(`Clave de acceso: ${claveAcceso}`, 40, y + 80, { align: 'center', width: 530 });
    doc.fillColor('#999').fontSize(7)
      .text('Documento generado en ambiente de PRUEBAS — No válido tributariamente sin firma electrónica', 40, y + 92, { align: 'center', width: 530 });

    doc.end();

  } catch (err) {
    console.error('Error generando factura:', err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

// Endpoint para descargar el XML generado
const descargarXML = async (req, res) => {
  try {
    const { venta_id } = req.params;
    const archivos = fs.readdirSync(CARPETA_XML);
    const archivo = archivos.find(f => f.includes(String(venta_id).padStart(9, '0')));
    if (!archivo)
      return res.status(404).json({ ok: false, mensaje: 'XML no encontrado. Genera la factura primero.' });
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=${archivo}`);
    res.sendFile(path.join(CARPETA_XML, archivo));
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { generarFactura, descargarXML };