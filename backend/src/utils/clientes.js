// Busca un cliente por cédula/RUC y lo reutiliza; solo crea uno nuevo si no existe.
// Apoyado en el índice único uq_clientes_cedula (clientes.cedula), así que es seguro
// aunque dos peticiones casi simultáneas intenten crear la misma cédula a la vez.
async function buscarOCrearCliente(conn, { nombre, cedula, telefono }) {
  const ced = (cedula || '').trim() || null; // '' -> NULL (permite varios clientes sin cédula)
  if (ced) {
    const [existe] = await conn.query('SELECT id, nombre FROM clientes WHERE cedula = ? LIMIT 1', [ced]);
    if (existe.length > 0) return { id: existe[0].id, existente: true, nombre: existe[0].nombre };
  }
  const [r] = await conn.query(
    'INSERT INTO clientes (nombre, cedula, telefono) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
    [nombre, ced, telefono || '']
  );
  return { id: r.insertId, existente: false };
}

module.exports = { buscarOCrearCliente };
