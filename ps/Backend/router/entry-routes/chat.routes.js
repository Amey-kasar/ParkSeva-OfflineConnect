const express = require('express');
const router = express.Router();
const { getChatHistory, deleteMessage } = require('../../controllers/chat.controller');
const auth = require('../../middleware/auth');

// Get chat history
router.get('/history', auth, getChatHistory);

// Delete message (admin only)
router.delete('/message/:messageId', auth, deleteMessage);

module.exports = router;