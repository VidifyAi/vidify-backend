require('dotenv').config();
var createError = require("http-errors");
var express = require("express");
var swaggerJsdoc = require("swagger-jsdoc");
var swaggerUi = require("swagger-ui-express");
var mongoose = require("mongoose");
const cors = require('cors');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const Voice = require("./models/voices");
const { format } = require("date-fns");
const { Clerk } = require('@clerk/clerk-sdk-node');

// 1st party dependencies
var indexRouter = require("./routes/index");
var avatarRouter = require("./routes/avatar");
var voicesRouter = require("./routes/voices");
var subscriptionsRouter = require('./routes/subscriptions');
const paymentsRouter = require('./routes/payments');
const adminRouter = require('./routes/admin');
const webhooksRouter = require('./routes/webhooks'); // Add this import for webhooks

async function getApp() {
  // Initialize Clerk
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn("CLERK_SECRET_KEY is not set. Authentication will not work properly.");
  }

  // Database
  // Use AZURE_COSMOS_CONNECTIONSTRING if available, otherwise fall back to MONGODB_URI
  const mongoUri = process.env.AZURE_COSMOS_CONNECTIONSTRING || process.env.MONGODB_URI;

  mongoose.connect(mongoUri).then(() => {
    console.log('Connected to database');
  }).catch((err) => {
    console.error('Error connecting to database:', err);
  });

  var app = express();
  app.set('trust proxy', 1 /* number of proxies between user and server */);

  var port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  const options = {
    definition: {
      openapi: "3.1.0",
      info: {
        title: "Vidify API Documentation",
        version: "1.0.0",
        description: "API documentation for the Vidify text-to-avatar video generation platform",
        license: {
          name: "Proprietary",
        },
        contact: {
          name: "Vidify Support",
          url: "https://vidify.com/support",
          email: "support@vidify.com",
        },
      },
      servers: [
        {
          url: process.env.API_BASE_URL || "http://localhost:3000",
          description: "Vidify API Server"
        },
      ],
      tags: [
        { name: "Avatar", description: "Avatar video generation endpoints" },
        { name: "Voices", description: "Voice management endpoints" },
        { name: "Subscriptions", description: "Subscription management endpoints" },
        { name: "Users", description: "User management endpoints" }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          }
        },
      },
      security: [
        {
          BearerAuth: []
        }
      ]
    },
    apis: ["./routes/*.js", "./models/*.js"],
  };
  const specs = swaggerJsdoc(options);
  app.set('swaggerSpec', specs); // Add this line to store the specs in the app
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, { explorer: true })
  );
  app.use(cors())

  app.use(logger("dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, "public")));

  app.locals.format = format;

  app.use("/", indexRouter);
  app.use("/api/avatar", avatarRouter);
  app.use("/api/voices", voicesRouter);
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/webhooks", webhooksRouter);
  
  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json("error");
  });

  return app;
}

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

module.exports = {
  getApp
};