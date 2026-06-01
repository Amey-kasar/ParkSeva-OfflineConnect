const express = require('express');
const router = express.Router();
const { createParkingSlot, getAllParkingSlots, getParkingSlotById, updateParkingSlot, deleteParkingSlot, getAvailableSlots } = require('../../controllers/parkingslot.controller');

router.post('/', createParkingSlot);
router.get('/', getAllParkingSlots);
router.get('/:id', getParkingSlotById);
router.put('/:id', updateParkingSlot);
router.delete('/:id', deleteParkingSlot);
router.get('/status/available', getAvailableSlots);

module.exports = router;