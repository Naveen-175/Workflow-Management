import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import WorkflowList from './pages/WorkflowList';
import WorkflowEditor from './pages/WorkflowEditor';
import ExecutionPage from './pages/ExecutionPage';
import AuditLog from './pages/AuditLog';

function Sidebar() {
  return (
    <aside style={{
      width: 230,
      background: '#1a1916',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>

      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="Halleyx Logo"
            style={{
              width: 100, height: 100,
              borderRadius: 10,
              objectFit: 'contain',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{
              fontWeight: 700, fontSize: 15,
              color: '#ffffff', lineHeight: 1.2,
            }}>Halleyx</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
              Workflow Engine
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '14px 12px', flex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0 8px 10px',
        }}>Navigation</div>

        {[
          { to: '/',      icon: '▦', label: 'Workflows' },
          { to: '/audit', icon: '≡', label: 'Audit Log'  },
        ].map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 6,
              marginBottom: 2,
              color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(26,79,214,0.35)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13.5,
              transition: 'all 0.12s',
              textDecoration: 'none',
              borderLeft: isActive
                ? '2px solid #4d7fff'
                : '2px solid transparent',
            })}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>
              {icon}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 2,
          }}>HALLEYX INC.</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            v1.0.0 · Challenge 2026
          </div>
        </div>
      </div>
    </aside>
  );
}

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '28px 36px',
        minWidth: 0,
        background: '#f5f4f0',
      }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1a1916',
            border: '1px solid #dddbd3',
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          },
          success: {
            iconTheme: { primary: '#166534', secondary: '#dcfce7' }
          },
          error: {
            iconTheme: { primary: '#991b1b', secondary: '#fee2e2' }
          },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/"                      element={<WorkflowList />}   />
          <Route path="/workflows/:id/edit"    element={<WorkflowEditor />} />
          <Route path="/workflows/:id/execute" element={<ExecutionPage />}  />
          <Route path="/executions/:id"        element={<ExecutionPage />}  />
          <Route path="/audit"                 element={<AuditLog />}       />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}