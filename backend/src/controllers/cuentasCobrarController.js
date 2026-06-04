 const db = require('../config/db');

const getCuentas = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cc.*, c.nombre as cliente_nombre
      FROM cuentas_cobrar cc
      JOIN clientes c ON cc.cliente_id = c.id
      ORDER BY cc.vencimiento ASC
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const crearCuenta = async (req, res) => {
  try {
    const { cliente_id, monto_total, vencimiento } = req.body;
    await db.query(
      `INSERT INTO cuentas_cobrar (cliente_id, venta_id, monto_total, saldo, vencimiento)
       VALUES (?, 1, ?, ?, ?)`,
      [cliente_id, monto_total, monto_total, vencimiento]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const abonar = async (req, res) => {
  try {
    const { monto } = req.body;
    const { id } = req.params;
    const [rows] = await db.query(`SELECT * FROM cuentas_cobrar WHERE id=?`, [id]);
    const cuenta = rows[0];
    const nuevoSaldo = parseFloat(cuenta.saldo) - parseFloat(monto);
    const nuevoPagado = parseFloat(cuenta.monto_pagado) + parseFloat(monto);
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'pendiente';
    await db.query(
      `UPDATE cuentas_cobrar SET monto_pagado=?, saldo=?, estado=? WHERE id=?`,
      [nuevoPagado, Math.max(nuevoSaldo, 0), nuevoEstado, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const getClientes = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM clientes ORDER BY nombre`);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getCuentas, crearCuenta, abonar, getClientes };
