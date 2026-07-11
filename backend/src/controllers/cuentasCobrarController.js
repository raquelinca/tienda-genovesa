const db = require('../config/db');
const { buscarOCrearCliente } = require('../utils/clientes');
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
    // Actualizar vencidas automáticamente
    await db.query(`
      UPDATE cuentas_cobrar
      SET estado = 'vencida'
      WHERE vencimiento < CURDATE() AND estado = 'pendiente'
    `);
    // Las cuentas pendientes/vencidas/credito siempre se muestran (una deuda no deja
    // de existir, y una línea de crédito no tiene vencimiento propio que filtrar);
    // el rango de fechas solo filtra las ya pagadas.
    const f = filtroFechaVencimiento(req.query, 'cc');
    const [rows] = await db.query(`
      SELECT cc.*, c.nombre as cliente_nombre
      FROM cuentas_cobrar cc
      JOIN clientes c ON cc.cliente_id = c.id
      WHERE cc.estado IN ('pendiente', 'vencida', 'credito') OR (${f.cond})
      ORDER BY cc.vencimiento ASC
    `, f.params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

// 'pagada'/'vencida' son estados calculados por el sistema (abono / fecha vencida);
// al crear una cuenta a mano solo tiene sentido elegir entre 'pendiente' y 'credito'.
const ESTADOS_MANUALES = ['pendiente', 'credito'];

function validarCuenta(body) {
  if (!body.cliente_id) return 'Selecciona un cliente.';
  const errorMonto = validarMonto(body.monto_total, { mayorQueCero: true, campo: 'El monto' });
  if (errorMonto) return errorMonto;
  // Una línea de crédito es un cupo, no una deuda con fecha de vencimiento.
  if (body.estado !== 'credito' && !body.vencimiento) return 'La fecha de vencimiento es obligatoria.';
  return null;
}

const crearCuenta = async (req, res) => {
  try {
    const error = validarCuenta(req.body);
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    const { cliente_id, monto_total, vencimiento } = req.body;
    const estado = ESTADOS_MANUALES.includes(req.body.estado) ? req.body.estado : 'pendiente';
    const esCredito = estado === 'credito';
    await db.query(
      `INSERT INTO cuentas_cobrar (cliente_id, monto_total, monto_pagado, saldo, vencimiento, estado)
       VALUES (?, ?, 0, ?, ?, ?)`,
      [cliente_id, monto_total, esCredito ? 0 : monto_total, esCredito ? null : vencimiento, estado]
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
    const { cliente_id, monto_total, vencimiento } = req.body;
    // El saldo se recalcula contra lo ya abonado (monto_pagado), no se pisa con
    // monto_total — de lo contrario editar la cuenta borraría los abonos previos.
    await db.query(
      `UPDATE cuentas_cobrar
       SET cliente_id=?, monto_total=?, saldo = GREATEST(? - monto_pagado, 0), vencimiento=?
       WHERE id=?`,
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
    const errorMonto = validarMonto(req.body.monto, { mayorQueCero: true, campo: 'El monto del abono' });
    if (errorMonto) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: errorMonto });
    }
    const monto = parseFloat(req.body.monto);

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

    // Registrar movimiento de abono
    await conn.query(
      `INSERT INTO cuentas_cobrar_movimientos (cliente_id, tipo, descripcion, monto, venta_id)
       VALUES (?, 'abono', ?, ?, NULL)`,
      [cuenta.cliente_id, `Abono a cuenta #${cuenta.id}`, monto]
    );

    await conn.commit();
    res.json({ ok: true, cajaRegistrada, estado: nuevoEstado });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    conn.release();
  }
};

const getMovimientos = async (req, res) => {
  try {
    const { cliente_id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM cuentas_cobrar_movimientos
       WHERE cliente_id = ?
       ORDER BY fecha ASC`,
      [cliente_id]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const getClientes = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT *, cupo_credito FROM clientes ORDER BY nombre`);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const crearCliente = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { nombre, cedula, telefono, cupo_credito, correo, celular } = req.body;

    const errorNombre = validarTexto(nombre, { min: 2, max: 60, campo: 'El nombre del cliente' });
    if (errorNombre) return res.status(400).json({ ok: false, mensaje: errorNombre });
    const errorCedula = validarCedula(cedula);
    if (errorCedula) return res.status(400).json({ ok: false, mensaje: errorCedula });
    const errorTelefono = validarTelefono(telefono);
    if (errorTelefono) return res.status(400).json({ ok: false, mensaje: errorTelefono });
    let cupo = 0;
    if (cupo_credito !== undefined && cupo_credito !== '') {
      const errorCupo = validarMonto(cupo_credito, { mayorQueCero: false, campo: 'El cupo de crédito' });
      if (errorCupo) return res.status(400).json({ ok: false, mensaje: errorCupo });
      cupo = parseFloat(cupo_credito) || 0;
    }

    await conn.beginTransaction();

    const resultado = await buscarOCrearCliente(conn, {
      nombre: nombre.trim().toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase()),
      cedula: (cedula || '').trim(),
      telefono: (telefono || '').trim(),
      correo: (correo || '').trim(),
      celular: (celular || '').trim(),
    });

    // Solo se toca el cupo si el usuario escribió algo — así no se resetea a 0 el
    // cupo de un cliente ya existente (cédula duplicada) por dejar el campo vacío.
    if (cupo_credito !== undefined && cupo_credito !== '') {
      await conn.query(`UPDATE clientes SET cupo_credito = ? WHERE id = ?`, [cupo, resultado.id]);
    }

    // Si tiene cupo, deja registrada su línea de crédito en C×C (saldo 0 = nada
    // usado todavía); si ya tenía una, solo actualiza el cupo mostrado ahí.
    if (cupo > 0) {
      const [[lineaCredito]] = await conn.query(
        `SELECT id FROM cuentas_cobrar WHERE cliente_id = ? AND estado = 'credito' LIMIT 1`,
        [resultado.id]
      );
      if (lineaCredito) {
        await conn.query(`UPDATE cuentas_cobrar SET monto_total = ? WHERE id = ?`, [cupo, lineaCredito.id]);
      } else {
        await conn.query(
          `INSERT INTO cuentas_cobrar (cliente_id, monto_total, monto_pagado, saldo, vencimiento, estado)
           VALUES (?, ?, 0, 0, NULL, 'credito')`,
          [resultado.id, cupo]
        );
      }
    }

    await conn.commit();

    if (resultado.existente) {
      return res.json({
        ok: true, id: resultado.id, existente: true,
        mensaje: `Ya existía "${resultado.nombre}" con esa cédula/RUC — se usará ese registro en vez de crear uno nuevo.`,
      });
    }
    res.json({ ok: true, id: resultado.id, existente: false });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, mensaje: err.message });
  } finally {
    conn.release();
  }
};

module.exports = { getCuentas, crearCuenta, editarCuenta, eliminarCuenta, abonar, getMovimientos, getClientes, crearCliente };
