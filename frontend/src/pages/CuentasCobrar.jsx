 const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuentasCobrarController');

router.get('/',           ctrl.getCuentas);
router.post('/',          ctrl.crearCuenta);
router.post('/:id/abonar', ctrl.abonar);

module.exports = router;
