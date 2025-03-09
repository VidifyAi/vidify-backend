const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  taskName: {
    type: String,
    required: true
  },
  taskId: {
    type: String,
    required: true,
    unique: true
  },
  createDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  videoUrl: {
    type: String
  },
  metadata: {
    type: Object
  }
});

module.exports = mongoose.model('Task', TaskSchema);