import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getWorkflow, executeWorkflow, getExecution, cancelExecution, retryExecution } from '../utils/api';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function DotStatus({ status }) {
  const dotMap = {
    completed: 'dot-green', failed: 'dot-red',
    in_progress: 'dot-blue', pending: 'dot-yellow',
    canceled: 'dot-gray'
  };
  return <span className={`status-dot ${dotMap[status] || 'dot-gray'}`} />;
}

export default function ExecutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [inputData, setInputData] = useState({});
  const [inputErrors, setInputErrors] = useState({});
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [polling, setPolling] = useState(false);

  const isExecutionMode = !id.includes('-') ? false : true;

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      try {
        // Check if id is a workflow id or execution id
        // Try workflow first
        try {
          const wf = await getWorkflow(id);
          setWorkflow(wf);
          // Pre-fill default input
          const defaults = {};
          if (wf.input_schema) {
            Object.entries(wf.input_schema).forEach(([k, v]) => {
              if (v.type === 'number') defaults[k] = '';
              else if (v.allowed_values) defaults[k] = v.allowed_values[0] || '';
              else defaults[k] = '';
            });
          }
          setInputData(defaults);
        } catch {
          // Maybe it's an execution id
          const exec = await getExecution(id);
          setExecution(exec);
          const wf = await getWorkflow(exec.workflow_id);
          setWorkflow(wf);
          setInputData(exec.data || {});
        }
      } catch (err) {
        toast.error('Not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadPage();
  }, [id, navigate]);

  const validateInputs = () => {
    const errors = {};
    const schema = workflow?.input_schema || {};
    Object.entries(schema).forEach(([field, rules]) => {
      const val = inputData[field];
      if (rules.required && (val === undefined || val === null || val === '')) {
        errors[field] = 'This field is required';
      }
      if (val && rules.type === 'number' && isNaN(Number(val))) {
        errors[field] = 'Must be a number';
      }
      if (val && rules.allowed_values && !rules.allowed_values.includes(val)) {
        errors[field] = `Must be one of: ${rules.allowed_values.join(', ')}`;
      }
    });
    setInputErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExecute = async () => {
    if (!validateInputs()) return;

    setRunning(true);
    try {
      // Cast types
      const castData = {};
      Object.entries(inputData).forEach(([k, v]) => {
        const fieldSchema = workflow?.input_schema?.[k];
        if (fieldSchema?.type === 'number') castData[k] = Number(v);
        else castData[k] = v;
      });

      const exec = await executeWorkflow(workflow.id, { data: castData, triggered_by: 'user' });
      setExecution(exec);
      toast.success('Execution started!');
    } catch (err) {
      toast.error(err.error || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = async () => {
    try {
      const updated = await cancelExecution(execution.id);
      setExecution(updated);
      toast.success('Execution canceled');
    } catch (err) {
      toast.error(err.error || 'Failed to cancel');
    }
  };

  const handleRetry = async () => {
    setRunning(true);
    try {
      const updated = await retryExecution(execution.id);
      setExecution(updated);
      toast.success('Retrying execution...');
    } catch (err) {
      toast.error(err.error || 'Failed to retry');
    } finally {
      setRunning(false);
    }
  };

  const renderInputField = (field, rules) => {
    if (rules.allowed_values) {
      return (
        <select
          className="form-input"
          value={inputData[field] || ''}
          onChange={e => setInputData(d => ({ ...d, [field]: e.target.value }))}
        >
          <option value="">Select...</option>
          {rules.allowed_values.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      );
    }
    return (
      <input
        className="form-input"
        type={rules.type === 'number' ? 'number' : 'text'}
        placeholder={`Enter ${rules.type}`}
        value={inputData[field] || ''}
        onChange={e => setInputData(d => ({ ...d, [field]: e.target.value }))}
      />
    );
  };

  const formatDuration = (start, end) => {
    if (!start) return '-';
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const diff = Math.round((e - s) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  };

  if (loading) return <div className="loading"><div className="spinner" /> Loading...</div>;
  if (!workflow) return null;

  const schema = workflow.input_schema || {};
  const hasSchema = Object.keys(schema).length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/workflows/${workflow.id}/edit`)}>← Editor</button>
            <span style={{ color: 'var(--text-3)' }}>/</span>
            <span style={{ fontWeight: 600 }}>{workflow.name}</span>
          </div>
          <h1 className="page-title">Execute Workflow</h1>
          <p className="page-subtitle">v{workflow.version}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: execution ? '1fr 1.5fr' : '1fr', gap: 20 }}>
        {/* Input Form */}
        <div>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
              {execution ? '📥 Input Data' : '📥 Enter Input Data'}
            </h3>

            {!hasSchema ? (
              <p style={{ color: 'var(--text-3)', fontSize: 13 }}>This workflow has no input schema defined.</p>
            ) : (
              Object.entries(schema).map(([field, rules]) => (
                <div className="form-group" key={field}>
                  <label className="form-label">
                    {field}
                    {rules.required && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
                    <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6, textTransform: 'none' }}>
                      ({rules.type})
                    </span>
                  </label>
                  {execution ? (
                    <div style={{
                      background: 'var(--bg-3)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '9px 12px',
                      fontFamily: 'var(--mono)', fontSize: 13
                    }}>
                      {String(execution.data[field] ?? '—')}
                    </div>
                  ) : renderInputField(field, rules)}
                  {inputErrors[field] && (
                    <span style={{ color: 'var(--red)', fontSize: 12 }}>{inputErrors[field]}</span>
                  )}
                </div>
              ))
            )}

            {!execution && (
              <button
                className="btn btn-primary w-full"
                style={{ marginTop: 8, justifyContent: 'center' }}
                onClick={handleExecute}
                disabled={running}
              >
                {running ? <><div className="spinner" /> Running...</> : '▶ Start Execution'}
              </button>
            )}
          </div>

          {execution && (
            <div className="card" style={{ marginTop: 14 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Execution Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Status</span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <DotStatus status={execution.status} />
                    <StatusBadge status={execution.status} />
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Execution ID</span>
                  <span className="font-mono text-sm" style={{ userSelect: 'all' }}>{execution.id.slice(0, 12)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Version</span>
                  <span>v{execution.workflow_version}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Duration</span>
                  <span>{formatDuration(execution.started_at, execution.ended_at)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Retries</span>
                  <span>{execution.retries}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-3)' }}>Steps run</span>
                  <span>{execution.logs.length}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {['pending', 'in_progress'].includes(execution.status) && (
                  <button className="btn btn-danger btn-sm" onClick={handleCancel}>✕ Cancel</button>
                )}
                {execution.status === 'failed' && (
                  <button className="btn btn-primary btn-sm" onClick={handleRetry} disabled={running}>
                    {running ? 'Retrying...' : '↺ Retry Failed Step'}
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setExecution(null); }}
                >New Execution</button>
              </div>
            </div>
          )}
        </div>

        {/* Execution Logs */}
        {execution && (
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 14 }}>
              Execution Logs
              <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                {execution.logs.length} step{execution.logs.length !== 1 ? 's' : ''}
              </span>
            </h3>

            {execution.logs.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 20 }}>
                  <p style={{ color: 'var(--text-3)' }}>No steps executed yet</p>
                </div>
              </div>
            ) : (
              execution.logs.map((log, idx) => (
                <div key={idx} className={`log-entry ${log.status}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--bg-4)', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0
                      }}>{idx + 1}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{log.step_name}</span>
                      <span className={`badge badge-${log.step_type}`}>{log.step_type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDuration(log.started_at, log.ended_at)}</span>
                      <StatusBadge status={log.status} />
                    </div>
                  </div>

                  {log.evaluated_rules?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Rules Evaluated
                      </div>
                      {log.evaluated_rules.map((r, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4,
                          background: 'var(--bg)', borderRadius: 6, padding: '6px 10px'
                        }}>
                          <span style={{
                            color: r.result ? 'var(--green)' : 'var(--text-3)',
                            fontSize: 13, flexShrink: 0, fontWeight: 700
                          }}>{r.result ? '✓' : '✗'}</span>
                          <span style={{
                            fontFamily: 'var(--mono)', fontSize: 12,
                            color: r.result ? 'var(--text)' : 'var(--text-3)',
                            wordBreak: 'break-all'
                          }}>{r.rule}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.selected_next_step && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      → Next Step: <strong style={{ color: 'var(--accent-2)' }}>{log.selected_next_step}</strong>
                    </div>
                  )}

                  {log.approver_id && (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                      👤 Approver: <span className="font-mono">{log.approver_id}</span>
                    </div>
                  )}

                  {log.error_message && (
                    <div style={{
                      marginTop: 6, padding: '6px 10px',
                      background: 'var(--red-light)', borderRadius: 6,
                      fontSize: 12, color: 'var(--red)'
                    }}>
                      ⚠ {log.error_message}
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                    {log.started_at && new Date(log.started_at).toLocaleTimeString()}
                    {log.ended_at && ` – ${new Date(log.ended_at).toLocaleTimeString()}`}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
