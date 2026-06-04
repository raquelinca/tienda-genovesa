 const db = require('../config/db');

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
    const { nombre } = req.body;
    await db.query(
      `INSERT INTO categorias (nombre) VALUES (?)`,
      [nombre.toUpperCase()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, mensaje: err.message });
  }
};

const editarCategoria = async (req, res) => {
  try {
    const { nombre } = req.body;
    await db.query(
      `UPDATE categorias SET nombre=? WHERE id=?`,
      [nombre.toUpperCase(), req.params.id]
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
