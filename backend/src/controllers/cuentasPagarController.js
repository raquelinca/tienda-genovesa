const db = require('../config/db');
const { validarTexto, validarCedula, validarTelefono, validarMonto } = require('../utils/validadores');

// Rango de fechas sobre vencimiento; si no viene desde/hasta, no filtra nada (1=1).
function filtroFechaVencimiento(query, alias) {
  const cond = [];
  const params = [];
  if (query.desde) { cond.push(`DATE(${alias}.vencimiento) >= ?`); params.push(query.desde); }
  if (query.hasta) { cond.push(`DATE(${alias}.vencimiento) <= ?`); params.push(query.hasta); }
  return { cond: cond.length ? cond.join(' AND ') : '1=1', params };
}

const getCuentas = async (req, res) => {
  try {
    await db.query(`
      UPDATE cuentas_pagar
      SET estado = 'vencida'
      WHERE vencimiento < CURDATE() AND estado = 'pendiente'
    `);
    const f = filtroFechaVencimiento(req.query, 'cp');
    const [rows] = await db.query(`
      SELECT cp.*, p.nombre as proveedor_nombre
      FROM cuentas_pagar cp
      JOIN proveedores p ON cp.proveedor_id = p.id
      WHERE ${f.cond}
      ORDER BY cp.vencimiento ASC
    `, f.params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

function validarCuenta(body) {
  if (!body.proveedor_id) return 'Selecciona un proveedor.';
  const errorMonto = validarMonto(body.monto_total, { mayorQueCero: true, campo: 'El monto' });
  if (errorMonto) return errorMonto;
  if (!body.vencimiento) return 'La fecha de vencimiento es obligatoria.';
  return null;
}

const crearCuenta = async (req, res) => {
  try {
    const error = validarCuenta(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
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
    const error = validarCuenta(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
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
    const errorMonto = validarMonto(req.body.monto, { mayorQueCero: true, campo: 'El monto del pago' });
    if (errorMonto) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: errorMonto });
    }
    const monto = parseFloat(req.body.monto);

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

function validarProveedor(body) {
  return (
    validarTexto(body.nombre, { min: 2, max: 60, campo: 'El nombre del proveedor' }) ||
    validarCedula(body.ruc, { campo: 'El RUC' }) ||
    validarTelefono(body.telefono)
  );
}

const crearProveedor = async (req, res) => {
  try {
    const error = validarProveedor(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    const { nombre, ruc, telefono } = req.body;
    const nombreLimpio = nombre.trim();
    await db.query(
      `INSERT INTO proveedores (nombre, ruc, telefono) VALUES (?, ?, ?)`,
      [nombreLimpio.charAt(0).toUpperCase() + nombreLimpio.slice(1).toLowerCase(), (ruc || '').trim(), (telefono || '').trim()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const editarProveedor = async (req, res) => {
  try {
    const error = validarProveedor(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    const { nombre, ruc, telefono } = req.body;
    const nombreLimpio = nombre.trim();
    await db.query(
      `UPDATE proveedores SET nombre=?, ruc=?, telefono=? WHERE id=?`,
      [nombreLimpio.charAt(0).toUpperCase() + nombreLimpio.slice(1).toLowerCase(), (ruc || '').trim(), (telefono || '').trim(), req.params.id]
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