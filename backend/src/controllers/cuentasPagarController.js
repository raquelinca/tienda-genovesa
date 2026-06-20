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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const monto = parseFloat(req.body.monto);

    if (!monto || monto <= 0) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: 'El monto del pago debe ser mayor a 0.' });
    }

    const [rows] = await conn.query(
      `SELECT cp.*, p.nombre AS proveedor_nombre
       FROM cuentas_pagar cp JOIN proveedores p ON cp.proveedor_id = p.id
       WHERE cp.id = ?`, [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Cuenta no encontrada.' });
    }
    const cuenta = rows[0];

    if (monto > parseFloat(cuenta.saldo) + 0.005) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: 'El pago no puede ser mayor al saldo pendiente.' });
    }

    const nuevoSaldo  = Math.max(parseFloat(cuenta.saldo) - monto, 0);
    const nuevoPagado = parseFloat(cuenta.monto_pagado) + monto;
    const nuevoEstado = nuevoSaldo <= 0.005 ? 'pagada' : 'pendiente';

    await conn.query(
      `UPDATE cuentas_pagar SET monto_pagado=?, saldo=?, estado=? WHERE id=?`,
      [nuevoPagado, nuevoSaldo, nuevoEstado, id]);

    // EGRESO automático en la caja abierta (si hay una abierta)
    let cajaRegistrada = false;
    const [cajas] = await conn.query(
      `SELECT id FROM caja WHERE estado='abierta' ORDER BY apertura DESC LIMIT 1`);
    if (cajas.length > 0) {
      await conn.query(
        `INSERT INTO caja_movimientos (caja_id, tipo, descripcion, monto) VALUES (?, 'egreso', ?, ?)`,
        [cajas[0].id, `Pago proveedor — ${cuenta.proveedor_nombre}`, monto]);
      cajaRegistrada = true;
    }

    await conn.commit();
    res.json({ ok: true, cajaRegistrada, estado: nuevoEstado });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    conn.release();
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