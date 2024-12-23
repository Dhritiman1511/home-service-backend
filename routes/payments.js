const express = require('express');
const Payment = require('../models/Payment');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Create a payment record
router.post('/', authMiddleware, async (req, res) => {
  const { booking, amount, transactionId } = req.body;

  try {
    const newPayment = new Payment({ booking, amount, transactionId });
    await newPayment.save();
    res.status(201).json(newPayment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get payment records for a user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
