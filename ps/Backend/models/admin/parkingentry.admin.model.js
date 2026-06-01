const mongoose = require('mongoose');

const adminParkingEntrySchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  totalAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = (connection) => connection.model('ParkingEntry', adminParkingEntrySchema);