const Chat = require('../models/chat.model');

const chatSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join room
        socket.on('join-room', (room) => {
            socket.join(room);
            console.log(`User ${socket.id} joined room: ${room}`);
            socket.emit('joined-room', room);
        });

        // Handle new message
        socket.on('send-message', async (data) => {
            try {
                console.log('Received message:', data);
                const { userId, username, message, room = 'general' } = data;

                // Save message to database
                const chatMessage = new Chat({
                    userId,
                    username,
                    message,
                    room
                });

                const savedMessage = await chatMessage.save();
                console.log('Message saved:', savedMessage);

                // Broadcast message to all clients in room
                const messageData = {
                    _id: savedMessage._id,
                    userId,
                    username,
                    message,
                    timestamp: savedMessage.timestamp,
                    room
                };

                io.to(room).emit('new-message', messageData);
                console.log('Message broadcasted to room:', room);

            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('error', 'Failed to send message');
            }
        });

        // Handle typing indicator
        socket.on('typing', (data) => {
            socket.to(data.room).emit('user-typing', {
                username: data.username,
                isTyping: data.isTyping
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};

module.exports = chatSocket;