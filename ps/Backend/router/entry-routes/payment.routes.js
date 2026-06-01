const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { createRazorpayOrder, verifyPayment, createWalletTopupOrder, verifyWalletTopup, createPayment, getAllPayments, getPaymentById, updatePayment, deletePayment, payWithWallet } = require('../../controllers/payment.controller');

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);
router.post('/wallet/create-order', auth, createWalletTopupOrder);
router.post('/wallet/verify', auth, verifyWalletTopup);
router.post('/wallet', auth, payWithWallet);
router.post('/', createPayment);
router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
