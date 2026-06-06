const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuentasCobrarController');

router.get('/',  ctrl.getClientes);
router.post('/', ctrl.crearCliente);

module.exports = router;