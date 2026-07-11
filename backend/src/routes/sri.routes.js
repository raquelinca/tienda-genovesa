const express = require('express');
const router = express.Router();
const { consultarContribuyente } = require('../controllers/sriController');

router.get('/contribuyente/:id', consultarContribuyente);

module.exports = router;