const express = require('express');
const router = express.Router();
const { generarFacturaXML, generarFacturaPDF, enviarSRI } = require('../controllers/facturaController');

router.get('/xml/:venta_id', generarFacturaXML);   // descargar XML (para firmar)
router.get('/pdf/:venta_id', generarFacturaPDF);   // RIDE en PDF
router.post('/enviar-sri/:venta_id', enviarSRI);   // firmar + enviar al SRI (flujo real)

module.exports = router;
 