const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true },
    paymentMethod: { type: String, enum: ['card', 'UPI', 'cash'], required: true }, // New field
    paymentDate: { type: Date, default: Date.now }, // New field
    refundStatus: { type: String, enum: ['not_refunded', 'partial', 'full'], default: 'not_refunded' }, // New field
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);