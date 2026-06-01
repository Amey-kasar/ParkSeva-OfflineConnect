const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    room: { type: String, default: 'general' }
});

module.exports = mongoose.model('Chat', chatSchema);