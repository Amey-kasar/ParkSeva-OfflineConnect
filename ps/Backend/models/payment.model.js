// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true },
    paymentMethod: { type: String, enum: ['razorpay', 'cash', 'wallet'], required: true },
    transactionId: { type: String }, // Transaction ID or null for cash
    razorpayOrderId: { type: String }, // Razorpay order ID
    razorpayPaymentId: { type: String }, // Razorpay payment ID
    razorpaySignature: { type: String }, // Razorpay signature for verification
    amountPaid: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    paymentDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
