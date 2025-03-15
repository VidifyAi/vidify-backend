// Install: npm install redis

// Create /workspaces/vidify-backend/services/cache.js
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis error:', err));

(async () => {
  await client.connect();
})();

async function getCache(key) {
  try {
    const cachedData = await client.get(key);
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

async function setCache(key, data, expireSeconds = 3600) {
  try {
    await client.set(key, JSON.stringify(data), { EX: expireSeconds });
    return true;
  } catch (error) {
    console.error('Redis set error:', error);
    return false;
  }
}

async function clearCache(pattern) {
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Redis clear error:', error);
    return false;
  }
}

module.exports = {
  getCache,
  setCache,
  clearCache
};

// Use in routes, for example in voices.js:
const { getCache, setCache } = require('../services/cache');

router.get("/", async (req, res) => {
  try {
    // Try to get from cache first
    const cachedVoices = await getCache('voices:all');
    
    if (cachedVoices) {
      return res.status(200).json(cachedVoices);
    }
    
    // If not in cache, get from database
    const voices = await Voice.find().lean();

    if (!voices || voices.length === 0) {
      return res.status(200).json({
        message: "No voices found",
        voices: []
      });
    }

    const response = {
      count: voices.length,
      voices: voices
    };
    
    // Store in cache for future requests
    await setCache('voices:all', response, 3600); // Cache for 1 hour
    
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({
      message: "Failed to retrieve voices",
      details: error.message
    });
  }
});