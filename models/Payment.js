const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true },
  },
  { timestamps: true } // Adds `createdAt` and `updatedAt`
);

module.exports = mongoose.model('Payment', paymentSchema);