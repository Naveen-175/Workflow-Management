const { v4: uuidv4 } = require('uuid');
const Execution = require('../models/Execution');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Workflow = require('../models/Workflow');
const { evaluateRules } = require('./ruleEngine');

const MAX_LOOP_ITERATIONS = 20; // Prevent infinite loops

async function executeWorkflow(workflowId, inputData, triggeredBy = 'user') {
  const workflow = await Workflow.findOne({ id: workflowId, is_active: true });
  if (!workflow) throw new Error('Workflow not found or inactive');

  // Validate input against input_schema
  const validationErrors = validateInput(inputData, workflow.input_schema);
  if (validationErrors.length > 0) {
    throw new Error(`Input validation failed: ${validationErrors.join(', ')}`);
  }

  // Get all steps for the workflow, sorted by order
  const steps = await Step.find({ workflow_id: workflowId }).sort({ order: 1 });
  if (steps.length === 0) throw new Error('Workflow has no steps');

  const execution = new Execution({
    id: uuidv4(),
    workflow_id: workflowId,
    workflow_version: workflow.version,
    status: 'in_progress',
    data: inputData,
    logs: [],
    current_step_id: workflow.start_step_id || steps[0].id,
    triggered_by: triggeredBy,
    started_at: new Date(),
  });

  await execution.save();

  // Run the execution engine
  try {
    await runExecution(execution, steps, inputData);
  } catch (err) {
    execution.status = 'failed';
    execution.ended_at = new Date();
    await execution.save();
  }

  return execution;
}

async function runExecution(execution, steps, inputData) {
  const stepMap = {};
  steps.forEach(s => stepMap[s.id] = s);

  let currentStepId = execution.current_step_id;
  let iterations = 0;

  while (currentStepId && iterations < MAX_LOOP_ITERATIONS) {
    iterations++;
    const currentStep = stepMap[currentStepId];

    if (!currentStep) {
      // Step not found - workflow ends
      break;
    }

    execution.current_step_id = currentStepId;
    await execution.save();

    const stepLog = {
      step_id: currentStep.id,
      step_name: currentStep.name,
      step_type: currentStep.step_type,
      evaluated_rules: [],
      selected_next_step: null,
      status: 'in_progress',
      started_at: new Date(),
      metadata: currentStep.metadata || {}
    };

    try {
      // Get rules for this step
      const rules = await Rule.find({ step_id: currentStep.id }).sort({ priority: 1 });

      let nextStepId = null;

      if (rules.length === 0) {
        // No rules — go to next step by order
        const currentOrder = currentStep.order;
        const nextStep = steps.find(s => s.order > currentOrder);
        nextStepId = nextStep ? nextStep.id : null;
        stepLog.selected_next_step = nextStep ? nextStep.name : 'END';
      } else {
        const { matchedRule, evaluatedRules, nextStepId: ruleNextStep } = evaluateRules(rules, inputData);

        stepLog.evaluated_rules = evaluatedRules.map(r => ({
          rule: r.rule,
          result: r.result
        }));

        if (!matchedRule) {
          // No rule matched, check for DEFAULT
          const defaultRule = rules.find(r => r.condition.trim().toUpperCase() === 'DEFAULT');
          if (defaultRule) {
            nextStepId = defaultRule.next_step_id;
            stepLog.selected_next_step = await getStepName(nextStepId);
          } else {
            throw new Error('No matching rule and no DEFAULT rule found');
          }
        } else {
          nextStepId = ruleNextStep;
          stepLog.selected_next_step = nextStepId ? await getStepName(nextStepId) : 'END';
        }
      }

      // For approval steps, we mark as pending (real approval handled via API)
      if (currentStep.step_type === 'approval') {
        stepLog.status = 'completed'; // Auto-complete for demo; real app would pause
        stepLog.approver_id = currentStep.metadata?.assignee_email || null;
      } else if (currentStep.step_type === 'notification') {
        // Simulate notification sending
        console.log(`📧 Notification sent for step: ${currentStep.name}`);
        stepLog.status = 'completed';
      } else {
        // Task step
        stepLog.status = 'completed';
      }

      stepLog.ended_at = new Date();
      execution.logs.push(stepLog);

      currentStepId = nextStepId;

    } catch (err) {
      stepLog.status = 'failed';
      stepLog.error_message = err.message;
      stepLog.ended_at = new Date();
      execution.logs.push(stepLog);

      execution.status = 'failed';
      execution.ended_at = new Date();
      await execution.save();
      return;
    }
  }

  if (iterations >= MAX_LOOP_ITERATIONS) {
    execution.status = 'failed';
    execution.logs.push({
      step_name: 'SYSTEM',
      step_type: 'task',
      status: 'failed',
      error_message: `Maximum loop iterations (${MAX_LOOP_ITERATIONS}) reached`,
      started_at: new Date(),
      ended_at: new Date()
    });
  } else {
    execution.status = 'completed';
  }

  execution.current_step_id = null;
  execution.ended_at = new Date();
  await execution.save();
}

async function getStepName(stepId) {
  if (!stepId) return 'END';
  const step = await Step.findOne({ id: stepId });
  return step ? step.name : stepId;
}

function validateInput(data, schema) {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${field}" is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rules.type === 'number' && typeof value !== 'number') {
      errors.push(`Field "${field}" must be a number`);
    }
    if (rules.type === 'string' && typeof value !== 'string') {
      errors.push(`Field "${field}" must be a string`);
    }
    if (rules.allowed_values && !rules.allowed_values.includes(value)) {
      errors.push(`Field "${field}" must be one of: ${rules.allowed_values.join(', ')}`);
    }
  }
  return errors;
}

async function retryExecution(executionId) {
  const execution = await Execution.findOne({ id: executionId });
  if (!execution) throw new Error('Execution not found');
  if (execution.status !== 'failed') throw new Error('Only failed executions can be retried');

  // Find the failed step
  const failedLog = [...execution.logs].reverse().find(l => l.status === 'failed');
  const retryFromStepId = failedLog ? failedLog.step_id : null;

  execution.status = 'in_progress';
  execution.retries = (execution.retries || 0) + 1;
  execution.current_step_id = retryFromStepId;
  execution.ended_at = null;

  await execution.save();

  const steps = await Step.find({ workflow_id: execution.workflow_id }).sort({ order: 1 });

  try {
    await runExecution(execution, steps, execution.data);
  } catch (err) {
    execution.status = 'failed';
    execution.ended_at = new Date();
    await execution.save();
  }

  return execution;
}

module.exports = { executeWorkflow, retryExecution };
