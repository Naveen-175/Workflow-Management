const mongoose = require('mongoose');

const stepLogSchema = new mongoose.Schema({
  step_id: String,
  step_name: String,
  step_type: String,
  evaluated_rules: [{ rule: String, result: Boolean }],
  selected_next_step: String,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'] },
  approver_id: { type: String, default: null },
  error_message: { type: String, default: null },
  metadata: mongoose.Schema.Types.Mixed,
  started_at: Date,
  ended_at: Date,
}, { _id: false });

const executionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  workflow_id: { type: String, required: true },
  workflow_version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
    default: 'pending'
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  logs: { type: [stepLogSchema], default: [] },
  current_step_id: { type: String, default: null },
  retries: { type: Number, default: 0 },
  triggered_by: { type: String, default: 'user' },
  started_at: { type: Date, default: null },
  ended_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Execution', executionSchema);
