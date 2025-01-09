const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    scheduledDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    address: { type: String, required: true }, // New field
    phone: { type: String, required: true },   // New field
    images: [{ type: String }],  //Booking Images
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' }, // New field
    notes: { type: String }, // Optional user notes
  },
  { timestamps: true } // Adds `createdAt` and `updatedAt`
);

module.exports = mongoose.model('Booking', bookingSchema);