const Receipt = require('../models/receipt.model');
const Payment = require('../models/payment.model');
const ParkingHistory = require('../models/parkinghistory.model');
const { generateReceiptPDF } = require('../services/pdfService');

const generateReceipt = async (req, res) => {
    try {
        const { vehicleNumber, entryTime, exitTime } = req.body;
        console.log('Generating receipt for vehicle:', vehicleNumber);
        console.log('Entry time:', entryTime, 'Exit time:', exitTime);
        
        const payment = await Payment.findOne({ vehicleNumber }).sort({ paymentDate: -1 });
        if (!payment) {
            console.log('Payment not found for vehicle:', vehicleNumber);
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Use provided times or defaults
        const entry = entryTime ? new Date(entryTime) : new Date(Date.now() - 2 * 60 * 60 * 1000);
        const exit = exitTime ? new Date(exitTime) : new Date();
        
        // Calculate duration
        const diffMs = Math.abs(exit.getTime() - entry.getTime());
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const duration = `${hours}h ${minutes}m`;

        const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        
        const receiptData = {
            receiptNumber,
            vehicleNumber: payment.vehicleNumber,
            entryTime: entry,
            exitTime: exit,
            duration,
            amount: payment.amountPaid,
            paymentMethod: payment.paymentMethod
        };

        console.log('Receipt data:', receiptData);
        const pdfBuffer = await generateReceiptPDF(receiptData);

        const receipt = new Receipt({
            receiptNumber,
            vehicleNumber: payment.vehicleNumber,
            paymentId: payment._id,
            entryTime: entry,
            exitTime: exit,
            duration,
            amount: payment.amountPaid,
            paymentMethod: payment.paymentMethod,
            pdfBuffer
        });

        await receipt.save();
        console.log('Receipt saved successfully');

        res.json({
            receiptId: receipt._id,
            receiptNumber,
            pdfBase64: pdfBuffer.toString('base64')
        });

    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({ error: error.message });
    }
};

const downloadReceipt = async (req, res) => {
    try {
        const { receiptId } = req.params;
        
        const receipt = await Receipt.findById(receiptId);
        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
        res.send(receipt.pdfBuffer);

    } catch (error) {
        console.error('Receipt download error:', error);
        res.status(500).json({ error: 'Failed to download receipt' });
    }
};

module.exports = {
    generateReceipt,
    downloadReceipt
};