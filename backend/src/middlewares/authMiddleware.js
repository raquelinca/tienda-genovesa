const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token)
    return res.status(401).json({ ok: false, mensaje: 'Acceso denegado' });
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, mensaje: 'Token inválido' });
  }
};