const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  version: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
  input_schema: { type: mongoose.Schema.Types.Mixed, default: {} },
  start_step_id: { type: String, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Workflow', workflowSchema);
