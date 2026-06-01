require('dotenv').config();
const mongoose = require('mongoose');
const ParkingSlot = require('./models/parkingslot.model');

const createTestSlots = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parkease');
        
        // Check existing slots
        const existingSlots = await ParkingSlot.find();
        console.log('Existing slots:', existingSlots.map(s => ({ slotNumber: s.slotNumber, vehicleType: s.vehicleType, status: s.status })));
        
        if (existingSlots.length >= 12) {
            console.log('Sufficient slots already exist');
            return;
        }
        
        // Create test parking slots
        const slots = [
            // Car slots
            { slotNumber: 'C001', vehicleType: 'car', hourlyRate: 50 },
            { slotNumber: 'C002', vehicleType: 'car', hourlyRate: 50 },
            { slotNumber: 'C003', vehicleType: 'car', hourlyRate: 50 },
            { slotNumber: 'C004', vehicleType: 'car', hourlyRate: 50 },
            { slotNumber: 'C005', vehicleType: 'car', hourlyRate: 50 },
            
            // Bike slots
            { slotNumber: 'B001', vehicleType: 'bike', hourlyRate: 20 },
            { slotNumber: 'B002', vehicleType: 'bike', hourlyRate: 20 },
            { slotNumber: 'B003', vehicleType: 'bike', hourlyRate: 20 },
            { slotNumber: 'B004', vehicleType: 'bike', hourlyRate: 20 },
            { slotNumber: 'B005', vehicleType: 'bike', hourlyRate: 20 },
            
            // Truck slots
            { slotNumber: 'T001', vehicleType: 'truck', hourlyRate: 100 },
            { slotNumber: 'T002', vehicleType: 'truck', hourlyRate: 100 }
        ];
        
        await ParkingSlot.insertMany(slots);
        console.log(`${slots.length} parking slots created successfully`);
        
    } catch (error) {
        console.error('Error creating parking slots:', error);
    } finally {
        mongoose.connection.close();
    }
};

createTestSlots();