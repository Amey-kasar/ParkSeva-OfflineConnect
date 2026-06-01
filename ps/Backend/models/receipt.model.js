const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
    receiptNumber: { type: String, required: true, unique: true },
    vehicleNumber: { type: String, required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    entryTime: { type: Date, required: true },
    exitTime: { type: Date, required: true },
    duration: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    pdfBuffer: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Receipt', receiptSchema);