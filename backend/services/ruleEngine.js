/**
 * Rule Engine - evaluates conditions against input data
 * Supports: ==, !=, <, >, <=, >=, &&, ||
 * String functions: contains(field, "value"), startsWith(field, "prefix"), endsWith(field, "suffix")
 */

function evaluateCondition(condition, data) {
  if (!condition || condition.trim().toUpperCase() === 'DEFAULT') return true;

  try {
    // Build safe expression
    let expr = condition;

    // Replace string functions with JS equivalents
    expr = expr.replace(/contains\((\w+),\s*["'](.+?)["']\)/g, (_, field, value) => {
      const fieldVal = data[field];
      if (fieldVal === undefined) return 'false';
      return String(fieldVal).includes(value) ? 'true' : 'false';
    });

    expr = expr.replace(/startsWith\((\w+),\s*["'](.+?)["']\)/g, (_, field, value) => {
      const fieldVal = data[field];
      if (fieldVal === undefined) return 'false';
      return String(fieldVal).startsWith(value) ? 'true' : 'false';
    });

    expr = expr.replace(/endsWith\((\w+),\s*["'](.+?)["']\)/g, (_, field, value) => {
      const fieldVal = data[field];
      if (fieldVal === undefined) return 'false';
      return String(fieldVal).endsWith(value) ? 'true' : 'false';
    });

    // Replace field names with their values from data
    // Match word tokens that are field names (not operators, not string literals, not numbers)
    const fieldPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    expr = expr.replace(fieldPattern, (match) => {
      // Skip JS keywords / booleans
      if (['true', 'false', 'null', 'undefined', 'AND', 'OR'].includes(match)) return match;
      if (match in data) {
        const val = data[match];
        if (typeof val === 'string') return `"${val}"`;
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        return `"${val}"`;
      }
      return match;
    });

    // Replace && and || (already JS syntax) — ensure safety
    // Use Function constructor in a controlled way
    const fn = new Function(`"use strict"; return (${expr});`);
    return fn();
  } catch (err) {
    console.error(`Rule evaluation error for condition "${condition}":`, err.message);
    throw new Error(`Invalid condition: ${condition} — ${err.message}`);
  }
}

/**
 * Evaluate all rules for a step in priority order.
 * Returns { nextStepId, matchedRule, evaluatedRules }
 */
function evaluateRules(rules, data) {
  // Sort by priority ascending
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  const evaluatedRules = [];
  let matchedRule = null;

  for (const rule of sorted) {
    const isDefault = rule.condition.trim().toUpperCase() === 'DEFAULT';
    let result = false;
    let error = null;

    try {
      result = evaluateCondition(rule.condition, data);
    } catch (err) {
      error = err.message;
      result = false;
    }

    evaluatedRules.push({
      rule: rule.condition,
      result,
      priority: rule.priority,
      next_step_id: rule.next_step_id,
      error
    });

    if (result && !matchedRule) {
      matchedRule = rule;
    }
  }

  return {
    matchedRule,
    evaluatedRules,
    nextStepId: matchedRule ? matchedRule.next_step_id : null
  };
}

module.exports = { evaluateCondition, evaluateRules };
