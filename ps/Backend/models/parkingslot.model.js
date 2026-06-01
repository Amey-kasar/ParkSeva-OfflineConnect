const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  slotNumber: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
  vehicleType: { type: String, enum: ['car', 'bike', 'truck'], required: true },
  hourlyRate: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique slot numbers per admin
parkingSlotSchema.index({ slotNumber: 1, adminId: 1 }, { unique: true });

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
