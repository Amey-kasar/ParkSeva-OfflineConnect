const express = require('express');
const router = express.Router();
const syncUserController = require('../../controllers/sync.user.controller');
const syncVehicleController = require('../../controllers/sync.vehicle.controller');
const syncParkingEntryController = require('../../controllers/sync.parkingentry.controller');
const syncController = require('../../controllers/sync.controller');
const fallbackSync = require('../../sync/fallback');

// Manual sync trigger
router.post('/run', async (req, res) => {
    try {
        const { direction } = req.body;
        
        if (direction === 'local-to-cloud' || direction === 'both') {
            await fallbackSync.syncLocalToCloud();
        }
        
        if (direction === 'cloud-to-local' || direction === 'both') {
            await fallbackSync.syncCloudToLocal();
        }
        
        res.json({ 
            status: 'success', 
            message: `Manual sync completed: ${direction}`,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// Sync status endpoint
router.get('/status', (req, res) => {
    const syncDb = require('../../sync/db');
    res.json({
        localConnected: syncDb.getLocalConnection()?.readyState === 1,
        cloudConnected: syncDb.isCloudAvailable(),
        syncMode: 'fallback',
        lastSync: fallbackSync.lastSyncTime
    });
});

// User routes
router.post('/users/register', syncUserController.register);
router.post('/users/login', syncUserController.login);
router.get('/users', syncUserController.getUsers);
router.post('/users', syncUserController.createUser);
router.delete('/users/:id', syncUserController.deleteUser);

// Vehicle routes
router.get('/vehicles', syncVehicleController.getVehicles);
router.post('/vehicles', syncVehicleController.createVehicle);
router.put('/vehicles/:id', syncVehicleController.updateVehicle);
router.delete('/vehicles/:id', syncVehicleController.deleteVehicle);

// Parking Entry routes
router.post('/parking-entries/park', syncParkingEntryController.parkVehicle);
router.put('/parking-entries/exit/:id', syncParkingEntryController.exitVehicle);
router.get('/parking-entries/active', syncParkingEntryController.getActiveEntries);
router.get('/parking-entries', syncParkingEntryController.getAllEntries);

// Generic routes for other models
router.get('/parking-slots', (req, res) => syncController.findAll('ParkingSlot', {}, res));
router.post('/parking-slots', (req, res) => syncController.create('ParkingSlot', req.body, res));
router.put('/parking-slots/:id', (req, res) => syncController.update('ParkingSlot', req.params.id, req.body, res));
router.delete('/parking-slots/:id', (req, res) => syncController.delete('ParkingSlot', req.params.id, res));

router.get('/payments', (req, res) => syncController.findAll('Payment', {}, res));
router.post('/payments', (req, res) => syncController.create('Payment', req.body, res));
router.put('/payments/:id', (req, res) => syncController.update('Payment', req.params.id, req.body, res));

router.get('/admin-locations', (req, res) => syncController.findAll('AdminLocation', {}, res));
router.post('/admin-locations', (req, res) => syncController.create('AdminLocation', req.body, res));
router.put('/admin-locations/:id', (req, res) => syncController.update('AdminLocation', req.params.id, req.body, res));

router.get('/chat', (req, res) => syncController.findAll('Chat', {}, res));
router.post('/chat', (req, res) => syncController.create('Chat', req.body, res));

module.exports = router;