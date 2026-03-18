const express = require('express');
const router = express.Router();
const Execution = require('../models/Execution');
const { retryExecution } = require('../services/executionService');

// GET /api/executions/:id
router.get('/executions/:id', async (req, res) => {
  try {
    const execution = await Execution.findOne({ id: req.params.id });
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    res.json(execution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/executions - List all executions (audit log)
router.get('/executions', async (req, res) => {
  try {
    const { page = 1, limit = 20, workflow_id, status } = req.query;
    const query = {};
    if (workflow_id) query.workflow_id = workflow_id;
    if (status) query.status = status;

    const total = await Execution.countDocuments(query);
    const executions = await Execution.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      data: executions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/executions/:id/cancel
router.post('/executions/:id/cancel', async (req, res) => {
  try {
    const execution = await Execution.findOne({ id: req.params.id });
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (!['pending', 'in_progress'].includes(execution.status)) {
      return res.status(400).json({ error: 'Can only cancel pending or in_progress executions' });
    }

    execution.status = 'canceled';
    execution.ended_at = new Date();
    await execution.save();

    res.json(execution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/executions/:id/retry
router.post('/executions/:id/retry', async (req, res) => {
  try {
    const execution = await retryExecution(req.params.id);
    res.json(execution);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
