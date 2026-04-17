const express = require('express');
const router = express.Router();
const { getCanvasProfile, saveCanvasProfile } = require('../controllers/canvasProfileController');

router.get('/scoregow', getCanvasProfile);
router.post('/scoregow', saveCanvasProfile);

module.exports = router;
