const User = require('../models/user.model');
const AdminLocation = require('../models/adminlocation.model');
const ParkingSlot = require('../models/parkingslot.model');
const multiDB = require('../config/multidb');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
};

const register = async (req, res) => {
    try {
        const { name, phoneNumber, email, password, role, locationData } = req.body;
        const userData = { name, phoneNumber, email, password, role };
        const user = new User(userData);
        await user.save();
        
        // If admin registration, create location data and separate database
        if (role === 'admin' && locationData) {
            const adminLocation = new AdminLocation({
                adminId: user._id,
                ...locationData
            });
            await adminLocation.save();
            
            // Create admin-specific database and default slots
            const adminConnection = await multiDB.getAdminConnection(user._id);
            const AdminParkingSlot = require('../models/admin/parkingslot.admin.model')(adminConnection);
            
            const defaultSlots = [];
            for (let i = 1; i <= 10; i++) {
                defaultSlots.push({
                    slotNumber: `A${i.toString().padStart(2, '0')}`,
                    vehicleType: 'car',
                    hourlyRate: 50
                });
            }
            await AdminParkingSlot.insertMany(defaultSlots);
            
            // Update total slots count
            await AdminLocation.findOneAndUpdate(
                { adminId: user._id },
                { totalSlots: defaultSlots.length }
            );
        }
        
        const token = generateToken(user._id);
        const { password: _, ...userWithoutPassword } = user.toObject();
        
        res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        console.log('Login attempt:', { phoneNumber, password: password ? 'provided' : 'missing' });
        
        const user = await User.findOne({ phoneNumber });
        console.log('User found:', user ? 'yes' : 'no');
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isMatch = await user.comparePassword(password);
        console.log('Password match:', isMatch);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = generateToken(user._id);
        const { password: _, ...userWithoutPassword } = user.toObject();
        
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { name, phoneNumber, email, role } = req.body;
        const updateData = { name, phoneNumber, email, role };
        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, phoneNumber, email, password, role } = req.body;
        const userData = { name, phoneNumber, email, password, role };
        const user = new User(userData);
        await user.save();
        
        const { password: _, ...userWithoutPassword } = user.toObject();
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('walletBalance');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ walletBalance: user.walletBalance || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addWalletFunds = async (req, res) => {
    try {
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.walletBalance = (user.walletBalance || 0) + amount;
        await user.save();

        res.json({
            message: 'Wallet funds added successfully',
            walletBalance: user.walletBalance
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    register,
    login,
    getAllUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    getWalletBalance,
    addWalletFunds
};
