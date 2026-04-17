const mongoose = require('mongoose');
const CanvasProfile = require('../models/CanvasProfile');

const DEFAULT_PROFILE = {
    gold: 0,
    ownedShips: ['normal'],
    equippedShip: 'normal'
};

function normalizeProfileInput(input = {}) {
    const ships = Array.isArray(input.ownedShips) ? input.ownedShips.filter((s) => typeof s === 'string' && s.trim() !== '') : [];
    const uniqueShips = Array.from(new Set(ships));

    if (!uniqueShips.includes('normal')) {
        uniqueShips.unshift('normal');
    }

    const equippedShip = typeof input.equippedShip === 'string' && uniqueShips.includes(input.equippedShip)
        ? input.equippedShip
        : 'normal';

    const safeGold = Number.isFinite(Number(input.gold)) ? Math.max(0, Number(input.gold)) : 0;

    return {
        gold: safeGold,
        ownedShips: uniqueShips,
        equippedShip
    };
}

// @desc    Get Canvas profile by user
// @route   GET /api/canvas-profile?userId=...
// @access  Public (scoped by provided userId, same pattern as scores)
exports.getCanvasProfile = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Missing userId query param' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }

        const profile = await CanvasProfile.findOne({ user: userId }).lean();

        if (!profile) {
            return res.status(200).json({
                success: true,
                data: DEFAULT_PROFILE
            });
        }

        const normalized = normalizeProfileInput(profile);

        return res.status(200).json({
            success: true,
            data: normalized
        });
    } catch (error) {
        console.error('Error fetching canvas profile:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Save or update Canvas profile
// @route   POST /api/canvas-profile
// @access  Public (scoped by provided userId, same pattern as scores)
exports.saveCanvasProfile = async (req, res) => {
    try {
        const { userId, gold, ownedShips, equippedShip } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Missing userId' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }

        const normalized = normalizeProfileInput({ gold, ownedShips, equippedShip });

        const updated = await CanvasProfile.findOneAndUpdate(
            { user: userId },
            {
                user: userId,
                ...normalized
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        return res.status(200).json({
            success: true,
            message: 'Canvas profile saved successfully',
            data: normalizeProfileInput(updated)
        });
    } catch (error) {
        console.error('Error saving canvas profile:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
