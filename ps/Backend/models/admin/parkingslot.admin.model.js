const mongoose = require('mongoose');

const adminParkingSlotSchema = new mongoose.Schema({
  slotNumber: { type: String, required: true, unique: true },
  status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
  vehicleType: { type: String, enum: ['car', 'bike', 'truck'], required: true },
  hourlyRate: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = (connection) => connection.model('ParkingSlot', adminParkingSlotSchema);