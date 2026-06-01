const multiDB = require('../config/multidb');

const createParkingSlot = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        const { slotNumber, vehicleType, hourlyRate, status } = req.body;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const slot = new AdminParkingSlot({
            slotNumber,
            vehicleType,
            hourlyRate,
            status
        });
        
        await slot.save();
        res.status(201).json(slot);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAllParkingSlots = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const slots = await AdminParkingSlot.find();
        res.json(slots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateParkingSlot = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        const { slotNumber, status, vehicleType, hourlyRate } = req.body;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const slot = await AdminParkingSlot.findByIdAndUpdate(
            req.params.id, 
            { slotNumber, status, vehicleType, hourlyRate }, 
            { new: true }
        );
        
        if (!slot) return res.status(404).json({ error: 'Parking slot not found' });
        res.json(slot);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteParkingSlot = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const slot = await AdminParkingSlot.findByIdAndDelete(req.params.id);
        if (!slot) return res.status(404).json({ error: 'Parking slot not found' });
        res.json({ message: 'Parking slot deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAvailableSlots = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const slots = await AdminParkingSlot.find({ status: 'available' });
        res.json(slots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createParkingSlot,
    getAllParkingSlots,
    updateParkingSlot,
    deleteParkingSlot,
    getAvailableSlots
};