const express = require('express');
const router = express.Router();
const { 
    createAdminLocation, 
    getAdminLocation, 
    getAllLocations, 
    updateAdminLocation 
} = require('../../controllers/adminlocation.controller');

router.post('/', createAdminLocation);
router.get('/all', getAllLocations);
router.get('/:adminId', getAdminLocation);
router.put('/:adminId', updateAdminLocation);

module.exports = router;