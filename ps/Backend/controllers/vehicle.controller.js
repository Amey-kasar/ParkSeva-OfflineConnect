const Vehicle = require('../models/vehicle.nodel');

const createVehicle = async (req, res) => {
    try {
        const { userId, vehicleNumber, vehicleType } = req.body;
        const vehicleData = { userId, vehicleNumber, vehicleType };
        const vehicle = new Vehicle(vehicleData);
        await vehicle.save();
        await vehicle.populate('userId');
        res.status(201).json(vehicle);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAllVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find().populate('userId');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id).populate('userId');
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateVehicle = async (req, res) => {
    try {
        const { userId, vehicleNumber, vehicleType } = req.body;
        const updateData = { userId, vehicleNumber, vehicleType };
        const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('userId');
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        res.json(vehicle);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle
};