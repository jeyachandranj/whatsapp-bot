// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Order = require('./Order');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User session storage
const userSessions = {};
app.get('/webhook', (req, res) => res.send('Bot is up and running!'));

// Welcome and menu handler
app.post('/webhook', async (req, res) => {
  console.log("body",req.body);
  const { From, Body } = req.body;
  const userNumber = From.replace('whatsapp:', '').trim();

  if (!userSessions[userNumber]) {
    userSessions[userNumber] = { stage: 'welcome' };
    return sendMessage(userNumber, 'Welcome to our shop! Type "menu" to see the product list.');
  }

  const session = userSessions[userNumber];

  if (Body.toLowerCase() === 'menu') {
    session.stage = 'ordering';
    return sendMessage(
      userNumber,
      'Here is our menu:\n1. Product A - $10\n2. Product B - $15\n3. Product C - $20\nReply with the product name to order.'
    );
  }

  if (session.stage === 'ordering') {
    session.product = Body.trim();
    session.stage = 'quantity';
    return sendMessage(userNumber, 'How many units would you like to order?');
  }

  if (session.stage === 'quantity') {
    session.quantity = parseInt(Body.trim(), 10);
    if (isNaN(session.quantity)) {
      return sendMessage(userNumber, 'Please enter a valid quantity.');
    }
    session.stage = 'address';
    return sendMessage(userNumber, 'Please provide your delivery address.');
  }

  if (session.stage === 'address') {
    session.address = Body.trim();
    session.totalPrice = session.quantity * (session.product === 'Product A' ? 10 : session.product === 'Product B' ? 15 : 20);
    session.stage = 'confirmation';

    return sendMessage(
      userNumber,
      `Order Summary:\nProduct: ${session.product}\nQuantity: ${session.quantity}\nAddress: ${session.address}\nTotal Price: $${session.totalPrice}\n\nReply "confirm" to place your order.`
    );
  }

  if (session.stage === 'confirmation' && Body.toLowerCase() === 'confirm') {
    const order = new Order({
      product: session.product,
      quantity: session.quantity,
      address: session.address,
      totalPrice: session.totalPrice,
      confirmed: true,
    });

    await order.save();

    delete userSessions[userNumber];
    return sendMessage(userNumber, 'Thank you! Your order has been placed successfully.');
  }

  return sendMessage(userNumber, 'Invalid response. Please follow the instructions.');
});

// Helper to send WhatsApp messages
function sendMessage(to, message) {
  return client.messages.create({
    from: `whatsapp:+14155238886`,
    to: `whatsapp:${to}`,
    body: message,
  });
}


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
