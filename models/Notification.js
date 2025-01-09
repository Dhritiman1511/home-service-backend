const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Recipient of the notification
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for provider-specific notifications
    message: { type: String, required: true }, // Notification content
    type: { type: String, enum: ['booking', 'payment', 'review', 'general'], required: true }, // Type of notification
    isRead: { type: Boolean, default: false }, // Track if the notification has been read
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);