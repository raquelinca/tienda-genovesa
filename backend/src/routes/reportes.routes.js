const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportesController');

router.get('/ventas',             ctrl.getVentasReporte);
router.get('/productos-vendidos', ctrl.getProductosVendidos);
router.get('/exportar-excel',     ctrl.exportarExcel);
router.get('/exportar-pdf',       ctrl.exportarPDF);

module.exports = router;