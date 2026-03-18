const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  step_id: { type: String, required: true, ref: 'Step' },
  condition: { type: String, required: true }, // "DEFAULT" or expression
  next_step_id: { type: String, default: null }, // null = end workflow
  priority: { type: Number, default: 99 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Rule', ruleSchema);
