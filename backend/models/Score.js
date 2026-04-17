const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const scoreSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    game: {
        type: String,  // e.g., 'canvas'
        required: true
    },
    mode: {
        type: String,  // 'solo' or 'duo'
        required: true
    },
    totalTime: {
        type: Number,
        required: true
    },
    totalMeteorites: {
        type: Number,
        default: 0
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Score', scoreSchema);