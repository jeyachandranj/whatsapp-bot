const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


exports.generateBill = (orderDetails, userNumber, res) => {
  const doc = new PDFDocument({ size: [420, 595], margin: 30 }); 
  // Set output file path
  const filePath = path.join(__dirname, `../bills/order_${Date.now()}.pdf`);

  // Write to file
  doc.pipe(fs.createWriteStream(filePath));

  // Header: Farm2Bag and logo (smaller logo size)
  doc
    .fontSize(20)
    .fillColor('#4CAF50') // Green color for title
    .text('Farm2Bag - Invoice', { align: 'center' });

  // Add smaller logo with fixed position and smaller size
  const logoPath = path.join(__dirname, './logo.jpeg');
  doc.image(logoPath, 25, 25, { width: 40 }); // Reduced logo size to 60px width

  // Move the rest of the content below the header
  doc.moveDown(3);

  // Customer Details
  doc
    .fontSize(12)
    .fillColor('#000000')
    .text('Customer Details', { underline: true })
    .moveDown(0.5)
    .text(`Name: ${orderDetails.customerName}`)
    .text(`Address: ${orderDetails.address}`)
    .text(`Date: ${new Date().toLocaleDateString()}`)
    .moveDown(1);

  // Order Details Table
  doc
    .fontSize(12)
    .fillColor('#FF5722') // Orange color for table header
    .text('Order Details:', { underline: true })
    .moveDown(0.5);

  // Table Setup
  const tableTop = doc.y;
  const columnWidths = { product: 180, qty: 60, price: 60, total: 60 };
  const columnSpacing = 10;

  // Table Header
  doc
    .fontSize(10)
    .fillColor('#FF5722') // Table header color
    .text('Product', 30, tableTop)
    .text('Quantity', 20 + columnWidths.product + columnSpacing, tableTop)
    .text('Price', 30 + columnWidths.product + columnWidths.qty + columnSpacing * 2, tableTop)
    .text('Total', 20 + columnWidths.product + columnWidths.qty + columnWidths.price + columnSpacing * 3, tableTop);

  // Draw a line below the table header for separation
  doc.moveDown(0.5);
  doc.moveTo(50, tableTop + 12).lineTo(50 + columnWidths.product + columnWidths.qty + columnWidths.price + columnSpacing * 3, tableTop + 12).stroke();

  // Table Rows
  let totalPrice = 0;
  orderDetails.products.forEach((product, index) => {
    const position = tableTop + 20 + index * 20;

    doc
      .fontSize(9)
      .fillColor('#000000')
      .text(product.name, 30, position)
      .text(product.quantity, 20 + columnWidths.product + columnSpacing, position)
      .text(`$${product.price.toFixed(2)}`, 30 + columnWidths.product + columnWidths.qty + columnSpacing * 2, position)
      .text(`$${(product.quantity * product.price).toFixed(2)}`, 20 + columnWidths.product + columnWidths.qty + columnWidths.price + columnSpacing * 3, position);

    totalPrice += product.quantity * product.price;
  });

  doc.moveDown(1).fontSize(12).fillColor('#000000').text(`Total Price: $${totalPrice.toFixed(2)}`, { align: 'right' });

  doc.moveDown(0.5).fontSize(8).fillColor('#9C27B0').text('Visit us at: www.farm2bag.com', { align: 'center' });

  doc.end();

  const sendPDFViaWhatsApp = () => {
    client.messages
      .create({
        from: 'whatsapp:+14155238886', 
        to: `whatsapp:${userNumber}`,  
        body: 'Your order invoice is attached below:',
        mediaUrl: `file://${filePath}`, 
      })
      .then(message => {
        console.log('Invoice sent via WhatsApp:', message.sid);
      })
      .catch(err => {
        console.error('Error sending invoice via WhatsApp:', err);
      });
  };

  // Call the function to send PDF after it's generated
  sendPDFViaWhatsApp();
};





