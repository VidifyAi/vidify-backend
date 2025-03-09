const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VoiceSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  language: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  locale: {
    type: String,
    required: true
  },
  voiceName: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Voice', VoiceSchema);