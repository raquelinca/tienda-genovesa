const express = require('express');
const router = express.Router();
const { generarFactura, descargarXML } = require('../controllers/facturaController');

router.get('/:venta_id',       generarFactura);
router.get('/xml/:venta_id',   descargarXML);

module.exports = router;
 