import React, { useState } from 'react';

const TYPES = ['string', 'number', 'boolean'];

function FieldRow({ fieldName, rules, onChange, onDelete }) {
  const [allowedInput, setAllowedInput] = useState(
    rules.allowed_values ? rules.allowed_values.join(',') : ''
  );

  const handleAllowedChange = (val) => {
    setAllowedInput(val);
    const arr = val.split(',').map(s => s.trim()).filter(Boolean);
    onChange({ ...rules, allowed_values: arr.length > 0 ? arr : undefined });
  };

  return (
    <div style={{
      background: 'var(--bg-3)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 8
    }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 100 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Field Name</div>
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '7px 10px',
            fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent-2)'
          }}>{fieldName}</div>
        </div>
        <div style={{ flex: 1, minWidth: 90 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Type</div>
          <select
            className="form-input"
            value={rules.type || 'string'}
            onChange={e => onChange({ ...rules, type: e.target.value })}
          >
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={!!rules.required}
              onChange={e => onChange({ ...rules, required: e.target.checked })}
              style={{ accentColor: 'var(--accent)' }}
            />
            Required
          </label>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>✕</button>
        </div>
      </div>

      {rules.type === 'string' && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
            Allowed Values <span style={{ color: 'var(--text-3)' }}>(comma-separated, leave empty for any)</span>
          </div>
          <input
            className="form-input"
            placeholder="e.g. High,Medium,Low"
            value={allowedInput}
            onChange={e => handleAllowedChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

export default function InputSchemaEditor({ schema, onChange }) {
  const [newField, setNewField] = useState('');

  const addField = () => {
    const key = newField.trim();
    if (!key || schema[key]) return;
    onChange({ ...schema, [key]: { type: 'string', required: true } });
    setNewField('');
  };

  const updateField = (key, rules) => {
    onChange({ ...schema, [key]: rules });
  };

  const deleteField = (key) => {
    const updated = { ...schema };
    delete updated[key];
    onChange(updated);
  };

  return (
    <div>
      {Object.entries(schema).map(([key, rules]) => (
        <FieldRow
          key={key}
          fieldName={key}
          rules={rules}
          onChange={(r) => updateField(key, r)}
          onDelete={() => deleteField(key)}
        />
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          className="form-input"
          placeholder="New field name (e.g. amount)"
          value={newField}
          onChange={e => setNewField(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addField()}
          style={{ fontFamily: 'var(--mono)' }}
        />
        <button
          className="btn btn-secondary"
          onClick={addField}
          disabled={!newField.trim()}
        >+ Add Field</button>
      </div>

      {Object.keys(schema).length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 12 }}>
            Preview JSON Schema
          </summary>
          <pre className="code-block" style={{ marginTop: 8, maxHeight: 180, overflow: 'auto' }}>
            {JSON.stringify(schema, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
