const AdminLocation = require('../models/adminlocation.model');
const User = require('../models/user.model');

const createAdminLocation = async (req, res) => {
    try {
        const { adminId, locationName, address, coordinates, contactInfo, operatingHours } = req.body;
        
        // Verify admin exists
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'admin') {
            return res.status(400).json({ error: 'Invalid admin ID' });
        }

        const adminLocation = new AdminLocation({
            adminId,
            locationName,
            address,
            coordinates,
            contactInfo,
            operatingHours
        });

        await adminLocation.save();
        res.status(201).json(adminLocation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAdminLocation = async (req, res) => {
    try {
        const { adminId } = req.params;
        const location = await AdminLocation.findOne({ adminId }).populate('adminId', 'name email phoneNumber');
        
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        
        res.json(location);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllLocations = async (req, res) => {
    try {
        const locations = await AdminLocation.find({ isActive: true })
            .populate('adminId', 'name phoneNumber')
            .select('locationName address coordinates contactInfo operatingHours totalSlots');
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateAdminLocation = async (req, res) => {
    try {
        const { adminId } = req.params;
        const updateData = req.body;
        
        const location = await AdminLocation.findOneAndUpdate(
            { adminId },
            updateData,
            { new: true }
        );
        
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        
        res.json(location);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createAdminLocation,
    getAdminLocation,
    getAllLocations,
    updateAdminLocation
};