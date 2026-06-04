 const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuentasCobrarController');

router.get('/', ctrl.getClientes);

module.exports = router;