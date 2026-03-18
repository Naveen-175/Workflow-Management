const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Rule = require('../models/Rule');
const Step = require('../models/Step');
const { evaluateCondition } = require('../services/ruleEngine');

// POST /api/steps/:step_id/rules
router.post('/steps/:step_id/rules', async (req, res) => {
  try {
    const step = await Step.findOne({ id: req.params.step_id });
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const { condition, next_step_id, priority } = req.body;
    if (!condition) return res.status(400).json({ error: 'condition is required' });

    // Validate condition syntax (except DEFAULT)
    if (condition.trim().toUpperCase() !== 'DEFAULT') {
      try {
        evaluateCondition(condition, {});
      } catch (err) {
        // Allow syntax errors here since fields may not exist in empty data
        // Just check for obviously malicious patterns
        if (/require|import|process|__dirname|eval|Function/.test(condition)) {
          return res.status(400).json({ error: 'Invalid condition: disallowed keywords' });
        }
      }
    }

    // Auto-assign priority
    let rulePriority = priority;
    if (rulePriority === undefined) {
      const lastRule = await Rule.findOne({ step_id: req.params.step_id }).sort({ priority: -1 });
      rulePriority = lastRule ? lastRule.priority + 1 : 1;
    }

    const rule = new Rule({
      id: uuidv4(),
      step_id: req.params.step_id,
      condition,
      next_step_id: next_step_id || null,
      priority: rulePriority
    });

    await rule.save();
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/steps/:step_id/rules
router.get('/steps/:step_id/rules', async (req, res) => {
  try {
    const rules = await Rule.find({ step_id: req.params.step_id }).sort({ priority: 1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/rules/:id
router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await Rule.findOne({ id: req.params.id });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const { condition, next_step_id, priority } = req.body;
    if (condition) {
      if (/require|import|process|__dirname|eval/.test(condition)) {
        return res.status(400).json({ error: 'Invalid condition: disallowed keywords' });
      }
      rule.condition = condition;
    }
    if (next_step_id !== undefined) rule.next_step_id = next_step_id;
    if (priority !== undefined) rule.priority = priority;

    await rule.save();
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rules/:id
router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await Rule.findOne({ id: req.params.id });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    await Rule.deleteOne({ id: req.params.id });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
