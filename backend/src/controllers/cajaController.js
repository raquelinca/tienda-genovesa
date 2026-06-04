const db = require('../config/db');

const getCajaActiva = async (req, res) => {
  try {
    const [cajas] = await db.query(
      `SELECT * FROM caja WHERE estado='abierta' ORDER BY apertura DESC LIMIT 1`
    );
    if (cajas.length === 0) return res.json({ ok: true, caja: null });

    const caja = cajas[0];
    const [movimientos] = await db.query(
      `SELECT * FROM caja_movimientos WHERE caja_id=? ORDER BY fecha ASC`,
      [caja.id]
    );
    res.json({ ok: true, caja, movimientos });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const abrirCaja = async (req, res) => {
  try {
    const { monto_apertura } = req.body;
    const [existe] = await db.query(
      `SELECT id FROM caja WHERE estado='abierta' LIMIT 1`
    );
    if (existe.length > 0)
      return res.status(400).json({ ok: false, mensaje: 'Ya hay una caja abierta.' });

    await db.query(
      `INSERT INTO caja (usuario_id, monto_apertura, estado) VALUES (1, ?, 'abierta')`,
      [monto_apertura]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const registrarMovimiento = async (req, res) => {
  try {
    const { caja_id, tipo, descripcion, monto } = req.body;
    await db.query(
      `INSERT INTO caja_movimientos (caja_id, tipo, descripcion, monto) VALUES (?, ?, ?, ?)`,
      [caja_id, tipo, descripcion, monto]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const cerrarCaja = async (req, res) => {
  try {
    const { caja_id } = req.body;
    const [movimientos] = await db.query(
      `SELECT * FROM caja_movimientos WHERE caja_id=?`, [caja_id]
    );
    const [cajas] = await db.query(`SELECT * FROM caja WHERE id=?`, [caja_id]);
    const caja = cajas[0];

    const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + parseFloat(m.monto), 0);
    const totalEgresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + parseFloat(m.monto), 0);
    const montoCierre   = parseFloat(caja.monto_apertura) + totalIngresos - totalEgresos;

    await db.query(
      `UPDATE caja SET estado='cerrada', monto_cierre=?, cierre=NOW() WHERE id=?`,
      [montoCierre, caja_id]
    );
    res.json({ ok: true, montoCierre });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getCajaActiva, abrirCaja, registrarMovimiento, cerrarCaja };