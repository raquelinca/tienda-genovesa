 const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categoriasController');

router.get('/',        ctrl.getCategorias);
router.post('/',       ctrl.crearCategoria);
router.put('/:id',     ctrl.editarCategoria);
router.delete('/:id',  ctrl.eliminarCategoria);

module.exports = router;
