require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const multiDB = require('./config/multidb');
const chatSocket = require('./socket/chatSocket');

// Import routes
const userRoutes = require('./router/entry-routes/user.routes');
const vehicleRoutes = require('./router/entry-routes/vehicle.routes');
const parkingSlotRoutes = require('./router/entry-routes/parkingslot.routes');
const parkingEntryRoutes = require('./router/entry-routes/parkingentry.routes');
const paymentRoutes = require('./router/entry-routes/payment.routes');
const billRoutes = require('./router/entry-routes/bill.routes');
const parkingHistoryRoutes = require('./router/entry-routes/parkinghistory.routes');
const receiptRoutes = require('./router/entry-routes/receipt.routes');
const authRoutes = require('./router/entry-routes/auth.routes');
const chatRoutes = require('./router/entry-routes/chat.routes');
const adminLocationRoutes = require('./router/entry-routes/adminlocation.routes');
const adminParkingSlotRoutes = require('./router/entry-routes/admin.parkingslot.routes');
const adminParkingEntryRoutes = require('./router/entry-routes/admin.parkingentry.routes');
const adminPaymentRoutes = require('./router/entry-routes/admin.payment.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:4200",
      "http://127.0.0.1:3000",
      "http://0.0.0.0:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Configuration
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.get('/api', (req, res) => {
  res.send('Hello World!');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working', routes: 'admin-parking-slots available' });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking-slots', parkingSlotRoutes);
app.use('/api/parking-entries', parkingEntryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/parking-history', parkingHistoryRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin-locations', adminLocationRoutes);
console.log('Loading admin parking slot routes...');
app.use('/api/admin-parking-slots', adminParkingSlotRoutes);
console.log('Admin parking slot routes loaded');
app.use('/api/admin-parking-entries', adminParkingEntryRoutes);
app.use('/api/admin-payments', adminPaymentRoutes);

// Database connection

// Initialize Socket.IO
chatSocket(io);

// Start server
const startServer = () => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.IO server initialized`);
  });
};

// Initialize application
connectDB().then(async () => {
  await multiDB.initMainConnection();
  startServer();
});
