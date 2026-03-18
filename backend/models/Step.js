const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  workflow_id: { type: String, required: true, ref: 'Workflow' },
  name: { type: String, required: true },
  step_type: { type: String, enum: ['task', 'approval', 'notification'], required: true },
  order: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Step', stepSchema);
