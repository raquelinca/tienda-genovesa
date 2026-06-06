const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportesController');

router.get('/ventas', ctrl.getVentasReporte);

module.exports = router;