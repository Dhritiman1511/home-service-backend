const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String, required: true }, // New field
    phone: { type: String, required: true },   // New field
    role: { type: String, enum: ['user', 'admin', 'service_provider'], default: 'user' }, // Updated
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt`
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);

