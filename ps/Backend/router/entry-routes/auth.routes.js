const express = require('express');
const router = express.Router();
const { verifyPasswordAndSendOTP, verifyOTP, completeLogin } = require('../../controllers/auth.controller');

// Password + OTP routes
router.post('/verify-password-send-otp', verifyPasswordAndSendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/complete-login', completeLogin);

module.exports = router;