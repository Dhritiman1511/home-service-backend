const express = require("express");
const User = require('../models/User'); // Ensure User model is imported
const Service = require("../models/Service");
const Category = require("../models/Category");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Get All Services

router.get("/", async (req, res) => {
  try {
    // Fetch all services
    const services = await Service.find();

    // Fetch provider details for each service
    const servicesWithProviderName = await Promise.all(
      services.map(async (service) => {
        // Find the provider using the provider's ID
        const provider = await User.findById(service.provider);
        const providerName = provider ? provider.name : "Unknown Provider";
        
        return {
          ...service.toObject(),
          providerName,
        };
      })
    );

    res.json(servicesWithProviderName);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: "Unable to fetch services." });
  }
});

// Create Service (Admin or Service Provider Only)
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "service_provider"]),
  async (req, res) => {
    try {
      const { name, description, category, price, availability } = req.body;

      // Ensure the provider is attached to the request object by the middleware
      const providerId = req.user._id; // `req.user` is set by authMiddleware

      // Check if category exists in the database
      const categoryObj = await Category.findOne({ name: category });
      if (!categoryObj) {
        return res.status(400).json({ error: "Category not found" });
      }

      // Create a new service
      const service = new Service({
        name,
        description,
        category: categoryObj._id, // Use ObjectId of the category
        price,
        availability,
        provider: providerId, // Assign the provider's ID
      });

      await service.save();
      res.status(201).json(service);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get Service by ID
router.get("/:id", async (req, res) => {
  try {
    // Find the service by its ObjectId and populate the category
    const service = await Service.findById(req.params.id).populate("category");

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    // Find the provider by its ID
    const provider = await User.findById(service.provider);

    // Add the provider name to the service object
    const serviceWithProviderName = {
      ...service.toObject(),
      providerName: provider ? provider.name : "Unknown Provider"
    };

    // Send the service details along with provider name in the response
    res.json(serviceWithProviderName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// // Update Service (Admin or Service Provider Only)
// router.put(
//   '/:id',
//   authMiddleware,
//   roleMiddleware(['admin', 'service_provider']),
//   async (req, res) => {
//     try {
//       const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
//       if (!service) return res.status(404).json({ error: 'Service not found' });
//       res.json(service);
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   }
// );

// Delete Service (Admin Only)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const service = await Service.findByIdAndDelete(req.params.id);
      if (!service) return res.status(404).json({ error: "Service not found" });
      res.json({ message: "Service deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Update Service Details
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "service_provider"]),
  async (req, res) => {
    try {
      const updates = req.body;

      // If the category is provided as a name, find the category ID by name
      if (updates.category) {
        const category = await Category.findOne({ name: updates.category });

        if (!category) {
          return res.status(400).json({ error: "Category not found" });
        }

        // Replace category name with the category ID
        updates.category = category._id;
      }

      // Validate availability
      if (
        updates.availability &&
        !["Available", "Unavailable"].includes(updates.availability)
      ) {
        return res.status(400).json({ error: "Invalid availability value" });
      }

      // Find and update the service
      const updatedService = await Service.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      if (!updatedService) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Send the updated service data
      res.json(updatedService);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Get Services by Provider ID
router.get("/provider/:providerId", async (req, res) => {
  try {
    console.log(req.params);
    const { providerId } = req.params;
    // Fetch services by provider ID
    const services = await Service.find({ provider: providerId });

    if (!services || services.length === 0) {
      return res.status(404).json({ error: "No services found for this provider" });
    }

    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;