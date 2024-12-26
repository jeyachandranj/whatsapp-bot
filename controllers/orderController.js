const Order = require('../Order');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const userSessions = {};

const sendMessage = (to, message) => {
  return client.messages.create({
    from: `whatsapp:+14155238886`,
    to: `whatsapp:${to}`,
    body: message,
  });
};

const searchProduct = (productName) => {
  const lowerCaseProductName = productName.toLowerCase();
  const foundProduct = products.find(product => product.name.toLowerCase() === lowerCaseProductName);
  return foundProduct;
};

exports.webhook = async (req, res) => {
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
    session.stage = 'product_search'; 
    return sendMessage(userNumber, `Searching for ${session.product}...`);
  }

  if (session.stage === 'product_search') {
    const product = searchProduct(session.product);

    if (product) {
      session.product = product.name;
      session.price = product.price;
      session.stage = 'quantity';
      return sendMessage(userNumber, `We found: ${product.name} - $${product.price}\nHow many units would you like to order?`);
    } else {
      return sendMessage(userNumber, 'Sorry, we could not find that product. Please check the name and try again.');
    }
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
    session.totalPrice = session.quantity * session.price;
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

    const orderDetails = {
      customerName: 'John Doe',
      address: session.address,
      products: [
        { name: session.product, quantity: session.quantity, price: session.price },
      ],
    };

    return generateBill(orderDetails, userNumber, res);

    return sendMessage(userNumber, 'Thank you! Your order has been placed successfully.');
  }

  return sendMessage(userNumber, 'Invalid response. Please follow the instructions.');
};

exports.getStatus = (req, res) => {
  res.send('Bot is up and running!');
};

