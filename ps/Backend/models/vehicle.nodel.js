// models/Vehicle.js
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleNumber: { type: String, required: true, unique: true },
    vehicleType: { type: String, enum: ['car', 'bike', 'truck'], required: true }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
