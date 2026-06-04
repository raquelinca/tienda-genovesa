const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cuentasPagarController');

router.get('/',      ctrl.getProveedores);
router.post('/',     ctrl.crearProveedor);
router.put('/:id',   ctrl.editarProveedor);
router.delete('/:id', ctrl.eliminarProveedor);

module.exports = router;