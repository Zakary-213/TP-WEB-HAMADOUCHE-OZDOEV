const express = require('express');
const router = express.Router();
const { getCanvasProfile, saveCanvasProfile } = require('../controllers/canvasProfileController');

router.get('/', getCanvasProfile);
router.post('/', saveCanvasProfile);

module.exports = router;
