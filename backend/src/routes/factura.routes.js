const express = require('express');
const router = express.Router();
const { generarFactura, descargarXML, enviarSRI } = require('../controllers/facturaController');

router.get('/:venta_id',              generarFactura);
router.get('/xml/:venta_id',          descargarXML);
router.post('/enviar-sri/:venta_id',  enviarSRI);

module.exports = router;
 