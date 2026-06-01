const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
    walletBalance: { type: Number, default: 0, min: 0 },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For staff/customer association
    createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
