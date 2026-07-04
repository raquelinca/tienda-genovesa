const db = require('../config/db');
const ExcelJS = require('exceljs');

// WHERE de ventas (alias v) a partir de los filtros del query string.
function filtroVentas(query) {
  const cond = [];
  const params = [];
  if (query.desde) { cond.push('DATE(v.fecha) >= ?'); params.push(query.desde); }
  if (query.hasta) { cond.push('DATE(v.fecha) <= ?'); params.push(query.hasta); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  return { where, params };
}

// WHERE de inventario (categoría)
function filtroProductos(query) {
  const cond = ['activo = 1'];
  const params = [];
  if (query.categoria && query.categoria !== 'todas') {
    cond.push('categoria = ?'); params.push(query.categoria);
  }
  return { where: 'WHERE ' + cond.join(' AND '), params };
}

// WHERE de ventas + categoría del producto vendido (requiere join con detalle_venta/productos, alias p).
function filtroVentasCategoria(query) {
  const cond = [];
  const params = [];
  if (query.desde) { cond.push('DATE(v.fecha) >= ?'); params.push(query.desde); }
  if (query.hasta) { cond.push('DATE(v.fecha) <= ?'); params.push(query.hasta); }
  if (query.categoria && query.categoria !== 'todas') { cond.push('p.categoria = ?'); params.push(query.categoria); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  return { where, params };
}

const getVentasReporte = async (req, res) => {
  try {
    const { categoria } = req.query;
    if (categoria && categoria !== 'todas') {
      // Con categoría: el total de cada venta se recorta a lo vendido de esa categoría.
      const f = filtroVentasCategoria(req.query);
      const [rows] = await db.query(`
        SELECT v.id, v.tipo_pago, v.estado, v.fecha, SUM(dv.subtotal) AS total
        FROM ventas v
        JOIN detalle_venta dv ON dv.venta_id = v.id
        JOIN productos p ON p.id = dv.producto_id
        ${f.where}
        GROUP BY v.id, v.tipo_pago, v.estado, v.fecha
        ORDER BY v.fecha DESC
      `, f.params);
      return res.json({ ok: true, data: rows });
    }
    const fV = filtroVentas(req.query);
    const [rows] = await db.query(`
      SELECT v.id, v.total, v.tipo_pago, v.estado, v.fecha
      FROM ventas v
      ${fV.where}
      ORDER BY v.fecha DESC
    `, fV.params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

// Productos más vendidos (por unidades), respetando fecha y categoría.
const getProductosVendidos = async (req, res) => {
  try {
    const f = filtroVentasCategoria(req.query);
    const [rows] = await db.query(`
      SELECT p.nombre,
             SUM(dv.cantidad)  AS unidades,
             SUM(dv.subtotal)  AS total
      FROM detalle_venta dv
      JOIN productos p ON p.id = dv.producto_id
      JOIN ventas    v ON v.id = dv.venta_id
      ${f.where}
      GROUP BY p.id, p.nombre
      ORDER BY unidades DESC
      LIMIT 10
    `, f.params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const exportarExcel = async (req, res) => {
  try {
    const fV = filtroVentas(req.query);
    const fP = filtroProductos(req.query);

    const [ventas] = await db.query(`
      SELECT v.id, v.total, v.tipo_pago, v.estado, v.fecha
      FROM ventas v ${fV.where} ORDER BY v.fecha DESC
    `, fV.params);
    const [productos] = await db.query(`
      SELECT nombre, categoria, precio_venta, precio_compra, stock_actual, stock_minimo
      FROM productos ${fP.where} ORDER BY nombre
    `, fP.params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tienda Genovesa';

    // Hoja 1 - Ventas
    const hVentas = workbook.addWorksheet('Ventas');
    hVentas.columns = [
      { header: '#', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha', width: 20 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Tipo Pago', key: 'tipo_pago', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    // Estilo encabezado ventas
    hVentas.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    ventas.forEach(v => {
      hVentas.addRow({
        id: v.id,
        fecha: new Date(v.fecha).toLocaleString(),
        total: parseFloat(v.total),
        tipo_pago: v.tipo_pago,
        estado: v.estado
      });
    });

    // Hoja 2 - Inventario
    const hInventario = workbook.addWorksheet('Inventario');
    hInventario.columns = [
      { header: 'Nombre', key: 'nombre', width: 25 },
      { header: 'Categoría', key: 'categoria', width: 15 },
      { header: 'Precio Venta', key: 'precio_venta', width: 14 },
      { header: 'Precio Compra', key: 'precio_compra', width: 14 },
      { header: 'Stock Actual', key: 'stock_actual', width: 14 },
      { header: 'Stock Mínimo', key: 'stock_minimo', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
    ];

    // Estilo encabezado inventario
    hInventario.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    productos.forEach(p => {
      const estado = p.stock_actual === 0 ? 'Sin stock' : p.stock_actual <= p.stock_minimo ? 'Stock bajo' : 'Normal';
      const row = hInventario.addRow({
        nombre: p.nombre,
        categoria: p.categoria,
        precio_venta: parseFloat(p.precio_venta),
        precio_compra: parseFloat(p.precio_compra),
        stock_actual: p.stock_actual,
        stock_minimo: p.stock_minimo,
        estado
      });
      // Color según estado
      if (p.stock_actual === 0) {
        row.getCell('estado').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCDD2' } };
        row.getCell('estado').font = { color: { argb: 'FFC62828' } };
      } else if (p.stock_actual <= p.stock_minimo) {
        row.getCell('estado').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
        row.getCell('estado').font = { color: { argb: 'FFE65100' } };
      } else {
        row.getCell('estado').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
        row.getCell('estado').font = { color: { argb: 'FF2E7D32' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_TiendaGenovesa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};
const PDFDocument = require('pdfkit');

const exportarPDF = async (req, res) => {
  try {
    const fV = filtroVentas(req.query);
    const fP = filtroProductos(req.query);

    const [ventas] = await db.query(`
      SELECT v.id, v.total, v.tipo_pago, v.estado, v.fecha
      FROM ventas v ${fV.where} ORDER BY v.fecha DESC LIMIT 50
    `, fV.params);
    const [productos] = await db.query(`
      SELECT nombre, categoria, precio_venta, stock_actual, stock_minimo
      FROM productos ${fP.where} ORDER BY nombre
    `, fP.params);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_TiendaGenovesa.pdf');
    doc.pipe(res);

    // Encabezado
    doc.rect(0, 0, 612, 80).fill('#1565C0');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
      .text('TIENDA GENOVESA', 40, 20);
    doc.fontSize(12).font('Helvetica')
      .text('Reporte General del Sistema', 40, 48);
    doc.fontSize(10)
      .text(`Generado: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 40, 62);

    // Filtros aplicados
    const filtrosTexto = [];
    if (req.query.desde || req.query.hasta) filtrosTexto.push(`Período: ${req.query.desde || '...'} a ${req.query.hasta || '...'}`);
    if (req.query.categoria && req.query.categoria !== 'todas') filtrosTexto.push(`Categoría: ${req.query.categoria}`);
    if (filtrosTexto.length) {
      doc.fillColor('#666666').fontSize(9).font('Helvetica-Oblique')
        .text('Filtros aplicados: ' + filtrosTexto.join('   |   '), 40, 92);
    }

    doc.moveDown(3);

    // Resumen
    const totalVentas = ventas.reduce((s, v) => s + parseFloat(v.total), 0);
    doc.fillColor('#1565C0').fontSize(14).font('Helvetica-Bold')
      .text('RESUMEN GENERAL', 40, 100);
    doc.moveTo(40, 118).lineTo(570, 118).strokeColor('#1565C0').stroke();

    doc.fillColor('#333333').fontSize(11).font('Helvetica');
    doc.text(`Total de ventas registradas: ${ventas.length}`, 40, 125);
    doc.text(`Monto total vendido: $${totalVentas.toFixed(2)}`, 40, 142);
    doc.text(`Productos en inventario: ${productos.length}`, 40, 159);
    doc.text(`Promedio por venta: $${ventas.length > 0 ? (totalVentas / ventas.length).toFixed(2) : '0.00'}`, 40, 176);

    // Tabla de ventas
    doc.moveDown(2);
    doc.fillColor('#1565C0').fontSize(14).font('Helvetica-Bold')
      .text('HISTORIAL DE VENTAS', 40, 210);
    doc.moveTo(40, 228).lineTo(570, 228).strokeColor('#1565C0').stroke();

    // Encabezado tabla ventas
    doc.rect(40, 233, 530, 20).fill('#E3F2FD');
    doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold');
    doc.text('#', 48, 238);
    doc.text('Fecha', 80, 238);
    doc.text('Total', 280, 238);
    doc.text('Tipo Pago', 350, 238);
    doc.text('Estado', 460, 238);

    let y = 258;
    ventas.slice(0, 20).forEach((v, i) => {
      if (i % 2 === 0) doc.rect(40, y - 3, 530, 18).fill('#F8F9FA');
      doc.fillColor('#333333').fontSize(9).font('Helvetica');
      doc.text(`#${v.id}`, 48, y);
      doc.text(new Date(v.fecha).toLocaleDateString(), 80, y);
      doc.text(`$${parseFloat(v.total).toFixed(2)}`, 280, y);
      doc.text(v.tipo_pago, 350, y);
      doc.text(v.estado, 460, y);
      y += 18;
    });

    // Nueva página para inventario
    doc.addPage();

    doc.rect(0, 0, 612, 60).fill('#1565C0');
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
      .text('REPORTE DE INVENTARIO', 40, 20);
    doc.fontSize(10).font('Helvetica')
      .text('Tienda Genovesa', 40, 42);

    doc.fillColor('#1565C0').fontSize(14).font('Helvetica-Bold')
      .text('PRODUCTOS EN INVENTARIO', 40, 80);
    doc.moveTo(40, 98).lineTo(570, 98).strokeColor('#1565C0').stroke();

    // Encabezado tabla inventario
    doc.rect(40, 103, 530, 20).fill('#E3F2FD');
    doc.fillColor('#1565C0').fontSize(10).font('Helvetica-Bold');
    doc.text('Nombre', 48, 108);
    doc.text('Categoría', 180, 108);
    doc.text('Precio', 290, 108);
    doc.text('Stock', 360, 108);
    doc.text('Mínimo', 420, 108);
    doc.text('Estado', 480, 108);

    y = 128;
    productos.forEach((p, i) => {
      if (i % 2 === 0) doc.rect(40, y - 3, 530, 18).fill('#F8F9FA');
      const estado = p.stock_actual === 0 ? 'Sin stock' : p.stock_actual <= p.stock_minimo ? 'Stock bajo' : 'Normal';
      const color = p.stock_actual === 0 ? '#C62828' : p.stock_actual <= p.stock_minimo ? '#E65100' : '#2E7D32';
      doc.fillColor('#333333').fontSize(9).font('Helvetica');
      doc.text(p.nombre.substring(0, 18), 48, y);
      doc.text(p.categoria || '-', 180, y);
      doc.text(`$${parseFloat(p.precio_venta).toFixed(2)}`, 290, y);
      doc.text(p.stock_actual.toString(), 360, y);
      doc.text(p.stock_minimo.toString(), 420, y);
      doc.fillColor(color).text(estado, 480, y);
      y += 18;
    });

    // Pie de página
    doc.fillColor('#999999').fontSize(8)
      .text('Tienda Genovesa — Sistema de Gestión Comercial', 40, 780, { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getVentasReporte, getProductosVendidos, exportarExcel, exportarPDF };