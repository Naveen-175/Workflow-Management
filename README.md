# Halleyx Workflow Engine — Full Stack Engineer Challenge I 2026

A complete workflow automation system built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

- ✅ **Workflow CRUD** — Create, read, update (versioned), delete workflows
- ✅ **Step Management** — Task, Approval, Notification step types
- ✅ **Rule Engine** — Dynamic condition evaluation with priority-ordered rules
- ✅ **Workflow Execution** — End-to-end execution with full audit logs
- ✅ **Cancel & Retry** — Cancel in-progress, retry failed steps only
- ✅ **Input Schema Validation** — Define and enforce field types and allowed values
- ✅ **Drag-and-Drop Rule Ordering** — Reorder rule priorities visually
- ✅ **Audit Log** — Full execution history with filtering and pagination
- ✅ **Loop Protection** — Max 20 iterations to prevent infinite loops
- ✅ **Branching** — Rules can route to any step in the workflow

## Tech Stack

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | React 18, React Router 6      |
| Backend  | Node.js, Express 4            |
| Database | MongoDB, Mongoose             |
| Styling  | Custom CSS (no UI framework)  |

---

## Quick Start

### Prerequisites
- Node.js v16+
- MongoDB running locally on port 27017 (or provide a MongoDB URI)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env if needed (default: mongodb://localhost:27017/halleyx_workflow)
npm run dev
```

Backend runs on **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000** and proxies API calls to backend.

---

## API Reference

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows` | List workflows (search, filter, pagination) |
| GET | `/api/workflows/:id` | Get workflow with steps & rules |
| PUT | `/api/workflows/:id` | Update workflow (increments version) |
| DELETE | `/api/workflows/:id` | Delete workflow (cascades steps & rules) |
| POST | `/api/workflows/:id/execute` | Execute workflow |

### Steps
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflows/:workflow_id/steps` | Add step |
| GET | `/api/workflows/:workflow_id/steps` | List steps |
| PUT | `/api/steps/:id` | Update step |
| DELETE | `/api/steps/:id` | Delete step |

### Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/steps/:step_id/rules` | Add rule |
| GET | `/api/steps/:step_id/rules` | List rules |
| PUT | `/api/rules/:id` | Update rule |
| DELETE | `/api/rules/:id` | Delete rule |

### Executions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/executions/:id` | Get execution status & logs |
| GET | `/api/executions` | List all executions (audit log) |
| POST | `/api/executions/:id/cancel` | Cancel execution |
| POST | `/api/executions/:id/retry` | Retry failed step only |

---

## Rule Engine

Rules are evaluated in **priority order** (lowest number = highest priority).

### Supported Operators

```
Comparison:  ==  !=  <  >  <=  >=
Logical:     && (AND)   || (OR)
String:      contains(field, "value")
             startsWith(field, "prefix")
             endsWith(field, "suffix")
```

### Example Rules

| Priority | Condition | Next Step |
|----------|-----------|-----------|
| 1 | `amount > 100 && country == 'US' && priority == 'High'` | Finance Notification |
| 2 | `amount <= 100 \|\| department == 'HR'` | CEO Approval |
| 3 | `priority == 'Low' && country != 'US'` | Task Rejection |
| 4 | `DEFAULT` | Task Rejection |

> ⚠️ A `DEFAULT` rule is required as a fallback for unmatched conditions.

---

## Example: Expense Approval Workflow

**Input Schema:**
```json
{
  "amount": { "type": "number", "required": true },
  "country": { "type": "string", "required": true },
  "department": { "type": "string", "required": false },
  "priority": { "type": "string", "required": true, "allowed_values": ["High", "Medium", "Low"] }
}
```

**Steps:** Manager Approval → Finance Notification → CEO Approval → Task Completion

---

## Project Structure

```
halleyx-workflow/
├── backend/
│   ├── models/          # Mongoose schemas (Workflow, Step, Rule, Execution)
│   ├── routes/          # Express route handlers
│   ├── services/        # Rule engine, execution service
│   └── server.js        # Entry point
└── frontend/
    └── src/
        ├── components/  # Reusable UI components
        ├── pages/       # Page-level components
        └── utils/       # API client
```
