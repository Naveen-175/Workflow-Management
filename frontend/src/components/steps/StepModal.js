import React, { useState } from 'react';

const STEP_TYPES = [
  { value: 'task', label: 'Task', desc: 'Automated or manual action' },
  { value: 'approval', label: 'Approval', desc: 'Requires user approval' },
  { value: 'notification', label: 'Notification', desc: 'Sends alerts/messages' },
];

export default function StepModal({ step, onClose, onSave }) {
  const [name, setName] = useState(step?.name || '');
  const [stepType, setStepType] = useState(step?.step_type || 'task');
  const [order, setOrder] = useState(step?.order ?? '');
  const [metaJson, setMetaJson] = useState(
    step?.metadata ? JSON.stringify(step.metadata, null, 2) : '{}'
  );
  const [metaError, setMetaError] = useState('');
  const [saving, setSaving] = useState(false);

  const validateMeta = (val) => {
    try { JSON.parse(val); setMetaError(''); return true; }
    catch { setMetaError('Invalid JSON'); return false; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!validateMeta(metaJson)) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        step_type: stepType,
        order: order !== '' ? Number(order) : undefined,
        metadata: JSON.parse(metaJson),
      });
    } finally {
      setSaving(false);
    }
  };

  const metaPlaceholders = {
    task: '{\n  "instructions": "Process the request"\n}',
    approval: '{\n  "assignee_email": "manager@example.com"\n}',
    notification: '{\n  "notification_channel": "email",\n  "template": "Your request has been processed"\n}',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{step ? 'Edit Step' : 'Add Step'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Step Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Manager Approval"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Step Type *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {STEP_TYPES.map(t => (
                <div
                  key={t.value}
                  onClick={() => setStepType(t.value)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${stepType === t.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: stepType === t.value ? 'var(--accent-light)' : 'var(--bg-3)',
                    cursor: 'pointer', transition: 'all 0.12s'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: stepType === t.value ? 'var(--accent-2)' : 'var(--text)' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Order <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(leave empty for auto)</span></label>
            <input
              className="form-input"
              type="number"
              placeholder="Auto-assigned"
              value={order}
              onChange={e => setOrder(e.target.value)}
              min={1}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Metadata <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(JSON)</span>
            </label>
            <textarea
              className="form-input"
              rows={5}
              value={metaJson}
              onChange={e => { setMetaJson(e.target.value); validateMeta(e.target.value); }}
              placeholder={metaPlaceholders[stepType]}
            />
            {metaError && <span style={{ color: 'var(--red)', fontSize: 12 }}>{metaError}</span>}
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              {stepType === 'approval' && 'Use assignee_email for the approver.'}
              {stepType === 'notification' && 'Use notification_channel: "email" | "slack" | "ui" and template.'}
              {stepType === 'task' && 'Use instructions to describe what the task should do.'}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || !!metaError || saving}>
              {saving ? 'Saving...' : step ? 'Update Step' : 'Add Step'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
