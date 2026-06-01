const ParkingEntry = require('../models/parkingentry.model');
const ParkingSlot = require('../models/parkingslot.model');
const Vehicle = require('../models/vehicle.nodel');
const ParkingHistory = require('../models/parkinghistory.model');

const parkVehicle = async (req, res) => {
    try {
        const { vehicleNumber, vehicleType, userId } = req.body;
        
        let vehicle = await Vehicle.findOne({ vehicleNumber });
        if (!vehicle) {
            vehicle = new Vehicle({
                userId,
                vehicleNumber,
                vehicleType
            });
            await vehicle.save();
        }
        
        const availableSlot = await ParkingSlot.findOne({ 
            status: 'available', 
            vehicleType 
        });
        
        if (!availableSlot) {
            return res.status(400).json({ error: 'No available slots for this vehicle type' });
        }
        
        const entry = new ParkingEntry({
            vehicleId: vehicle._id,
            slotId: availableSlot._id,
            entryTime: new Date(),
            status: 'active'
        });
        
        availableSlot.status = 'occupied';
        
        await Promise.all([entry.save(), availableSlot.save()]);
        await entry.populate(['vehicleId', 'slotId']);
        
        res.status(201).json(entry);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const exitVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        
        const entry = await ParkingEntry.findById(id).populate(['vehicleId', 'slotId']);
        if (!entry) {
            return res.status(404).json({ error: 'Parking entry not found' });
        }
        
        if (entry.status === 'completed') {
            return res.status(400).json({ error: 'Vehicle already exited' });
        }
        
        const exitTime = new Date();
        const totalHours = Math.ceil((exitTime - entry.entryTime) / (1000 * 60 * 60));
        const totalAmount = totalHours * entry.slotId.hourlyRate;
        
        // Create backup record in parking history
        const historyRecord = new ParkingHistory({
            vehicleInfo: {
                vehicleNumber: entry.vehicleId.vehicleNumber,
                vehicleType: entry.vehicleId.vehicleType,
                userId: entry.vehicleId.userId
            },
            entryInfo: {
                slotNumber: entry.slotId.slotNumber,
                slotType: entry.slotId.vehicleType,
                hourlyRate: entry.slotId.hourlyRate,
                entryTime: entry.entryTime,
                exitTime: exitTime,
                totalHours: totalHours,
                totalAmount: totalAmount
            }
        });
        
        // Free the slot
        entry.slotId.status = 'available';
        
        // Save history and update slot, then delete entry
        await Promise.all([
            historyRecord.save(),
            entry.slotId.save()
        ]);
        
        // Delete the parking entry after backing up
        await ParkingEntry.findByIdAndDelete(id);
        
        res.json({
            message: 'Vehicle exited successfully',
            totalAmount: totalAmount,
            totalHours: totalHours,
            historyId: historyRecord._id,
            requiresPayment: true
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAllParkingEntries = async (req, res) => {
    try {
        const entries = await ParkingEntry.find().populate(['vehicleId', 'slotId']);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getParkingEntryById = async (req, res) => {
    try {
        const entry = await ParkingEntry.findById(req.params.id).populate(['vehicleId', 'slotId']);
        if (!entry) return res.status(404).json({ error: 'Parking entry not found' });
        res.json(entry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getActiveEntries = async (req, res) => {
    try {
        const entries = await ParkingEntry.find({ status: 'active' }).populate(['vehicleId', 'slotId']);
        res.json(entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const exitVehicleByNumber = async (req, res) => {
    try {
        const { vehicleNumber } = req.body;
        
        const vehicle = await Vehicle.findOne({ vehicleNumber });
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        
        const entry = await ParkingEntry.findOne({ 
            vehicleId: vehicle._id, 
            status: 'active' 
        }).populate(['vehicleId', 'slotId']);
        
        if (!entry) {
            return res.status(404).json({ error: 'No active parking entry found for this vehicle' });
        }
        
        const exitTime = new Date();
        const totalHours = Math.ceil((exitTime - entry.entryTime) / (1000 * 60 * 60));
        const totalAmount = totalHours * entry.slotId.hourlyRate;
        
        // Create backup record in parking history
        const historyRecord = new ParkingHistory({
            vehicleInfo: {
                vehicleNumber: entry.vehicleId.vehicleNumber,
                vehicleType: entry.vehicleId.vehicleType,
                userId: entry.vehicleId.userId
            },
            entryInfo: {
                slotNumber: entry.slotId.slotNumber,
                slotType: entry.slotId.vehicleType,
                hourlyRate: entry.slotId.hourlyRate,
                entryTime: entry.entryTime,
                exitTime: exitTime,
                totalHours: totalHours,
                totalAmount: totalAmount
            }
        });
        
        // Free the slot
        entry.slotId.status = 'available';
        
        // Save history and update slot, then delete entry
        await Promise.all([
            historyRecord.save(),
            entry.slotId.save()
        ]);
        
        // Delete the parking entry after backing up
        await ParkingEntry.findByIdAndDelete(entry._id);
        
        res.json({
            message: 'Vehicle exited successfully',
            vehicleNumber: vehicleNumber,
            totalAmount: totalAmount,
            totalHours: totalHours,
            historyId: historyRecord._id,
            requiresPayment: true
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteParkingEntry = async (req, res) => {
    try {
        const entry = await ParkingEntry.findByIdAndDelete(req.params.id);
        if (!entry) return res.status(404).json({ error: 'Parking entry not found' });
        res.json({ message: 'Parking entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    parkVehicle,
    exitVehicle,
    exitVehicleByNumber,
    getAllParkingEntries,
    getParkingEntryById,
    getActiveEntries,
    deleteParkingEntry
};