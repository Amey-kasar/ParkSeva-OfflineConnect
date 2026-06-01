const Payment = require('../models/payment.model');
const User = require('../models/user.model');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, vehicleNumber } = req.body;
        
        // Check if Razorpay credentials are properly configured
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(400).json({ error: 'Razorpay credentials not configured' });
        }
        
        const options = {
            amount: amount * 100, // Convert to paise
            currency: 'INR',
            receipt: `receipt_${vehicleNumber}_${Date.now()}`
        };
        
        const order = await razorpay.orders.create(options);
        res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        // Return mock order for testing if Razorpay fails
        const mockOrder = {
            orderId: `order_mock_${Date.now()}`,
            amount: req.body.amount * 100,
            currency: 'INR'
        };
        res.json(mockOrder);
    }
};

const verifyPayment = async (req, res) => {
    try {
        console.log('Payment verification request:', req.body);
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, vehicleNumber, amountPaid } = req.body;
        
        if (!vehicleNumber || !amountPaid) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        
        // Always accept payments for testing
        const payment = new Payment({
            vehicleNumber,
            paymentMethod: 'razorpay',
            razorpayOrderId: razorpay_order_id || `order_mock_${Date.now()}`,
            razorpayPaymentId: razorpay_payment_id || `pay_mock_${Date.now()}`,
            razorpaySignature: razorpay_signature || 'mock_signature',
            amountPaid: amountPaid / 100,
            paymentStatus: 'completed'
        });
        
        await payment.save();
        console.log('Payment saved successfully:', payment._id);
        res.json({ success: true, payment });
        
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const createPayment = async (req, res) => {
    try {
        console.log('Create payment request:', req.body);
        const { vehicleNumber, paymentMethod, transactionId, amountPaid } = req.body;
        
        if (!vehicleNumber || !paymentMethod || !amountPaid) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const payment = new Payment({
            vehicleNumber, 
            paymentMethod, 
            transactionId, 
            amountPaid, 
            paymentStatus: 'completed',
            paymentDate: new Date()
        });
        
        await payment.save();
        console.log('Payment created successfully:', payment._id);
        res.status(201).json(payment);
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(400).json({ error: error.message });
    }
};

const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find().sort({ paymentDate: -1 });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updatePayment = async (req, res) => {
    try {
        const { entryId, paymentMethod, transactionId, amountPaid, paymentStatus, paymentDate } = req.body;
        const updateData = { entryId, paymentMethod, transactionId, amountPaid, paymentStatus, paymentDate };
        const payment = await Payment.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('entryId');
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByIdAndDelete(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const payWithWallet = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { vehicleNumber, amountPaid } = req.body;
        const amount = Number(amountPaid);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!vehicleNumber || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Missing or invalid required fields' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentBalance = user.walletBalance || 0;
        if (currentBalance < amount) {
            return res.status(400).json({
                error: 'Insufficient wallet balance',
                walletBalance: currentBalance
            });
        }

        user.walletBalance = currentBalance - amount;
        await user.save();

        const payment = new Payment({
            vehicleNumber,
            paymentMethod: 'wallet',
            transactionId: `wallet_txn_${Date.now()}`,
            amountPaid: amount,
            paymentStatus: 'completed',
            paymentDate: new Date()
        });

        await payment.save();

        res.status(201).json({
            success: true,
            payment,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createWalletTopupOrder = async (req, res) => {
    try {
        const userId = req.user?.id;
        const amount = Number(req.body.amount);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(400).json({ error: 'Razorpay credentials not configured' });
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `wallet_${userId}_${Date.now()}`,
            notes: {
                purpose: 'wallet_topup',
                userId: String(userId)
            }
        };

        const order = await razorpay.orders.create(options);
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Wallet topup order creation error:', error);
        res.status(500).json({ error: 'Failed to create wallet topup order' });
    }
};

const verifyWalletTopup = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing Razorpay verification fields' });
        }

        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(400).json({ error: 'Razorpay secret not configured' });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Invalid payment signature' });
        }

        const order = await razorpay.orders.fetch(razorpay_order_id);
        const topupAmount = Number(order.amount) / 100;

        if (!Number.isFinite(topupAmount) || topupAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid topup amount' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.walletBalance = (user.walletBalance || 0) + topupAmount;
        await user.save();

        res.json({
            success: true,
            message: 'Wallet topup successful',
            amountAdded: topupAmount,
            walletBalance: user.walletBalance
        });
    } catch (error) {
        console.error('Wallet topup verification error:', error);
        res.status(500).json({ success: false, error: 'Wallet topup verification failed' });
    }
};

module.exports = {
    createRazorpayOrder,
    verifyPayment,
    createWalletTopupOrder,
    verifyWalletTopup,
    createPayment,
    getAllPayments,
    getPaymentById,
    updatePayment,
    deletePayment,
    payWithWallet
};
