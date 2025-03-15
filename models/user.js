const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  profileImageUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSignIn: {
    type: Date
  },
  metadata: {
    type: Object,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('User', UserSchema);