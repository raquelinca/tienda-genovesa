const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/productosController');

router.get('/',        auth, ctrl.getProductos);
router.get('/alertas', auth, ctrl.getAlertas);
router.post('/',       auth, ctrl.crearProducto);
router.put('/:id',     auth, ctrl.actualizarProducto);
router.delete('/:id',  auth, ctrl.eliminarProducto);

module.exports = router;