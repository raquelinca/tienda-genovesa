const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/productos',     require('./routes/productos.routes'));
app.use('/api/ventas',        require('./routes/ventas.routes'));
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/caja',          require('./routes/caja.routes'));
app.use('/api/cuentas-cobrar',require('./routes/cuentasCobrar.routes'));
app.use('/api/clientes',      require('./routes/clientes.routes'));
app.use('/api/categorias',    require('./routes/categorias.routes'));
app.use('/api/cuentas-pagar', require('./routes/cuentasPagar.routes'));
app.use('/api/proveedores',   require('./routes/proveedores.routes'));
app.use('/api/reportes',      require('./routes/reportes.routes'));
app.use('/api/factura', require('./routes/factura.routes'));
app.use('/api/sri',     require('./routes/sri.routes'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, mensaje: err.message });
});

module.exports = app;