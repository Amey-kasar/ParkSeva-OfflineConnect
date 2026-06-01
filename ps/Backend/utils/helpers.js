const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Password hashing utilities
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT utilities
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Date utilities
const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const calculateDuration = (startTime, endTime) => {
  const diffMs = new Date(endTime) - new Date(startTime);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Validation utilities
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  formatDate,
  calculateDuration,
  validateEmail,
  validatePhoneNumber
};