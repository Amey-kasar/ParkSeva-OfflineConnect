const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { createPayment, getPayments } = require('../../controllers/admin.payment.controller');

router.post('/', auth, createPayment);
router.get('/', auth, getPayments);

module.exports = router;