const PDFDocument = require('pdfkit');

const generateReceiptPDF = (receiptData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('ParkSeva - Parking Receipt', 50, 50);
            doc.fontSize(12).font('Helvetica').text(`Receipt #: ${receiptData.receiptNumber}`, 50, 80);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 400, 80);

            // Line
            doc.moveTo(50, 110).lineTo(550, 110).stroke();

            // Vehicle Details
            doc.fontSize(14).font('Helvetica-Bold').text('Vehicle Details', 50, 130);
            doc.fontSize(12).font('Helvetica')
               .text(`Vehicle Number: ${receiptData.vehicleNumber}`, 50, 150)
               .text(`Entry Time: ${new Date(receiptData.entryTime).toLocaleString()}`, 50, 170)
               .text(`Exit Time: ${new Date(receiptData.exitTime).toLocaleString()}`, 50, 190)
               .text(`Duration: ${receiptData.duration}`, 50, 210);

            // Payment Details
            doc.fontSize(14).font('Helvetica-Bold').text('Payment Details', 50, 240);
            doc.fontSize(12).font('Helvetica')
               .text(`Amount:Rs. ${receiptData.amount}`, 50, 260)
               .text(`Payment Method: ${receiptData.paymentMethod.toUpperCase()}`, 50, 280);

            // Footer
            doc.moveTo(50, 320).lineTo(550, 320).stroke();
            doc.fontSize(10).text('Thank you for using ParkSeva!', 50, 340);
            doc.text('For support: support@parkseva.com', 50, 355);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { generateReceiptPDF };