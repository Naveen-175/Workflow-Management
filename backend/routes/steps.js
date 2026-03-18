const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Workflow = require('../models/Workflow');

// POST /api/workflows/:workflow_id/steps
router.post('/workflows/:workflow_id/steps', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ id: req.params.workflow_id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const { name, step_type, order, metadata } = req.body;
    if (!name || !step_type) return res.status(400).json({ error: 'name and step_type are required' });
    if (!['task', 'approval', 'notification'].includes(step_type)) {
      return res.status(400).json({ error: 'step_type must be task, approval, or notification' });
    }

    // Auto-assign order if not provided
    let stepOrder = order;
    if (stepOrder === undefined) {
      const lastStep = await Step.findOne({ workflow_id: req.params.workflow_id }).sort({ order: -1 });
      stepOrder = lastStep ? lastStep.order + 1 : 1;
    }

    const step = new Step({
      id: uuidv4(),
      workflow_id: req.params.workflow_id,
      name,
      step_type,
      order: stepOrder,
      metadata: metadata || {}
    });

    await step.save();

    // If this is the first step, set as start_step_id
    const existingSteps = await Step.countDocuments({ workflow_id: req.params.workflow_id });
    if (existingSteps === 1) {
      workflow.start_step_id = step.id;
      await workflow.save();
    }

    res.status(201).json(step);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows/:workflow_id/steps
router.get('/workflows/:workflow_id/steps', async (req, res) => {
  try {
    const steps = await Step.find({ workflow_id: req.params.workflow_id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(steps.map(async (step) => {
      const rules = await Rule.find({ step_id: step.id }).sort({ priority: 1 });
      return { ...step.toObject(), rules };
    }));
    res.json(stepsWithRules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/steps/:id
router.put('/steps/:id', async (req, res) => {
  try {
    const step = await Step.findOne({ id: req.params.id });
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const { name, step_type, order, metadata } = req.body;
    if (name) step.name = name;
    if (step_type) step.step_type = step_type;
    if (order !== undefined) step.order = order;
    if (metadata) step.metadata = metadata;

    await step.save();

    // Increment workflow version
    await Workflow.updateOne({ id: step.workflow_id }, { $inc: { version: 1 } });

    res.json(step);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/steps/:id
router.delete('/steps/:id', async (req, res) => {
  try {
    const step = await Step.findOne({ id: req.params.id });
    if (!step) return res.status(404).json({ error: 'Step not found' });

    await Rule.deleteMany({ step_id: step.id });
    await Step.deleteOne({ id: req.params.id });

    // If this was the start step, update workflow
    const workflow = await Workflow.findOne({ id: step.workflow_id });
    if (workflow && workflow.start_step_id === step.id) {
      const firstStep = await Step.findOne({ workflow_id: step.workflow_id }).sort({ order: 1 });
      workflow.start_step_id = firstStep ? firstStep.id : null;
      await workflow.save();
    }

    res.json({ message: 'Step deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
