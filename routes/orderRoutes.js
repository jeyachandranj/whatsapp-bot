const express = require('express');
const { webhook, getStatus } = require('../controllers/orderController');

const router = express.Router();

router.get('/webhook', getStatus);
router.post('/webhook', webhook);

module.exports = router;
