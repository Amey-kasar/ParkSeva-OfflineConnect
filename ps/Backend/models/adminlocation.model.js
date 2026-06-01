const mongoose = require('mongoose');

const adminLocationSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    locationName: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    contactInfo: {
        phone: { type: String, required: true },
        email: { type: String }
    },
    operatingHours: {
        open: { type: String, required: true },
        close: { type: String, required: true }
    },
    totalSlots: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminLocation', adminLocationSchema);