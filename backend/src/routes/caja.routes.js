const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cajaController');

router.get('/activa',      ctrl.getCajaActiva);
router.post('/abrir',      ctrl.abrirCaja);
router.post('/movimiento', ctrl.registrarMovimiento);
router.post('/cerrar',     ctrl.cerrarCaja);

module.exports = router;