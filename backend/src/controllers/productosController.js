const db = require('../config/db');

const getProductos = async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM productos WHERE activo=1 ORDER BY nombre'
  );
  res.json({ ok: true, data: rows });
};

const crearProducto = async (req, res) => {
  const { nombre, categoria, precio_venta,
          precio_compra, stock_actual, stock_minimo } = req.body;
  const [r] = await db.query(
    `INSERT INTO productos
     (nombre,categoria,precio_venta,precio_compra,stock_actual,stock_minimo)
     VALUES (?,?,?,?,?,?)`,
    [nombre, categoria, precio_venta, precio_compra,
     stock_actual ?? 0, stock_minimo ?? 5]
  );
  res.status(201).json({ ok: true, id: r.insertId });
};

const actualizarProducto = async (req, res) => {
  const { nombre, categoria, precio_venta,
          precio_compra, stock_actual, stock_minimo } = req.body;
  await db.query(
    `UPDATE productos SET nombre=?,categoria=?,
     precio_venta=?,precio_compra=?,
     stock_actual=?,stock_minimo=? WHERE id=?`,
    [nombre, categoria, precio_venta, precio_compra,
     stock_actual, stock_minimo, req.params.id]
  );
  res.json({ ok: true });
};

const eliminarProducto = async (req, res) => {
  await db.query(
    'UPDATE productos SET activo=0 WHERE id=?',
    [req.params.id]
  );
  res.json({ ok: true });
};

const getAlertas = async (req, res) => {
  const [rows] = await db.query(`
    SELECT id, nombre, stock_actual, stock_minimo,
    CASE
      WHEN stock_actual = 0 THEN 'sin_stock'
      WHEN stock_actual <= FLOOR(stock_minimo*0.5) THEN 'critico'
      ELSE 'bajo'
    END AS nivel
    FROM productos
    WHERE stock_actual <= stock_minimo AND activo=1
    ORDER BY stock_actual ASC`
  );
  res.json({ ok: true, data: rows });
};

module.exports = {
  getProductos, crearProducto,
  actualizarProducto, eliminarProducto, getAlertas
};