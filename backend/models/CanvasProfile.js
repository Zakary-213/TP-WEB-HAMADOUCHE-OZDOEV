const mongoose = require('mongoose');

const canvasProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    gold: {
        type: Number,
        default: 0
    },
    ownedShips: {
        type: [String],
        default: ['normal']
    },
    equippedShip: {
        type: String,
        default: 'normal'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CanvasProfile', canvasProfileSchema);
