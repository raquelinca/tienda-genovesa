const db = require('../config/db');
const { validarTexto } = require('../utils/validadores');

const getCategorias = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM categorias ORDER BY nombre`);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const crearCategoria = async (req, res) => {
  try {
    const error = validarTexto(req.body.nombre, { min: 2, max: 60, campo: 'El nombre de la categoría' });
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    const nombre = req.body.nombre.trim().toUpperCase();
    await db.query(`INSERT INTO categorias (nombre) VALUES (?)`, [nombre]);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, mensaje: 'Esa categoría ya existe.' });
    }
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ ok: false, mensaje: 'La tabla "categorias" no existe en la base de datos.' });
    }
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const editarCategoria = async (req, res) => {
  try {
    const error = validarTexto(req.body.nombre, { min: 2, max: 60, campo: 'El nombre de la categoría' });
    if (error) return res.status(400).json({ ok: false, mensaje: error });
    const nombre = req.body.nombre.trim().toUpperCase();
    await db.query(
      `UPDATE categorias SET nombre=? WHERE id=?`,
      [nombre, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const eliminarCategoria = async (req, res) => {
  try {
    await db.query(`DELETE FROM categorias WHERE id=?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

module.exports = { getCategorias, crearCategoria, editarCategoria, eliminarCategoria };