// models/Bill.js
const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    billNumber: { type: String, required: true, unique: true },
    generatedAt: { type: Date, default: Date.now },
    billUrl: { type: String },
    status: { type: String, enum: ['issued', 'cancelled'], default: 'issued' }
});

module.exports = mongoose.model('Bill', billSchema);
