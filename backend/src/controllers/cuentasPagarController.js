const db = require('../config/db');

const getCuentas = async (req, res) => {
  try {
    await db.query(`
      UPDATE cuentas_pagar 
      SET estado = 'vencida' 
      WHERE vencimiento < CURDATE() AND estado = 'pendiente'
    `);
    const [rows] = await db.query(`
      SELECT cp.*, p.nombre as proveedor_nombre
      FROM cuentas_pagar cp
      JOIN proveedores p ON cp.proveedor_id = p.id
      ORDER BY cp.vencimiento ASC
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const crearCuenta = async (req, res) => {
  try {
    const { proveedor_id, monto_total, vencimiento } = req.body;
    await db.query(
      `INSERT INTO cuentas_pagar (proveedor_id, monto_total, monto_pagado, saldo, vencimiento)
       VALUES (?, ?, 0, ?, ?)`,
      [proveedor_id, monto_total, monto_total, vencimiento]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const editarCuenta = async (req, res) => {
  try {
    const { proveedor_id, monto_total, vencimiento } = req.body;
    await db.query(
      `UPDATE cuentas_pagar SET proveedor_id=?, monto_total=?, saldo=?, vencimiento=? WHERE id=?`,
      [proveedor_id, monto_total, monto_total, vencimiento, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const eliminarCuenta = async (req, res) => {
  try {
    await db.query(`DELETE FROM cuentas_pagar WHERE id=?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const abonar = async (req, res) => {
  try {
    const { monto } = req.body;
    const { id } = req.params;
    const [rows] = await db.query(`SELECT * FROM cuentas_pagar WHERE id=?`, [id]);
    const cuenta = rows[0];
    const nuevoSaldo = parseFloat(cuenta.saldo) - parseFloat(monto);
    const nuevoPagado = parseFloat(cuenta.monto_pagado) + parseFloat(monto);
    const nuevoEstado = nuevoSaldo <= 0 ? 'pagada' : 'pendiente';
    await db.query(
      `UPDATE cuentas_pagar SET monto_pagado=?, saldo=?, estado=? WHERE id=?`,
      [nuevoPagado, Math.max(nuevoSaldo, 0), nuevoEstado, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const getProveedores = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM proveedores ORDER BY nombre`);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const crearProveedor = async (req, res) => {
  try {
    const { nombre, ruc, telefono } = req.body;
    await db.query(
      `INSERT INTO proveedores (nombre, ruc, telefono) VALUES (?, ?, ?)`,
      [nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase(), ruc || '', telefono || '']
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const editarProveedor = async (req, res) => {
  try {
    const { nombre, ruc, telefono } = req.body;
    await db.query(
      `UPDATE proveedores SET nombre=?, ruc=?, telefono=? WHERE id=?`,
      [nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase(), ruc || '', telefono || '', req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const eliminarProveedor = async (req, res) => {
  try {
    await db.query(`DELETE FROM proveedores WHERE id=?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getCuentas, crearCuenta, editarCuenta, eliminarCuenta, abonar, getProveedores, crearProveedor, editarProveedor, eliminarProveedor };