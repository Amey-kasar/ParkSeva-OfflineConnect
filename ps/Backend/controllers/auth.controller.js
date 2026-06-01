const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const twilio = require('twilio');

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = '+16202993693';

// Initialize Twilio client only if credentials are provided
let client = null;
if (accountSid && authToken) {
    try {
        client = twilio(accountSid, authToken);
        console.log('✅ Twilio client initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Twilio client:', error.message);
    }
}

// In-memory OTP storage (use Redis in production)
const otpStorage = new Map();

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
};

// Verify password and send OTP
const verifyPasswordAndSendOTP = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        if (!phoneNumber || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Phone number and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ phoneNumber });
        console.log('User lookup for phone:', phoneNumber, 'Found:', !!user);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password verification result:', isPasswordValid);

        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials'
            });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with expiration (5 minutes)
        otpStorage.set(phoneNumber, {
            otp,
            expires: Date.now() + 5 * 60 * 1000
        });

        // Try to send SMS via Twilio
        let smsSent = false;

        if (client && twilioPhoneNumber) {
            try {
                const formattedPhone = `+91${phoneNumber}`;

                // Use Twilio Messages API
                const message = await client.messages.create({
                    body: `Your ParkEase verification code is: ${otp}. Valid for 5 minutes.`,
                    from: twilioPhoneNumber,
                    to: formattedPhone
                });

                console.log('✅ Twilio SMS sent successfully:', message.sid);
                smsSent = true;
            } catch (twilioError) {
                console.error('❌ Twilio SMS failed:', twilioError.message);
                console.log('📱 Using mock OTP instead');
            }
        }

        // Fallback to mock OTP if Twilio failed or not configured
        if (!smsSent) {
            console.log('=== 📱 MOCK OTP MODE ===');
            console.log('📞 Phone:', phoneNumber);
            console.log('🔢 OTP:', otp);
            console.log('⏰ Expires in 5 minutes');
            console.log('========================');
        }

        res.json({
            status: 'success',
            message: 'OTP sent successfully',
            ...(process.env.NODE_ENV === 'development' && { mockOTP: otp })
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send OTP',
            error: error.message
        });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Phone number and OTP are required'
            });
        }

        // Check stored OTP
        const storedOTP = otpStorage.get(phoneNumber);

        if (!storedOTP) {
            return res.status(400).json({
                status: 'error',
                message: 'OTP not found or expired'
            });
        }

        if (Date.now() > storedOTP.expires) {
            otpStorage.delete(phoneNumber);
            return res.status(400).json({
                status: 'error',
                message: 'OTP expired'
            });
        }

        if (storedOTP.otp !== otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid OTP'
            });
        }

        // Clear OTP after successful verification
        otpStorage.delete(phoneNumber);

        res.json({
            status: 'success',
            message: 'OTP verified successfully'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
};

// Complete login after OTP verification
const completeLogin = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Phone number and OTP are required'
            });
        }

        // Verify OTP
        const storedOTP = otpStorage.get(phoneNumber);

        if (!storedOTP) {
            return res.status(400).json({
                status: 'error',
                message: 'OTP not found or expired'
            });
        }

        if (Date.now() > storedOTP.expires) {
            otpStorage.delete(phoneNumber);
            return res.status(400).json({
                status: 'error',
                message: 'OTP expired'
            });
        }

        if (storedOTP.otp !== otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid OTP'
            });
        }

        // Clear OTP after successful verification
        otpStorage.delete(phoneNumber);

        // Find user
        const user = await User.findOne({ phoneNumber });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const token = generateToken(user._id);
        const { password: _, ...userWithoutPassword } = user.toObject();

        res.json({
            status: 'success',
            message: 'Login successful',
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('Complete login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Login failed',
            error: error.message
        });
    }
};

module.exports = {
    verifyPasswordAndSendOTP,
    verifyOTP,
    completeLogin
};
