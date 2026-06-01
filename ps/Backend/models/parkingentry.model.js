// models/ParkingEntry.js
const mongoose = require('mongoose');

const parkingEntrySchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
    entryTime: { type: Date, default: Date.now },
    exitTime: { type: Date },
    totalHours: { type: Number },
    totalAmount: { type: Number },
    status: { type: String, enum: ['active', 'completed'], default: 'active' }
});

module.exports = mongoose.model('ParkingEntry', parkingEntrySchema);
