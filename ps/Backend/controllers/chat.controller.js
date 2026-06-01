const Chat = require('../models/chat.model');

// Get chat history
const getChatHistory = async (req, res) => {
    try {
        const { room = 'general', limit = 50 } = req.query;
        
        const messages = await Chat.find({ room })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json(messages.reverse());
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
};

// Delete message (admin only)
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        
        await Chat.findByIdAndDelete(messageId);
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
};

module.exports = {
    getChatHistory,
    deleteMessage
};