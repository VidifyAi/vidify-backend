const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    trim: true,
  },
  taskId: String,
  status: { 
    type: String, 
    enum: ['pending', 'success', 'failed'], 
    default: 'active' 
  },
  createDate: Date,
  completedDate: Date,
  completed: Boolean
});

module.exports = mongoose.model('Task', taskSchema);