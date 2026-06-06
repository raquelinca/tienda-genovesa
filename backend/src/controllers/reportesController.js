const db = require('../config/db');

const getVentasReporte = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.id, v.total, v.tipo_pago, v.estado, v.fecha
      FROM ventas v
      ORDER BY v.fecha DESC
      LIMIT 100
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getVentasReporte };