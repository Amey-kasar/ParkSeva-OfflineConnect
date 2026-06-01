const multiDB = require('../config/multidb');

const createPayment = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        const { entryId, amount, paymentMethod, transactionId } = req.body;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminPayment = require('../models/admin/payment.admin.model')(adminConnection);
        
        const payment = new AdminPayment({
            entryId,
            amount,
            paymentMethod,
            transactionId,
            status: 'completed'
        });
        
        await payment.save();
        res.status(201).json(payment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getPayments = async (req, res) => {
    try {
        const adminId = req.user.adminId;
        
        const adminConnection = await multiDB.getAdminConnection(adminId);
        const AdminPayment = require('../models/admin/payment.admin.model')(adminConnection);
        
        const payments = await AdminPayment.find().populate('entryId').sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createPayment,
    getPayments
};