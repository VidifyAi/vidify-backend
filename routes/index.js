var express = require("express");
var router = express.Router();
var mongoose = require("mongoose"); // Add this missing import

// Basic route
router.get("/", function(req, res) {
  res.json({ message: "Welcome to Vidify API" });
});

router.get('/health/schema', function(req, res) {
  try {
    // Get the Swagger documentation
    const swaggerDocs = req.app.get('swaggerSpec');
    
    // List registered MongoDB models
    const registeredModels = Object.keys(mongoose.models);
    
    res.status(200).json({
      swagger: {
        published: !!swaggerDocs,
        paths: swaggerDocs ? Object.keys(swaggerDocs.paths).length : 0
      },
      mongodb: {
        connected: mongoose.connection.readyState === 1,
        models: registeredModels
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to check schema status",
      error: error.message
    });
  }
});

module.exports = router; // Add this export