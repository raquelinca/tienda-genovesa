const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/productos',
  require('./routes/productos.routes'));

module.exports = app;