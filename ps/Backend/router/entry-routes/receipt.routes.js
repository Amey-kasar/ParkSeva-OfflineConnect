const express = require('express');
const router = express.Router();
const receiptController = require('../../controllers/receipt.controller');
const auth = require('../../middleware/auth');

router.post('/generate', receiptController.generateReceipt);
router.get('/download/:receiptId', receiptController.downloadReceipt);

module.exports = router;