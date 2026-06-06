 const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuentasPagarController');

router.get('/',            ctrl.getCuentas);
router.post('/',           ctrl.crearCuenta);
router.put('/:id',         ctrl.editarCuenta);
router.delete('/:id',      ctrl.eliminarCuenta);
router.post('/:id/abonar', ctrl.abonar);

module.exports = router;
