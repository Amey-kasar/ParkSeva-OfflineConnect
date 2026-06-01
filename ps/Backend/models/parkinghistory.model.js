const mongoose = require('mongoose');

const parkingHistorySchema = new mongoose.Schema({
    // Vehicle Information
    vehicleInfo: {
        vehicleNumber: { type: String, required: true },
        vehicleType: { type: String, enum: ['car', 'bike', 'truck'], required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    },
    
    // Entry Information
    entryInfo: {
        slotNumber: { type: String, required: true },
        slotType: { type: String, enum: ['car', 'bike', 'truck'], required: true },
        hourlyRate: { type: Number, required: true },
        entryTime: { type: Date, required: true },
        exitTime: { type: Date, required: true },
        totalHours: { type: Number, required: true },
        totalAmount: { type: Number, required: true }
    },
    
    // Backup timestamp
    archivedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ParkingHistory', parkingHistorySchema);