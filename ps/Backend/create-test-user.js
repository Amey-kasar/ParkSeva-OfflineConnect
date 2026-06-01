require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user.model');

const createTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parkease');
        
        // Check if test user already exists
        const existingUser = await User.findOne({ phoneNumber: '1234567890' });
        if (existingUser) {
            console.log('Test user already exists');
            return;
        }
        
        // Create test user
        const testUser = new User({
            name: 'Test Admin',
            phoneNumber: '1234567890',
            email: 'admin@test.com',
            password: 'admin123',
            role: 'admin'
        });
        
        await testUser.save();
        console.log('Test user created successfully');
        console.log('Phone: 1234567890');
        console.log('Password: admin123');
        
    } catch (error) {
        console.error('Error creating test user:', error);
    } finally {
        mongoose.connection.close();
    }
};

createTestUser();