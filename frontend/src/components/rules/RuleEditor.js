import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getRules, createRule, updateRule, deleteRule } from '../../utils/api';

function RuleModal({ rule, steps, currentStepId, onClose, onSave }) {
  const [condition, setCondition] = useState(rule?.condition || '');
  const [nextStepId, setNextStepId] = useState(rule?.next_step_id || '');
  const [priority, setPriority] = useState(rule?.priority ?? '');
  const [saving, setSaving] = useState(false);

  const availableSteps = steps.filter(s => s.id !== currentStepId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!condition.trim()) return;
    setSaving(true);
    try {
      await onSave({
        condition: condition.trim(),
        next_step_id: nextStepId || null,
        priority: priority !== '' ? Number(priority) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const conditionExamples = [
    "amount > 100 && country == 'US'",
    "priority == 'High'",
    "amount <= 100 || department == 'HR'",
    "contains(country, 'US')",
    "DEFAULT",
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{rule ? 'Edit Rule' : 'Add Rule'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Condition *
              <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>
                (use field names from input schema, or type DEFAULT)
              </span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. amount > 100 && country == 'US' && priority == 'High'"
              value={condition}
              onChange={e => setCondition(e.target.value)}
              autoFocus
            />
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Quick examples:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {conditionExamples.map(ex => (
                  <button
                    type="button"
                    key={ex}
                    className="btn btn-ghost btn-sm"
                    style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '3px 8px' }}
                    onClick={() => setCondition(ex)}
                  >{ex}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Next Step
              <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>
                (leave empty to end workflow)
              </span>
            </label>
            <select
              className="form-input"
              value={nextStepId}
              onChange={e => setNextStepId(e.target.value)}
            >
              <option value="">— End Workflow —</option>
              {availableSteps.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.step_type})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Priority <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(lower = evaluated first)</span></label>
            <input
              className="form-input"
              type="number"
              placeholder="Auto-assigned"
              value={priority}
              onChange={e => setPriority(e.target.value)}
              min={1}
            />
          </div>

          <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>Supported Operators</div>
            <div style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', lineHeight: 1.8 }}>
              == &nbsp;!= &nbsp;&lt; &nbsp;&gt; &nbsp;&lt;= &nbsp;&gt;= &nbsp;&amp;&amp; &nbsp;||<br />
              contains(field, "value") &nbsp;startsWith(field, "val") &nbsp;endsWith(field, "val")
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!condition.trim() || saving}>
              {saving ? 'Saving...' : rule ? 'Update Rule' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RuleEditor({ step, steps, onRulesUpdated }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRules(step.id);
      setRules(data);
    } catch {
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [step.id]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = async (formData) => {
    try {
      if (editingRule) {
        await updateRule(editingRule.id, formData);
        toast.success('Rule updated');
      } else {
        await createRule(step.id, formData);
        toast.success('Rule added');
      }
      setShowModal(false);
      fetchRules();
      onRulesUpdated?.();
    } catch (err) {
      toast.error(err.error || 'Failed to save rule');
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await deleteRule(rule.id);
      toast.success('Rule deleted');
      fetchRules();
      onRulesUpdated?.();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Drag-and-drop priority reordering
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...rules];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setDragIdx(idx);
    setRules(reordered);
  };
  const handleDragEnd = async () => {
    setDragIdx(null);
    // Save new priorities
    try {
      await Promise.all(rules.map((r, i) => updateRule(r.id, { priority: i + 1 })));
      toast.success('Priority order saved');
      fetchRules();
      onRulesUpdated?.();
    } catch {
      toast.error('Failed to save order');
    }
  };

  const getNextStepName = (nextStepId) => {
    if (!nextStepId) return <span style={{ color: 'var(--text-3)' }}>— End Workflow —</span>;
    const s = steps.find(st => st.id === nextStepId);
    return s ? <span style={{ color: 'var(--accent-2)' }}>{s.name}</span> : nextStepId.slice(0, 8) + '...';
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          {rules.length} rule{rules.length !== 1 ? 's' : ''} · Drag rows to reorder priority
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingRule(null); setShowModal(true); }}>
          + Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="icon">⚙</div>
            <h3>No rules yet</h3>
            <p>Add rules to control workflow routing</p>
            <div style={{ marginTop: 6, padding: '8px 12px', background: 'var(--yellow-light)', borderRadius: 6, fontSize: 12, color: 'var(--yellow)' }}>
              ⚠ A DEFAULT rule is required as a fallback
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '36px 40px 1fr 1fr 80px',
            gap: 8, padding: '6px 12px',
            fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            <span></span>
            <span>Pri.</span>
            <span>Condition</span>
            <span>Next Step</span>
            <span>Actions</span>
          </div>

          {rules.map((rule, idx) => (
            <div
              key={rule.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              style={{
                display: 'grid', gridTemplateColumns: '36px 40px 1fr 1fr 80px',
                gap: 8, padding: '10px 12px', alignItems: 'center',
                background: dragIdx === idx ? 'var(--bg-4)' : 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', marginBottom: 4,
                transition: 'background 0.1s',
                cursor: 'grab',
              }}
            >
              <span style={{ color: 'var(--text-3)', fontSize: 16, cursor: 'grab' }}>⠿</span>
              <span style={{
                width: 26, height: 26, borderRadius: '50%',
                background: rule.condition.trim().toUpperCase() === 'DEFAULT' ? 'var(--yellow-light)' : 'var(--accent-light)',
                color: rule.condition.trim().toUpperCase() === 'DEFAULT' ? 'var(--yellow)' : 'var(--accent-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700
              }}>{idx + 1}</span>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 12,
                color: rule.condition.trim().toUpperCase() === 'DEFAULT' ? 'var(--yellow)' : 'var(--text)',
                wordBreak: 'break-all'
              }}>{rule.condition}</span>
              <span style={{ fontSize: 13 }}>{getNextStepName(rule.next_step_id)}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px' }}
                  onClick={() => { setEditingRule(rule); setShowModal(true); }}
                >✏</button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ padding: '4px 8px' }}
                  onClick={() => handleDelete(rule)}
                >✕</button>
              </div>
            </div>
          ))}

          {!rules.some(r => r.condition.trim().toUpperCase() === 'DEFAULT') && (
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: 'var(--yellow-light)', borderRadius: 6,
              fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6
            }}>
              ⚠ No DEFAULT rule found. Add one to handle unmatched conditions.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <RuleModal
          rule={editingRule}
          steps={steps}
          currentStepId={step.id}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
