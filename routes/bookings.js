const express = require("express");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Create Booking
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { service, scheduledDate, address, phone } = req.body;
    const booking = new Booking({
      user: req.user.id,
      service,
      scheduledDate,
      address,
      phone,
    });
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Bookings (Admin Only)
router.get("/", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
  try {
    const bookings = await Booking.find().populate("user").populate("service");
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Bookings for a Specific User
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.id }).populate(
      "service"
    );
    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ error: "No bookings found for this user" });
    }
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Booking Details
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Ensure only the booking owner or admin can update
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Booking
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Ensure either the booking owner or admin can delete
    if (req.user.id !== booking.user.toString() && req.user.role !== "admin") {
      return res
        .status(403)
        .json({
          error: "Forbidden: You are not allowed to delete this booking",
        });
    }

    await booking.deleteOne();
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
