const db = require('../config/db');

const crearVenta = async (req, res) => {
  const { tipo_pago, items } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [venta] = await conn.query(
      `INSERT INTO ventas (usuario_id, caja_id, total, tipo_pago)
       VALUES (1, 1, ?, ?)`,
      [items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0), tipo_pago]
    );

    for (const item of items) {
      await conn.query(
        `INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [venta.insertId, item.producto_id, item.cantidad,
         item.precio_unitario, item.precio_unitario * item.cantidad]
      );
      await conn.query(
        `UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?`,
        [item.cantidad, item.producto_id]
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true, venta_id: venta.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    conn.release();
  }
};

const getVentas = async (req, res) => {
  const [rows] = await db.query(
    `SELECT v.id, v.total, v.tipo_pago, v.estado, v.fecha
     FROM ventas v ORDER BY v.fecha DESC LIMIT 20`
  );
  res.json({ ok: true, data: rows });
};

module.exports = { crearVenta, getVentas };