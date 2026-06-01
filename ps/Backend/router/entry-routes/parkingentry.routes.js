const express = require('express');
const router = express.Router();
const { parkVehicle, exitVehicle, exitVehicleByNumber, getAllParkingEntries, getParkingEntryById, getActiveEntries, deleteParkingEntry } = require('../../controllers/parkingentry.controller');

router.post('/park', parkVehicle);
router.put('/exit/:id', exitVehicle);
router.post('/exit-by-vehicle', exitVehicleByNumber);
router.get('/', getAllParkingEntries);
router.get('/:id', getParkingEntryById);
router.get('/status/active', getActiveEntries);
router.delete('/:id', deleteParkingEntry);

module.exports = router;