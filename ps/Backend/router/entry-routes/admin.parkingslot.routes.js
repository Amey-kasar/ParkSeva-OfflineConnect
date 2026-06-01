const express = require('express');
const router = express.Router();

try {
    const { 
        createParkingSlot, 
        getAllParkingSlots, 
        updateParkingSlot, 
        deleteParkingSlot, 
        getAvailableSlots 
    } = require('../../controllers/admin.parkingslot.controller');
    
    const auth = require('../../middleware/auth');
    
    console.log('Admin parking slot routes loaded successfully');
    
    router.post('/', auth, createParkingSlot);
    router.get('/', auth, getAllParkingSlots);
    router.get('/available', auth, getAvailableSlots);
    router.put('/:id', auth, updateParkingSlot);
    router.delete('/:id', auth, deleteParkingSlot);
    
} catch (error) {
    console.error('Error loading admin parking slot routes:', error);
}

module.exports = router;