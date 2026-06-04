const db = require('../config/db');

const getCuentas = async (req, res) => {
  try {
    // Actualizar vencidas automáticamente
    await db.query(`
      UPDATE cuentas_cobrar 
      SET estado = 'vencida' 
      WHERE vencimiento < CURDATE() AND estado = 'pendiente'
    `);
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
      `INSERT INTO cuentas_cobrar (cliente_id, monto_total, monto_pagado, saldo, vencimiento)
       VALUES (?, ?, 0, ?, ?)`,
      [cliente_id, monto_total, monto_total, vencimiento]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const editarCuenta = async (req, res) => {
  try {
    const { cliente_id, monto_total, vencimiento } = req.body;
    await db.query(
      `UPDATE cuentas_cobrar SET cliente_id=?, monto_total=?, saldo=?, vencimiento=? WHERE id=?`,
      [cliente_id, monto_total, monto_total, vencimiento, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const eliminarCuenta = async (req, res) => {
  try {
    await db.query(`DELETE FROM cuentas_cobrar WHERE id=?`, [req.params.id]);
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

const crearCliente = async (req, res) => {
  try {
    const { nombre, cedula, telefono } = req.body;
    await db.query(
      `INSERT INTO clientes (nombre, cedula, telefono) VALUES (?, ?, ?)`,
      [nombre, cedula || '', telefono || '']
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getCuentas, crearCuenta, editarCuenta, eliminarCuenta, abonar, getClientes, crearCliente };