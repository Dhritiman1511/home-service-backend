const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { upload, cloudinary } = require('../utils/uploadConfig');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, address, phone, role } = req.body;
    if (!['user', 'service_provider'].includes(role)) { //remove admin
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = new User({ name, email, password, address, phone, role });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.cookie('token', token, { httpOnly: true });
    res.json({ message: 'Logged in successfully',token: token,role: user.role, profilePicture: user.profilePicture || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Update User Details
router.put('/update', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload profile picture
router.post('/upload-profile-picture', 
  authMiddleware,
  upload.single('profilePicture'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please upload an image file' });
      }

      // Delete old profile picture if exists
      const user = await User.findById(req.user.id);
      if (user.profilePicture) {
        const publicId = user.profilePicture.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }

      // Update user with new profile picture URL
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { profilePicture: req.file.path },
        { new: true }
      );

      res.json({
        message: 'Profile picture uploaded successfully',
        profilePicture: updatedUser.profilePicture
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

// Delete profile picture
router.delete('/delete-profile-picture',
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user.profilePicture) {
        return res.status(400).json({ error: 'No profile picture to delete' });
      }

      // Delete from Cloudinary
      const publicId = user.profilePicture.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);

      // Update user
      user.profilePicture = undefined;
      await user.save();

      res.json({ message: 'Profile picture deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

// Admin-Only: Update User Role
router.put('/role/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'service_provider'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Users
router.get('/users', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const users = await User.find({ role: 'user' });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Service Providers
router.get('/service-providers', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const serviceProviders = await User.find({ role: 'service_provider' });
    res.json(serviceProviders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
