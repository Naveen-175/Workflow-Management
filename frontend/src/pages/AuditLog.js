import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getExecutions, getWorkflows } from '../utils/api';

export default function AuditLog() {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [workflowNames, setWorkflowNames] = useState({});

  const fetchExecutions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await getExecutions(params);
      setExecutions(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchExecutions(1); }, [fetchExecutions]);

  // Prefetch workflow names
  useEffect(() => {
    getWorkflows({ limit: 100 }).then(res => {
      const map = {};
      res.data.forEach(wf => { map[wf.id] = wf.name; });
      setWorkflowNames(map);
    }).catch(() => {});
  }, []);

  const statusColors = {
    completed: 'var(--green)', failed: 'var(--red)',
    in_progress: 'var(--blue)', pending: 'var(--yellow)', canceled: 'var(--text-3)'
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';
  const formatDuration = (start, end) => {
    if (!start || !end) return '—';
    const diff = Math.round((new Date(end) - new Date(start)) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">{pagination.total} execution records</p>
        </div>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: 150 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="in_progress">In Progress</option>
          <option value="pending">Pending</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading...</div>
        ) : executions.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <h3>No executions found</h3>
            <p>Run a workflow to see execution records here</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Execution ID</th>
                  <th>Workflow</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Steps</th>
                  <th>Started By</th>
                  <th>Start Time</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(exec => (
                  <tr key={exec.id}>
                    <td>
                      <span className="font-mono text-sm" style={{ userSelect: 'all', color: 'var(--text-2)' }}>
                        {exec.id.slice(0, 12)}...
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {workflowNames[exec.workflow_id] || exec.workflow_id.slice(0, 8) + '...'}
                      </span>
                    </td>
                    <td>v{exec.workflow_version}</td>
                    <td>
                      <span className={`badge badge-${exec.status}`}>
                        {exec.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: 'var(--bg-4)', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>
                        {exec.logs?.length || 0}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12 }}>{exec.triggered_by}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(exec.started_at)}
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                      {formatDuration(exec.started_at, exec.ended_at)}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/workflows/${exec.workflow_id}/execute`)}
                      >View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 16px' }}>
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </span>
            <div className="pagination-btns">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchExecutions(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >← Prev</button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchExecutions(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
