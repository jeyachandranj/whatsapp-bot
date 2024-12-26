// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  product: String,
  quantity: Number,
  address: String,
  totalPrice: Number,
  confirmed: Boolean,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
