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

  var port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  const options = {
    definition: {
      openapi: "3.1.0",
      info: {
        title: "LogRocket Express API with Swagger",
        version: "0.1.0",
        description:
          "This is a simple CRUD API application made with Express and documented with Swagger",
        license: {
          name: "MIT",
          url: "https://spdx.org/licenses/MIT.html",
        },
        contact: {
          name: "LogRocket",
          url: "https://logrocket.com",
          email: "info@email.com",
        },
      },
      servers: [
        {
          url: "http://localhost:3000",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter JWT Bearer token **_only_**"
          }
        }
      },
      security: [
        {
          BearerAuth: []
        }
      ]
    },
    apis: ["./routes/*.js"],
  };
  const specs = swaggerJsdoc(options);
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