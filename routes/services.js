const express = require("express");
const User = require('../models/User');
const Service = require("../models/Service");
const Category = require("../models/Category");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { serviceUpload, cloudinary } = require("../utils/uploadConfig");

const router = express.Router();

const uploadFields = serviceUpload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

// Get All Services
router.get("/search", async (req, res) => {
  const { name } = req.query;
  try {
    if (!name) {
      return res.status(400).json({ error: "Service name is required" });
    }
    const services = await Service.find({ 
      name: { $regex: name, $options: 'i' } 
    }).populate('provider category');
    
    if (!services.length) {
      return res.status(404).json({ error: "No services found" });
    }
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// Create Service with images (Admin or Service Provider Only)
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "service_provider"]),
  uploadFields,
  async (req, res) => {
    try {
      const { name, description, category, price, availability } = req.body;
      const providerId = req.user._id;

      // Get uploaded image URLs
      const imageUrls = req.files.images ? req.files.images.map(file => file.path) : [];
      
      // Get icon URL if uploaded
      const iconUrl = req.files.icon ? req.files.icon[0].path : null;

      // Check if category exists
      const categoryObj = await Category.findOne({ name: category });
      if (!categoryObj) {
        return res.status(400).json({ error: "Category not found" });
      }

      // Create service with icon and images
      const service = new Service({
        name,
        description,
        category: categoryObj._id,
        price,
        availability,
        provider: providerId,
        icon: iconUrl,
        images: imageUrls,
      });

      await service.save();
      res.status(201).json(service);
    } catch (err) {
      // Delete uploaded files if service creation fails
      if (req.files) {
        if (req.files.icon) {
          const publicId = req.files.icon[0].path.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
        if (req.files.images) {
          for (const file of req.files.images) {
            const publicId = file.path.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }
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

// Update Service with images
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "service_provider"]),
  uploadFields,
  async (req, res) => {
    try {
      const updates = req.body;
      
      // Get existing service
      const existingService = await Service.findById(req.params.id);
      if (!existingService) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Handle new icon upload
      if (req.files.icon) {
        // Delete old icon if it exists
        if (existingService.icon) {
          const oldIconId = existingService.icon.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(oldIconId);
        }
        updates.icon = req.files.icon[0].path;
      }

      // Handle new images upload
      if (req.files.images && req.files.images.length > 0) {
        const newImages = req.files.images.map(file => file.path);
        // Combine existing and new images, keeping only the last 5
        updates.images = [...existingService.images, ...newImages].slice(-5);
      }

      // Handle category update
      if (updates.category) {
        const category = await Category.findOne({ name: updates.category });
        if (!category) {
          return res.status(400).json({ error: "Category not found" });
        }
        updates.category = category._id;
      }

      // Validate availability
      if (
        updates.availability &&
        !["Available", "Unavailable"].includes(updates.availability)
      ) {
        return res.status(400).json({ error: "Invalid availability value" });
      }

      // Update service
      const updatedService = await Service.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      res.json(updatedService);
    } catch (err) {
      // Delete uploaded files if update fails
      if (req.files) {
        if (req.files.icon) {
          const publicId = req.files.icon[0].path.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        }
        if (req.files.images) {
          for (const file of req.files.images) {
            const publicId = file.path.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }
      res.status(500).json({ error: err.message });
    }
  }
);

// Add a new route to delete images from a service
router.delete(
  "/:id/images",
  authMiddleware,
  roleMiddleware(["admin", "service_provider"]),
  async (req, res) => {
    try {
      const { imageUrls } = req.body;
      const service = await Service.findById(req.params.id);

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Remove specified images
      service.images = service.images.filter(img => !imageUrls.includes(img));
      await service.save();

      res.json({ message: "Images removed successfully", service });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Add a new route to delete icon
router.delete(
  "/:id/icon",
  authMiddleware,
  roleMiddleware(["admin", "service_provider"]),
  async (req, res) => {
    try {
      const service = await Service.findById(req.params.id);

      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      if (service.icon) {
        // Delete icon from Cloudinary
        const publicId = service.icon.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);

        // Remove icon from service
        service.icon = null;
        await service.save();
      }

      res.json({ message: "Icon removed successfully", service });
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

// Get Services by Category ID
router.get("/category/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Validate if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Fetch services by category and populate provider details
    const services = await Service.find({ category: categoryId }).populate("provider", "name");

    // Return response with category name and services
    res.json({
      categoryName: category.name,
      services: services.map((service) => ({
        ...service.toObject(),
        providerName: service.provider?.name || "Unknown Provider",
      })),
    });

  } catch (err) {
    console.error("Error fetching services by category:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;