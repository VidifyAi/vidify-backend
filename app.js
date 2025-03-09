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


  const voicesData = [
    // English voices (most widely spoken)
    { key: 'en-US-JennyNeural', language: 'English', country: 'United States', gender: 'Female', locale: 'en-US', voiceName: 'JennyNeural' },
    { key: 'en-US-GuyNeural', language: 'English', country: 'United States', gender: 'Male', locale: 'en-US', voiceName: 'GuyNeural' },
    { key: 'en-GB-SoniaNeural', language: 'English', country: 'United Kingdom', gender: 'Female', locale: 'en-GB', voiceName: 'SoniaNeural' },
    { key: 'en-GB-RyanNeural', language: 'English', country: 'United Kingdom', gender: 'Male', locale: 'en-GB', voiceName: 'RyanNeural' },
    { key: 'en-AU-NatashaNeural', language: 'English', country: 'Australia', gender: 'Female', locale: 'en-AU', voiceName: 'NatashaNeural' },
    { key: 'en-AU-WilliamNeural', language: 'English', country: 'Australia', gender: 'Male', locale: 'en-AU', voiceName: 'WilliamNeural' },
    { key: 'en-IN-NeerjaNeural', language: 'English', country: 'India', gender: 'Female', locale: 'en-IN', voiceName: 'NeerjaNeural' },
    { key: 'en-IN-PrabhatNeural', language: 'English', country: 'India', gender: 'Male', locale: 'en-IN', voiceName: 'PrabhatNeural' },
    
    // Mandarin Chinese
    { key: 'zh-CN-XiaoxiaoNeural', language: 'Chinese', country: 'China', gender: 'Female', locale: 'zh-CN', voiceName: 'XiaoxiaoNeural' },
    { key: 'zh-CN-YunxiNeural', language: 'Chinese', country: 'China', gender: 'Male', locale: 'zh-CN', voiceName: 'YunxiNeural' },
    
    // Spanish
    { key: 'es-ES-ElviraNeural', language: 'Spanish', country: 'Spain', gender: 'Female', locale: 'es-ES', voiceName: 'ElviraNeural' },
    { key: 'es-ES-AlvaroNeural', language: 'Spanish', country: 'Spain', gender: 'Male', locale: 'es-ES', voiceName: 'AlvaroNeural' },
    { key: 'es-MX-DaliaNeural', language: 'Spanish', country: 'Mexico', gender: 'Female', locale: 'es-MX', voiceName: 'DaliaNeural' },
    { key: 'es-MX-JorgeNeural', language: 'Spanish', country: 'Mexico', gender: 'Male', locale: 'es-MX', voiceName: 'JorgeNeural' },
    
    // Hindi
    { key: 'hi-IN-SwaraNeural', language: 'Hindi', country: 'India', gender: 'Female', locale: 'hi-IN', voiceName: 'SwaraNeural' },
    { key: 'hi-IN-MadhurNeural', language: 'Hindi', country: 'India', gender: 'Male', locale: 'hi-IN', voiceName: 'MadhurNeural' },
    
    // Arabic
    { key: 'ar-SA-ZariyahNeural', language: 'Arabic', country: 'Saudi Arabia', gender: 'Female', locale: 'ar-SA', voiceName: 'ZariyahNeural' },
    { key: 'ar-SA-HamedNeural', language: 'Arabic', country: 'Saudi Arabia', gender: 'Male', locale: 'ar-SA', voiceName: 'HamedNeural' },
    
    // Portuguese
    { key: 'pt-BR-FranciscaNeural', language: 'Portuguese', country: 'Brazil', gender: 'Female', locale: 'pt-BR', voiceName: 'FranciscaNeural' },
    { key: 'pt-BR-AntonioNeural', language: 'Portuguese', country: 'Brazil', gender: 'Male', locale: 'pt-BR', voiceName: 'AntonioNeural' },
    
    // Russian
    { key: 'ru-RU-SvetlanaNeural', language: 'Russian', country: 'Russia', gender: 'Female', locale: 'ru-RU', voiceName: 'SvetlanaNeural' },
    { key: 'ru-RU-DmitryNeural', language: 'Russian', country: 'Russia', gender: 'Male', locale: 'ru-RU', voiceName: 'DmitryNeural' },
    
    // Japanese
    { key: 'ja-JP-NanamiNeural', language: 'Japanese', country: 'Japan', gender: 'Female', locale: 'ja-JP', voiceName: 'NanamiNeural' },
    { key: 'ja-JP-KeitaNeural', language: 'Japanese', country: 'Japan', gender: 'Male', locale: 'ja-JP', voiceName: 'KeitaNeural' },
    
    // German
    { key: 'de-DE-KatjaNeural', language: 'German', country: 'Germany', gender: 'Female', locale: 'de-DE', voiceName: 'KatjaNeural' },
    { key: 'de-DE-ConradNeural', language: 'German', country: 'Germany', gender: 'Male', locale: 'de-DE', voiceName: 'ConradNeural' },
    
    // French
    { key: 'fr-FR-DeniseNeural', language: 'French', country: 'France', gender: 'Female', locale: 'fr-FR', voiceName: 'DeniseNeural' },
    { key: 'fr-FR-HenriNeural', language: 'French', country: 'France', gender: 'Male', locale: 'fr-FR', voiceName: 'HenriNeural' },
    { key: 'fr-CA-SylvieNeural', language: 'French', country: 'Canada', gender: 'Female', locale: 'fr-CA', voiceName: 'SylvieNeural' },
    { key: 'fr-CA-JeanNeural', language: 'French', country: 'Canada', gender: 'Male', locale: 'fr-CA', voiceName: 'JeanNeural' },
    
    // Korean
    { key: 'ko-KR-SunHiNeural', language: 'Korean', country: 'Korea', gender: 'Female', locale: 'ko-KR', voiceName: 'SunHiNeural' },
    { key: 'ko-KR-InJoonNeural', language: 'Korean', country: 'Korea', gender: 'Male', locale: 'ko-KR', voiceName: 'InJoonNeural' },
    
    // Italian
    { key: 'it-IT-ElsaNeural', language: 'Italian', country: 'Italy', gender: 'Female', locale: 'it-IT', voiceName: 'ElsaNeural' },
    { key: 'it-IT-DiegoNeural', language: 'Italian', country: 'Italy', gender: 'Male', locale: 'it-IT', voiceName: 'DiegoNeural' },
    
    // Turkish
    { key: 'tr-TR-EmelNeural', language: 'Turkish', country: 'Türkiye', gender: 'Female', locale: 'tr-TR', voiceName: 'EmelNeural' },
    { key: 'tr-TR-AhmetNeural', language: 'Turkish', country: 'Türkiye', gender: 'Male', locale: 'tr-TR', voiceName: 'AhmetNeural' },
    
    // Polish
    { key: 'pl-PL-AgnieszkaNeural', language: 'Polish', country: 'Poland', gender: 'Female', locale: 'pl-PL', voiceName: 'AgnieszkaNeural' },
    { key: 'pl-PL-MarekNeural', language: 'Polish', country: 'Poland', gender: 'Male', locale: 'pl-PL', voiceName: 'MarekNeural' },
    
    // Vietnamese
    { key: 'vi-VN-HoaiMyNeural', language: 'Vietnamese', country: 'Vietnam', gender: 'Female', locale: 'vi-VN', voiceName: 'HoaiMyNeural' },
    { key: 'vi-VN-NamMinhNeural', language: 'Vietnamese', country: 'Vietnam', gender: 'Male', locale: 'vi-VN', voiceName: 'NamMinhNeural' },
    
    // Indonesian
    { key: 'id-ID-GadisNeural', language: 'Indonesian', country: 'Indonesia', gender: 'Female', locale: 'id-ID', voiceName: 'GadisNeural' },
    { key: 'id-ID-ArdiNeural', language: 'Indonesian', country: 'Indonesia', gender: 'Male', locale: 'id-ID', voiceName: 'ArdiNeural' },
    
    // Dutch
    { key: 'nl-NL-FennaNeural', language: 'Dutch', country: 'Netherlands', gender: 'Female', locale: 'nl-NL', voiceName: 'FennaNeural' },
    { key: 'nl-NL-MaartenNeural', language: 'Dutch', country: 'Netherlands', gender: 'Male', locale: 'nl-NL', voiceName: 'MaartenNeural' },
    
    // Swedish
    { key: 'sv-SE-SofieNeural', language: 'Swedish', country: 'Sweden', gender: 'Female', locale: 'sv-SE', voiceName: 'SofieNeural' },
    { key: 'sv-SE-MattiasNeural', language: 'Swedish', country: 'Sweden', gender: 'Male', locale: 'sv-SE', voiceName: 'MattiasNeural' }
  ];

  async function populateVoices() {
    try {

      await Voice.deleteMany({});
      console.log('Cleared existing voices');
  
      await Voice.insertMany(voicesData);
      console.log('Inserted new voices');
  
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error populating voices:', error);
    }
  }
  
  populateVoices();

  // view engine setup
  // app.set("views", path.join(__dirname, "views"));
  // app.set("view engine", "pug");

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