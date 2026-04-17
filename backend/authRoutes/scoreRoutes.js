const express = require('express');
const router = express.Router();
const { scoreCanvas, scoreGow, getTopScores } = require('../controllers/scoreController');

router.post('/scorecanvas', scoreCanvas);
router.post('/scoregow', scoreGow);
router.get('/top', getTopScores);


module.exports = router;