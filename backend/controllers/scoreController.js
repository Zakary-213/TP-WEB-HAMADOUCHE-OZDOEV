const Score = require('../models/Score');

const createScoreRecord = async ({ userId, game, mode, totalTime, totalValue, data }) => {
    return Score.create({
        user: userId,
        game,
        mode,
        totalTime,
        // Le schema historique utilise ce champ pour une métrique totale.
        totalMeteorites: totalValue,
        data
    });
};

// @desc    Save Canvas Score
// @route   POST /api/scores/scorecanvas
// @access  Private (should be, but here we'll handle based on body user)
exports.scoreCanvas = async (req, res) => {
    try {
        const { userId, game, mode, totalTime, totalMeteorites, data } = req.body;

        if (!userId || !game || !mode || totalTime === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const newScore = await createScoreRecord({
            userId,
            game,
            mode,
            totalTime,
            totalValue: totalMeteorites,
            data
        });

        res.status(201).json({
            success: true,
            message: 'Score saved successfully',
            data: newScore
        });
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Save GamesOnWeb Match Result
// @route   POST /api/scores/scoregow
// @access  Private (should be, but here we'll handle based on body user)
exports.scoreGow = async (req, res) => {
    try {
        const {
            userId,
            game = 'gamesonweb',
            mode = '1v1',
            totalTime,
            totalButs,
            data
        } = req.body;

        if (!userId || totalTime === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const newScore = await createScoreRecord({
            userId,
            game,
            mode,
            totalTime,
            totalValue: Number(totalButs || data?.totalButs || 0),
            data: data || {}
        });

        res.status(201).json({
            success: true,
            message: 'GamesOnWeb score saved successfully',
            data: newScore
        });
    } catch (error) {
        console.error('Error saving gamesonweb score:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get Top Scores
// @route   GET /api/scores/top?game=canvas&mode=solo
// @access  Public
exports.getTopScores = async (req, res) => {
    try {
        const { game, mode, userId } = req.query;

        if (!game || !mode) {
            return res.status(400).json({ success: false, message: 'Missing game or mode query param' });
        }

        const limit = Math.max(1, Math.min(parseInt(req.query.limit || '10', 10), 100));
        const query = { game, mode };

        if (userId) {
            query.user = userId;
        }

        // Get top scores, sorted by totalTime ascending (faster is better)
        const scores = await Score.find(query)
            .sort({ totalTime: 1 })
            .limit(limit)
            .populate('user', 'username');

        res.status(200).json({
            success: true,
            count: scores.length,
            data: scores
        });
    } catch (error) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
