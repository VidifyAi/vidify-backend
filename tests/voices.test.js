// Install: npm install jest supertest --save-dev

// Create a sample test file: /workspaces/vidify-backend/tests/voices.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { getApp } = require('../app');
const Voice = require('../models/voices');

describe('Voice API Endpoints', () => {
  let app;
  
  beforeAll(async () => {
    app = await getApp();
    await mongoose.connect(process.env.MONGODB_URI_TEST);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    await Voice.deleteMany({});
    await Voice.create([
      { key: 'test-voice-1', language: 'English', country: 'US', gender: 'Female', locale: 'en-US', voiceName: 'TestVoice1' },
      { key: 'test-voice-2', language: 'English', country: 'UK', gender: 'Male', locale: 'en-GB', voiceName: 'TestVoice2' }
    ]);
  });
  
  describe('GET /api/voices', () => {
    it('should return all voices', async () => {
      const res = await request(app).get('/api/voices');
      
      expect(res.status).toBe(200);
      expect(res.body.voices.length).toBe(2);
      expect(res.body.count).toBe(2);
    });
  });
});

// Add to package.json:
// "scripts": {
//   "test": "jest"
// }