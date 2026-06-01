const multiDB = require('../config/multidb');

const parkVehicle = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        const { vehicleNumber, slotId, vehicleType } = req.body;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingEntry = require('../models/admin/parkingentry.admin.model')(adminConnection);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        let assignedSlotId = slotId;
        
        // If no slotId provided, find available slot
        if (!assignedSlotId) {
            const availableSlot = await AdminParkingSlot.findOne({ 
                status: 'available',
                ...(vehicleType && { vehicleType })
            });
            
            if (!availableSlot) {
                return res.status(400).json({ error: 'No available slots found' });
            }
            
            assignedSlotId = availableSlot._id;
        }
        
        await AdminParkingSlot.findByIdAndUpdate(assignedSlotId, { status: 'occupied' });
        
        const entry = new AdminParkingEntry({
            vehicleNumber,
            slotId: assignedSlotId,
            entryTime: new Date()
        });
        
        await entry.save();
        await entry.populate('slotId');
        res.status(201).json(entry);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const exitVehicle = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        const { entryId } = req.params;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingEntry = require('../models/admin/parkingentry.admin.model')(adminConnection);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const entry = await AdminParkingEntry.findById(entryId).populate('slotId');
        if (!entry) return res.status(404).json({ error: 'Entry not found' });
        
        const exitTime = new Date();
        const duration = (exitTime - entry.entryTime) / (1000 * 60 * 60);
        const totalAmount = Math.ceil(duration) * entry.slotId.hourlyRate;
        
        entry.exitTime = exitTime;
        entry.status = 'completed';
        entry.totalAmount = totalAmount;
        await entry.save();
        
        await AdminParkingSlot.findByIdAndUpdate(entry.slotId, { status: 'available' });
        
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const exitVehicleByNumber = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        const { vehicleNumber } = req.body;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingEntry = require('../models/admin/parkingentry.admin.model')(adminConnection);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const entry = await AdminParkingEntry.findOne({ 
            vehicleNumber, 
            status: 'active' 
        }).populate('slotId');
        
        if (!entry) return res.status(404).json({ error: 'Active entry not found' });
        
        const exitTime = new Date();
        const duration = (exitTime - entry.entryTime) / (1000 * 60 * 60);
        const totalAmount = Math.ceil(duration) * entry.slotId.hourlyRate;
        
        entry.exitTime = exitTime;
        entry.status = 'completed';
        entry.totalAmount = totalAmount;
        await entry.save();
        
        await AdminParkingSlot.findByIdAndUpdate(entry.slotId, { status: 'available' });
        
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getActiveEntries = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        console.log('Getting active entries for adminId:', adminId);
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingEntry = require('../models/admin/parkingentry.admin.model')(adminConnection);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const entries = await AdminParkingEntry.find({ status: 'active' }).populate('slotId');
        console.log('Found active entries:', entries.length);
        res.json(entries);
    } catch (error) {
        console.error('Error getting active entries:', error);
        res.status(500).json({ error: error.message });
    }
};

const getAllEntries = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminParkingEntry = require('../models/admin/parkingentry.admin.model')(adminConnection);
        const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
        
        const entries = await AdminParkingEntry.find().populate('slotId').sort({ createdAt: -1 });
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    parkVehicle,
    exitVehicle,
    exitVehicleByNumber,
    getActiveEntries,
    getAllEntries
};