const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ventasController');

router.get('/', ctrl.getVentas);
router.post('/', ctrl.crearVenta);

module.exports = router;