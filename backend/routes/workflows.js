const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Execution = require('../models/Execution');
const { executeWorkflow } = require('../services/executionService');

// POST /api/workflows - Create workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, input_schema } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const workflow = new Workflow({
      id: uuidv4(),
      name,
      description: description || '',
      version: 1,
      is_active: true,
      input_schema: input_schema || {},
      start_step_id: null,
    });

    await workflow.save();
    res.status(201).json(workflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflows - List with pagination & search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (status === 'active') query.is_active = true;
    if (status === 'inactive') query.is_active = false;

    const total = await Workflow.countDocuments(query);
    const workflows = await Workflow.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Enrich with step count
    const enriched = await Promise.all(workflows.map(async (wf) => {
      const stepCount = await Step.countDocuments({ workflow_id: wf.id });
      return { ...wf.toObject(), step_count: stepCount };
    }));

    res.json({
      data: enriched,
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

// GET /api/workflows/:id - Get workflow with steps and rules
router.get('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ id: req.params.id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const steps = await Step.find({ workflow_id: req.params.id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(steps.map(async (step) => {
      const rules = await Rule.find({ step_id: step.id }).sort({ priority: 1 });
      return { ...step.toObject(), rules };
    }));

    res.json({ ...workflow.toObject(), steps: stepsWithRules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflows/:id - Update (creates new version)
router.put('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ id: req.params.id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const { name, description, input_schema, is_active, start_step_id } = req.body;

    if (name) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (input_schema) workflow.input_schema = input_schema;
    if (is_active !== undefined) workflow.is_active = is_active;
    if (start_step_id !== undefined) workflow.start_step_id = start_step_id;
    workflow.version += 1;

    await workflow.save();
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findOne({ id: req.params.id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    // Cascade delete steps and rules
    const steps = await Step.find({ workflow_id: req.params.id });
    for (const step of steps) {
      await Rule.deleteMany({ step_id: step.id });
    }
    await Step.deleteMany({ workflow_id: req.params.id });
    await Workflow.deleteOne({ id: req.params.id });

    res.json({ message: 'Workflow deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflows/:workflow_id/execute
router.post('/:workflow_id/execute', async (req, res) => {
  try {
    const { data, triggered_by } = req.body;
    const execution = await executeWorkflow(req.params.workflow_id, data || {}, triggered_by || 'user');
    res.status(201).json(execution);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
