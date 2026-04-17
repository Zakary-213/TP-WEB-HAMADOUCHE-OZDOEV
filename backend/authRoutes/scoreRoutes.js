const express = require('express');
const router = express.Router();
const { scoreCanvas, getTopScores } = require('../controllers/scoreController');

router.post('/scorecanvas', scoreCanvas);
router.get('/top', getTopScores);


module.exports = router;