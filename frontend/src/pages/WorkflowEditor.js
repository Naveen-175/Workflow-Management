import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getWorkflow, updateWorkflow,
  createStep, updateStep, deleteStep,
} from '../utils/api';
import StepModal from '../components/steps/StepModal';
import RuleEditor from '../components/rules/RuleEditor';
import InputSchemaEditor from '../components/workflow/InputSchemaEditor';

export default function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('steps');
  const [selectedStep, setSelectedStep] = useState(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState(null);

  // Workflow form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inputSchema, setInputSchema] = useState({});
  const [isActive, setIsActive] = useState(true);

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWorkflow(id);
      setWorkflow(data);
      setSteps(data.steps || []);
      setName(data.name);
      setDescription(data.description || '');
      setInputSchema(data.input_schema || {});
      setIsActive(data.is_active);
    } catch (err) {
      toast.error('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchWorkflow(); }, [fetchWorkflow]);

  const handleSaveWorkflow = async () => {
    if (!name.trim()) return toast.error('Workflow name is required');
    setSaving(true);
    try {
      await updateWorkflow(id, { name, description, input_schema: inputSchema, is_active: isActive });
      toast.success('Workflow saved (new version created)');
      fetchWorkflow();
    } catch (err) {
      toast.error(err.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setShowStepModal(true);
  };

  const handleEditStep = (step) => {
    setEditingStep(step);
    setShowStepModal(true);
  };

  const handleSaveStep = async (formData) => {
    try {
      if (editingStep) {
        await updateStep(editingStep.id, formData);
        toast.success('Step updated');
      } else {
        await createStep(id, formData);
        toast.success('Step added');
      }
      setShowStepModal(false);
      fetchWorkflow();
    } catch (err) {
      toast.error(err.error || 'Failed to save step');
    }
  };

  const handleDeleteStep = async (step) => {
    if (!window.confirm(`Delete step "${step.name}"? All its rules will also be deleted.`)) return;
    try {
      await deleteStep(step.id);
      toast.success('Step deleted');
      if (selectedStep?.id === step.id) setSelectedStep(null);
      fetchWorkflow();
    } catch (err) {
      toast.error('Failed to delete step');
    }
  };

  const handleSetStartStep = async (stepId) => {
    try {
      await updateWorkflow(id, { start_step_id: stepId });
      toast.success('Start step updated');
      fetchWorkflow();
    } catch (err) {
      toast.error('Failed to update start step');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /> Loading workflow...</div>;
  if (!workflow) return <div className="empty-state"><h3>Workflow not found</h3></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
            <span style={{ color: 'var(--text-3)' }}>/</span>
            <span style={{ fontWeight: 600 }}>{workflow.name}</span>
            <span className={`badge badge-${workflow.is_active ? 'active' : 'inactive'}`}>
              {workflow.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <h1 className="page-title">Workflow Editor</h1>
          <p className="page-subtitle">Version {workflow.version} · {steps.length} steps</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-success" onClick={() => navigate(`/workflows/${id}/execute`)}>
            ▶ Execute
          </button>
          <button className="btn btn-primary" onClick={handleSaveWorkflow} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      <div className="tabs">
        {[
          { key: 'steps', label: `Steps (${steps.length})` },
          { key: 'settings', label: 'Settings & Schema' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card">
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Workflow Settings</h3>
            <div className="form-group">
              <label className="form-label">Workflow Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={isActive ? 'true' : 'false'} onChange={e => setIsActive(e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 4, fontWeight: 700 }}>Input Schema</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
              Define the fields required when executing this workflow.
            </p>
            <InputSchemaEditor schema={inputSchema} onChange={setInputSchema} />
          </div>
        </div>
      )}

      {activeTab === 'steps' && (
        <div style={{ display: 'grid', gridTemplateColumns: steps.length > 0 && selectedStep ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* Steps list */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 700 }}>Steps</h3>
              <button className="btn btn-primary btn-sm" onClick={handleAddStep}>+ Add Step</button>
            </div>

            {steps.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 30 }}>
                  <div className="icon">📋</div>
                  <h3>No steps yet</h3>
                  <p>Add steps to define the workflow</p>
                  <button className="btn btn-primary btn-sm mt-2" onClick={handleAddStep}>+ Add Step</button>
                </div>
              </div>
            ) : (
              steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="step-card"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedStep?.id === step.id ? 'var(--accent)' : undefined,
                    background: selectedStep?.id === step.id ? 'var(--bg-4)' : undefined,
                  }}
                  onClick={() => setSelectedStep(selectedStep?.id === step.id ? null : step)}
                >
                  <div className="step-num">{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{step.name}</span>
                      <span className={`badge badge-${step.step_type}`}>{step.step_type}</span>
                      {workflow.start_step_id === step.id && (
                        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent-2)' }}>START</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {step.rules?.length || 0} rule{step.rules?.length !== 1 ? 's' : ''} · Order {step.order}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    {workflow.start_step_id !== step.id && (
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Set as start step"
                        onClick={() => handleSetStartStep(step.id)}
                      >⚑</button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEditStep(step)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStep(step)}>Del</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rules panel */}
          {selectedStep && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontWeight: 700 }}>
                  Rules — <span style={{ color: 'var(--accent-2)' }}>{selectedStep.name}</span>
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedStep(null)}>✕ Close</button>
              </div>
              <RuleEditor
                step={selectedStep}
                steps={steps}
                onRulesUpdated={() => fetchWorkflow().then(() => {
                  // refresh selectedStep from updated steps
                  setSelectedStep(prev => {
                    const updated = steps.find(s => s.id === prev.id);
                    return updated || prev;
                  });
                })}
              />
            </div>
          )}
        </div>
      )}

      {showStepModal && (
        <StepModal
          step={editingStep}
          onClose={() => setShowStepModal(false)}
          onSave={handleSaveStep}
        />
      )}
    </div>
  );
}
