const db = require('../config/db');
const { buscarOCrearCliente } = require('../utils/clientes');
const { validarTexto, validarCedula } = require('../utils/validadores');

const crearVenta = async (req, res) => {
  const { tipo_pago, items, tipo_cliente, cliente_nombre, cliente_cedula, cliente_correo, cliente_celular, cliente_id } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const total = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);

    // Crédito requiere un cliente registrado (para crear la cuenta por cobrar)
    if (tipo_pago === 'credito' && !cliente_id && (!cliente_nombre || cliente_nombre === 'CONSUMIDOR FINAL')) {
      await conn.rollback();
      return res.status(400).json({ ok: false, mensaje: 'Para crédito: elige un cliente registrado o escribe el nombre de uno nuevo.' });
    }

    // Datos de cliente para factura, o cliente nuevo en crédito: mismas reglas que el resto de la app.
    if (tipo_cliente === 'factura' || (tipo_pago === 'credito' && !cliente_id)) {
      const errorNombre = validarTexto(cliente_nombre, { min: 2, max: 60, campo: 'El nombre del cliente' });
      if (errorNombre) {
        await conn.rollback();
        return res.status(400).json({ ok: false, mensaje: errorNombre });
      }
    }
    if (tipo_cliente === 'factura') {
      const errorCedula = validarCedula(cliente_cedula, { requerido: true });
      if (errorCedula) {
        await conn.rollback();
        return res.status(400).json({ ok: false, mensaje: errorCedula });
      }
    } else if (cliente_cedula) {
      const errorCedula = validarCedula(cliente_cedula);
      if (errorCedula) {
        await conn.rollback();
        return res.status(400).json({ ok: false, mensaje: errorCedula });
      }
    }

    // Cliente para factura: se guarda/reutiliza en clientes (por cédula/RUC) para
    // no perder el correo/celular capturados en el formulario de facturación.
    if (tipo_cliente === 'factura' && cliente_cedula) {
      await buscarOCrearCliente(conn, {
        nombre: cliente_nombre,
        cedula: cliente_cedula,
        telefono: '',
        correo: cliente_correo || '',
        celular: cliente_celular || '',
      });
    }

    // Caja abierta (para enlazar la venta y registrar el ingreso)
    const [cajas] = await conn.query(`SELECT id FROM caja WHERE estado='abierta' ORDER BY apertura DESC LIMIT 1`);
    const cajaId = cajas.length ? cajas[0].id : 1;

    const [venta] = await conn.query(
      `INSERT INTO ventas (usuario_id, caja_id, total, tipo_pago, tipo_cliente, cliente_nombre, cliente_cedula)
       VALUES (1, ?, ?, ?, ?, ?, ?)`,
      [cajaId, total, tipo_pago, tipo_cliente || 'consumidor',
       cliente_nombre || 'CONSUMIDOR FINAL',
       cliente_cedula || '9999999999999']
    );

    for (const item of items) {
      // Bloquea la fila dentro de la transacción para evitar que dos ventas
      // simultáneas descuenten el mismo stock y lo dejen en negativo.
      const [[producto]] = await conn.query(
        `SELECT nombre, stock_actual FROM productos WHERE id = ? FOR UPDATE`,
        [item.producto_id]
      );
      if (!producto || producto.stock_actual < item.cantidad) {
        await conn.rollback();
        const disponible = producto ? producto.stock_actual : 0;
        return res.status(400).json({
          ok: false,
          mensaje: `Stock insuficiente para "${producto ? producto.nombre : 'producto'}": disponible ${disponible}, solicitado ${item.cantidad}`
        });
      }

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

    let cuentaCreada = false;
    let cajaRegistrada = false;

    if (tipo_pago === 'credito') {
      // Si no hay cliente registrado, se busca por cédula y se reutiliza; solo se
      // crea uno nuevo si de verdad no existe (evita duplicar clientes).
      let cid = cliente_id;
      if (!cid) {
        const ced = (cliente_cedula && cliente_cedula !== '9999999999999') ? cliente_cedula : '';
        const cliente = await buscarOCrearCliente(conn, {
          nombre: (cliente_nombre || '').toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase()),
          cedula: ced,
          telefono: '',
          correo: cliente_correo || '',
          celular: cliente_celular || '',
        });
        cid = cliente.id;
      }

      // Validar cupo de crédito
      const [[clienteData]] = await conn.query(
        `SELECT cupo_credito FROM clientes WHERE id = ? FOR UPDATE`,
        [cid]
      );
      if (clienteData && parseFloat(clienteData.cupo_credito) > 0) {
        // Calcular deuda pendiente actual del cliente
        const [deudaRows] = await conn.query(
          `SELECT COALESCE(SUM(saldo), 0) AS deuda_total FROM cuentas_cobrar
           WHERE cliente_id = ? AND estado IN ('pendiente', 'vencida')`,
          [cid]
        );
        const deudaActual = parseFloat(deudaRows[0].deuda_total);
        const disponible = parseFloat(clienteData.cupo_credito) - deudaActual;
        if (total > disponible) {
          await conn.rollback();
          return res.status(400).json({
            ok: false,
            mensaje: `El cliente supera su cupo de crédito. Disponible: $${disponible.toFixed(2)}`
          });
        }
      }
      // cupo_credito = 0 se interpreta como "sin límite"

      // ¿El cliente ya tiene una cuenta PENDIENTE? Si sí, se le suma; si no, se crea.
      const [pendientes] = await conn.query(
        `SELECT id, monto_total, saldo FROM cuentas_cobrar
         WHERE cliente_id = ? AND estado = 'pendiente'
         ORDER BY id DESC LIMIT 1`,
        [cid]
      );
      let idCuenta;
      if (pendientes.length > 0) {
        // Sumar esta venta a la deuda existente (una sola cuenta que crece)
        const cuenta = pendientes[0];
        const nuevoTotal = parseFloat(cuenta.monto_total) + total;
        const nuevoSaldo = parseFloat(cuenta.saldo) + total;
        await conn.query(
          `UPDATE cuentas_cobrar SET monto_total = ?, saldo = ? WHERE id = ?`,
          [nuevoTotal, nuevoSaldo, cuenta.id]
        );
        idCuenta = cuenta.id;
      } else {
        // Primera deuda del cliente: crear la cuenta a 30 días
        const venc = new Date();
        venc.setDate(venc.getDate() + 30);
        const vencimiento = venc.toISOString().slice(0, 10);
        const [insertResult] = await conn.query(
          `INSERT INTO cuentas_cobrar (cliente_id, monto_total, monto_pagado, saldo, vencimiento)
           VALUES (?, ?, 0, ?, ?)`,
          [cid, total, total, vencimiento]
        );
        idCuenta = insertResult.insertId;
      }
      // Registrar movimiento de cargo
      await conn.query(
        `INSERT INTO cuentas_cobrar_movimientos (cliente_id, tipo, descripcion, monto, venta_id)
         VALUES (?, 'cargo', ?, ?, ?)`,
        [cid, `Venta #${venta.insertId}`, total, venta.insertId]
      );
      cuentaCreada = true;
    } else if (cajas.length > 0) {
      // Efectivo / transferencia → ingreso automático en la caja abierta
      await conn.query(
        `INSERT INTO caja_movimientos (caja_id, tipo, descripcion, monto) VALUES (?, 'ingreso', ?, ?)`,
        [cajaId, `Venta #${venta.insertId} (${tipo_pago})`, total]
      );
      cajaRegistrada = true;
    }

    await conn.commit();
    res.status(201).json({ ok: true, venta_id: venta.insertId, cuentaCreada, cajaRegistrada });
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