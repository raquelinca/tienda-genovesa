const db = require('../config/db');
const { buscarOCrearCliente } = require('../utils/clientes');

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
    // Actualizar vencidas automáticamente
    await db.query(`
      UPDATE cuentas_cobrar
      SET estado = 'vencida'
      WHERE vencimiento < CURDATE() AND estado = 'pendiente'
    `);
    // Las cuentas pendientes/vencidas siempre se muestran (una deuda no deja de existir
    // por estar fuera del rango); el rango de fechas solo filtra las ya pagadas.
    const f = filtroFechaVencimiento(req.query, 'cc');
    const [rows] = await db.query(`
      SELECT cc.*, c.nombre as cliente_nombre
      FROM cuentas_cobrar cc
      JOIN clientes c ON cc.cliente_id = c.id
      WHERE cc.estado IN ('pendiente', 'vencida') OR (${f.cond})
      ORDER BY cc.vencimiento ASC
    `, f.params);
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
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const monto = parseFloat(req.body.monto);

    if (!monto || monto <= 0) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: 'El monto del abono debe ser mayor a 0.' });
    }

    const [rows] = await conn.query(
      `SELECT cc.*, c.nombre AS cliente_nombre
       FROM cuentas_cobrar cc JOIN clientes c ON cc.cliente_id = c.id
       WHERE cc.id = ?`, [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, mensaje: 'Cuenta no encontrada.' });
    }
    const cuenta = rows[0];

    if (monto > parseFloat(cuenta.saldo) + 0.005) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: 'El abono no puede ser mayor al saldo pendiente.' });
    }

    const nuevoSaldo  = Math.max(parseFloat(cuenta.saldo) - monto, 0);
    const nuevoPagado = parseFloat(cuenta.monto_pagado) + monto;
    const nuevoEstado = nuevoSaldo <= 0.005 ? 'pagada' : 'pendiente';

    await conn.query(
      `UPDATE cuentas_cobrar SET monto_pagado=?, saldo=?, estado=? WHERE id=?`,
      [nuevoPagado, nuevoSaldo, nuevoEstado, id]);

    // INGRESO automático en la caja abierta (si hay una abierta)
    let cajaRegistrada = false;
    const [cajas] = await conn.query(
      `SELECT id FROM caja WHERE estado='abierta' ORDER BY apertura DESC LIMIT 1`);
    if (cajas.length > 0) {
      await conn.query(
        `INSERT INTO caja_movimientos (caja_id, tipo, descripcion, monto) VALUES (?, 'ingreso', ?, ?)`,
        [cajas[0].id, `Cobro cuenta — ${cuenta.cliente_nombre}`, monto]);
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
    const resultado = await buscarOCrearCliente(db, {
      nombre: (nombre || '').toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase()),
      cedula,
      telefono,
    });
    if (resultado.existente) {
      return res.json({
        ok: true, id: resultado.id, existente: true,
        mensaje: `Ya existía "${resultado.nombre}" con esa cédula/RUC — se usará ese registro en vez de crear uno nuevo.`,
      });
    }
    res.json({ ok: true, id: resultado.id, existente: false });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getCuentas, crearCuenta, editarCuenta, eliminarCuenta, abonar, getClientes, crearCliente };