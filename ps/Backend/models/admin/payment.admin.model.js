const mongoose = require('mongoose');

const adminPaymentSchema = new mongoose.Schema({
  entryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingEntry', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = (connection) => connection.model('Payment', adminPaymentSchema);