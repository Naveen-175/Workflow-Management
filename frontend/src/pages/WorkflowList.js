import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getWorkflows, createWorkflow, deleteWorkflow } from '../utils/api';
import WorkflowFormModal from '../components/workflow/WorkflowFormModal';

export default function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchWorkflows = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await getWorkflows({ page, limit: 10, search, status: statusFilter });
      setWorkflows(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchWorkflows(1), 300);
    return () => clearTimeout(t);
  }, [fetchWorkflows]);

  const handleCreate = async (formData) => {
    try {
      const wf = await createWorkflow(formData);
      toast.success('Workflow created!');
      setShowCreate(false);
      navigate(`/workflows/${wf.id}/edit`);
    } catch (err) {
      toast.error(err.error || 'Failed to create workflow');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete workflow "${name}"? This will also delete all steps and rules.`)) return;
    setDeleting(id);
    try {
      await deleteWorkflow(id);
      toast.success('Workflow deleted');
      fetchWorkflows(pagination.page);
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workflows</h1>
          <p className="page-subtitle">{pagination.total} workflows total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Workflow
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-bar">
          <span style={{ color: 'var(--text-3)' }}>🔍</span>
          <input
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: 140 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading workflows...</div>
        ) : workflows.length === 0 ? (
          <div className="empty-state">
            <div className="icon">⬡</div>
            <h3>No workflows found</h3>
            <p>Create your first workflow to get started</p>
            <button className="btn btn-primary mt-2" onClick={() => setShowCreate(true)}>+ New Workflow</button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Steps</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(wf => (
                  <tr key={wf.id}>
                    <td>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{wf.name}</span>
                      {wf.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                          {wf.description.slice(0, 60)}{wf.description.length > 60 ? '…' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-sm text-muted" style={{ userSelect: 'all' }}>
                        {wf.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: 'var(--bg-4)', padding: '2px 8px',
                        borderRadius: 20, fontSize: 12, fontWeight: 600
                      }}>{wf.step_count ?? 0}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-2)' }}>v{wf.version}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${wf.is_active ? 'active' : 'inactive'}`}>
                        {wf.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      {new Date(wf.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/workflows/${wf.id}/edit`)}
                        >Edit</button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => navigate(`/workflows/${wf.id}/execute`)}
                        >▶ Execute</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(wf.id, wf.name)}
                          disabled={deleting === wf.id}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 16px' }}>
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="pagination-btns">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchWorkflows(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >← Prev</button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchWorkflows(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <WorkflowFormModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
