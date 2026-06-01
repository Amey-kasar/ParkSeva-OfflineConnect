const express = require('express');
const router = express.Router();
const { createVehicle, getAllVehicles, getVehicleById, updateVehicle, deleteVehicle } = require('../../controllers/vehicle.controller');

router.post('/', createVehicle);
router.get('/', getAllVehicles);
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;