const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuentasCobrarController');

router.get('/',                  ctrl.getCuentas);
router.post('/',                 ctrl.crearCuenta);
router.put('/:id',               ctrl.editarCuenta);
router.delete('/:id',            ctrl.eliminarCuenta);
router.post('/:id/abonar',       ctrl.abonar);
router.get('/movimientos/:cliente_id', ctrl.getMovimientos);

module.exports = router;