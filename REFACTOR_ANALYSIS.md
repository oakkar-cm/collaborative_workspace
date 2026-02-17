# Refactor Analysis: Collaborative Workspace

## 1. Current Repository Structure

### Backend
```
backend/
├── server.js          # Single file: DB connection, all routes, Socket.IO, app listen
├── package.json
└── models/
    ├── User.js
    └── Workspace.js
```

- **server.js** (~136 lines): Express app, MongoDB connection, 4 route handlers (register, login, POST workspaces, GET workspaces), Socket.IO setup, HTTP server listen. No separation of routes, controllers, or business logic. JWT secret and DB URL hardcoded.

### Frontend
```
frontend/
├── public/
├── src/
│   ├── App.js
│   ├── index.js
│   ├── index.css
│   ├── App.css
│   ├── pages/
│   │   ├── LandingPage.js
│   │   ├── AuthCallback.js
│   │   ├── Dashboard.js
│   │   └── WorkspacePage.js
│   ├── components/
│   │   ├── ProtectedRoute.js
│   │   ├── CollaborativeEditor.js
│   │   ├── VoiceChat.js
│   │   ├── Whiteboard.js
│   │   └── ui/           # shadcn-style components
│   ├── hooks/
│   │   └── use-toast.js
│   └── lib/
│       └── utils.js
├── package.json
└── ...
```

- **API usage**: Each page/component defines `const API = process.env.REACT_APP_BACKEND_URL + '/api'` and calls `axios.get/post/...` directly. No shared client or error handling.
- **State**: Local `useState`/`useEffect` in pages; no shared API or state layer.
- **Dashboard.js**: Loads user + workspaces, create workspace, delete workspace, logout. All logic and UI in one file.
- **WorkspacePage.js**: Large single component with many handlers and inline `TaskCard`; API calls and socket logic mixed with UI.

---

## 2. Architectural Issues

### Backend
| Issue | Detail |
|-------|--------|
| **No layering** | Routes contain business logic (hash, compare, JWT sign, DB find/save). No controller or service layer. |
| **No validation** | Request body (email, password, name) not validated or sanitized. |
| **Inconsistent errors** | Some handlers return 400/401/500 with `{ message }`, others only 401. No central error handler. |
| **Secrets in code** | JWT secret and MongoDB URL in server.js. |
| **No logging** | Only `console.log` for DB and errors. |
| **Fragile auth** | `req.headers.authorization.split(" ")[1]` throws if header missing; no auth middleware. |
| **Mixed concerns** | Socket.IO and HTTP routes in same file; server listen at bottom. |

### Frontend
| Issue | Detail |
|-------|--------|
| **Duplicated API base** | `API` and `REACT_APP_BACKEND_URL` repeated in multiple files. |
| **No API abstraction** | Axios used directly; no single place for base URL, auth, or error mapping. |
| **Error handling ad hoc** | Each handler uses `toast.error(...)` and optional `error.response?.data?.detail` with no shared pattern. |
| **Business logic in UI** | Pages contain both data fetching and UI; no hooks or services for workspace/auth operations. |
| **Large components** | WorkspacePage has 500+ lines and inline TaskCard; Dashboard has state + handlers + JSX together. |

---

## 3. Risks Before Changing Anything

| Risk | Mitigation |
|------|------------|
| **API contract change** | Keep response shapes and status codes identical. Controllers return same payloads as today. |
| **Auth behavior change** | Keep JWT verification and “Unauthorized” response; move to middleware that sets `req.user` and use same secret from config. |
| **Register/Login behavior** | Move logic to service; same validation (existing user, hash, compare), same messages and status codes. |
| **Frontend breakage** | API module will call same URLs with same payloads; only centralize axios instance and error handling. |
| **Env assumptions** | Backend: use `process.env` with fallbacks only for dev (e.g. PORT, MONGODB_URI). Frontend: keep using REACT_APP_BACKEND_URL. |
| **Workspace response shape** | Backend currently returns Mongoose documents (e.g. `_id`, `name`, `members`). Do not rename to `workspace_id` or change structure in this refactor. |

---

## 4. Proposed Folder Structure

### Backend (MVC + services + config/middleware)
```
backend/
├── server.js                 # App bootstrap, mount routes, Socket.IO, listen
├── app.js                    # Express app (no listen): cors, json, routes
├── config/
│   └── index.js              # Env: NODE_ENV, PORT, MONGODB_URI, JWT_SECRET
├── db/
│   └── index.js              # mongoose.connect using config
├── middleware/
│   ├── auth.js               # Bearer token → req.user or 401
│   ├── errorHandler.js       # Central error handler; standard JSON response
│   └── validate.js           # Optional: body validation helpers
├── routes/
│   ├── index.js              # Mount auth + workspace routes
│   ├── auth.routes.js        # POST /api/register, POST /api/login
│   └── workspace.routes.js   # POST /api/workspaces, GET /api/workspaces
├── controllers/
│   ├── auth.controller.js    # register, login
│   └── workspace.controller.js
├── services/
│   ├── auth.service.js       # registerUser, loginUser
│   └── workspace.service.js  # createWorkspace, getWorkspacesByUser
├── utils/
│   └── logger.js             # Simple logger (info/error) — no behavior change
├── models/
│   ├── User.js
│   └── Workspace.js
├── package.json
└── .env.example
```

### Frontend (API layer + structure only; no new features)
```
frontend/src/
├── api/
│   ├── client.js             # Axios instance: baseURL, withCredentials
│   └── endpoints/
│       ├── auth.js           # getMe(), logout(), etc.
│       └── workspaces.js     # getWorkspaces(), createWorkspace(), deleteWorkspace()
├── pages/
│   ├── Dashboard.js          # Use api/workspaces + api/auth; same UI/behavior
│   └── ...
├── components/
│   └── ...
├── hooks/                    # Optional later: useWorkspaces, useAuth
├── App.js
└── index.js
```

---

## 5. Refactored Example Scope

- **Backend**: One route file (`workspace.routes.js`), one controller (`workspace.controller.js`), one service (`workspace.service.js`), plus config, db, auth middleware, central error handler, and logger. `server.js` and `app.js` will mount these and keep register/login in auth routes/controller/service.
- **Frontend**: One page example — **Dashboard** — using a new `api/client.js` and `api/endpoints/workspaces.js` (and auth if needed). Same UI and behavior; only structure and API abstraction change.

---

## 6. What Changed and Why (Summary)

- **Config**: Env moved to `config/index.js` and `db/index.js` so secrets and URLs are not in server.js; behavior unchanged (same DB and JWT secret source in dev).
- **Middleware**: Auth middleware parses Bearer token and sets `req.user`; workspace routes use it. Same “Unauthorized” 401 when token missing/invalid.
- **Error handler**: Central middleware catches errors and sends `{ message }` with appropriate status; replaces duplicated try/catch in each route. Response format and status codes preserved.
- **Logger**: Simple wrapper for `console.log`/`console.error` so logging can be replaced later without changing behavior.
- **Workspace flow**: Route → controller → service → model. Business rules (who can create, who can list) unchanged; only location of code changed.
- **Validation**: Optional body validation for workspace name (non-empty string) to avoid invalid data; no change to success path or response.
- **Frontend API**: Single axios instance and workspace (and auth) endpoints. Dashboard calls the same URLs with the same payloads; errors still surfaced via toast with the same user-facing messages.

---

## 7. Confirmation: No Business Logic Modified

- **Register**: Still “user exists → 400”, “hash password, save user → 201”. Same messages and status codes.
- **Login**: Still “user not found or password mismatch → 401”, “JWT sign → 200 + token”. Same payload and expiry.
- **Workspaces**: Create still requires valid JWT; workspace has `name`, `owner`, `members: [owner]`. List still returns workspaces where `members` contains `decoded.userId`. Response body unchanged (Mongoose document(s)).
- **Frontend**: Dashboard still loads user + workspaces on mount, creates workspace with name, deletes with confirm, logout to `/`. Same data and user flows; only where the HTTP calls live (api layer) and how errors are passed (same toasts).

No new features, no removed features, no change to business rules or workflows.

---

## 8. Refactored Files Reference

| Layer | File | Purpose |
|-------|------|--------|
| **Backend config** | `backend/config/index.js` | NODE_ENV, PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN |
| **Backend db** | `backend/db/index.js` | mongoose.connect using config |
| **Backend logger** | `backend/utils/logger.js` | info/error wrapper (no behavior change) |
| **Backend middleware** | `backend/middleware/auth.js` | Bearer token → req.user or 401 |
| **Backend middleware** | `backend/middleware/errorHandler.js` | Central error → { message }, status |
| **Backend middleware** | `backend/middleware/validate.js` | requireWorkspaceName for POST /workspaces |
| **Backend service** | `backend/services/auth.service.js` | registerUser, loginUser |
| **Backend service** | `backend/services/workspace.service.js` | createWorkspace, getWorkspacesByUser |
| **Backend controller** | `backend/controllers/auth.controller.js` | register, login |
| **Backend controller** | `backend/controllers/workspace.controller.js` | create, list |
| **Backend routes** | `backend/routes/auth.routes.js` | POST /api/register, POST /api/login |
| **Backend routes** | `backend/routes/workspace.routes.js` | POST/GET /api/workspaces (auth + validate) |
| **Backend app** | `backend/app.js` | express, cors, routes, errorHandler |
| **Backend entry** | `backend/server.js` | db connect, Socket.IO, listen |
| **Frontend API** | `frontend/src/api/client.js` | Axios instance (baseURL, withCredentials) |
| **Frontend API** | `frontend/src/api/endpoints/auth.js` | getMe(), logout() |
| **Frontend API** | `frontend/src/api/endpoints/workspaces.js` | getWorkspaces(), createWorkspace(), deleteWorkspace() |
| **Frontend API** | `frontend/src/api/utils.js` | getWorkspaceId(), getWorkspaceCreatedAt() for response shape compatibility |
| **Frontend page** | `frontend/src/pages/Dashboard.js` | Uses api layer; same UI and behavior |
