# Collaborative Workspace

Real-time collaborative workspace for teams — edit documents, manage tasks, chat, share files, and whiteboard together.

## Tech Stack

**Frontend:** React 19, TipTap 3, Tailwind CSS, Radix UI, Socket.IO Client  
**Backend:** Node.js, Express 5, Mongoose, Socket.IO, JWT  
**Database:** MongoDB Atlas

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your MongoDB URI and JWT secret
npm start
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env   # set REACT_APP_BACKEND_URL=http://localhost:5000
npm start
```

App runs at **http://localhost:3000**, API at **http://localhost:5000**.  
Verify the backend is healthy: `GET http://localhost:5000/api/health`

## Public Deployment (Render + Vercel)

### 1) Deploy Backend to Render

This repo includes `render.yaml` for the backend service (`backend/`).

Required backend environment variables:

- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - long random secret
- `CLIENT_URL` - your frontend URL (for example `https://your-app.vercel.app`)
- `CORS_ORIGINS` - comma-separated allowed origins (for example `https://your-app.vercel.app,https://www.your-domain.com`)

Render will expose your backend at a URL similar to:

`https://your-api.onrender.com`

### 2) Deploy Frontend to Vercel

Deploy `frontend/` as a Vercel project.

Set:

- `REACT_APP_BACKEND_URL=https://your-api.onrender.com`

This repo includes `frontend/vercel.json` to rewrite all routes to `index.html` so React Router works on refresh/deep links.

### 3) Post-deploy checks

- Open `https://your-api.onrender.com/api/health` and verify `{ "ok": true, ... }`
- Open your Vercel frontend URL and test:
  - register/login
  - workspace CRUD
  - real-time chat/document updates (Socket.IO)

## Features

- **Collaborative Editor** — Rich-text editing with live typing indicators and auto-save
- **Task Board** — Create, assign, and track tasks (To Do / In Progress / Done)
- **Team Chat** — Real-time messaging
- **File Sharing** — Upload and download files (up to 10 MB)
- **Whiteboard** — Shared canvas with sticky notes, shapes, and drawing
- **Workspaces** — Create workspaces and invite team members

## Project Structure

```
backend/
  controllers/   Route handlers
  models/        Mongoose schemas (User, Workspace, Document, Task, Message, File)
  routes/        Express routers
  services/      Business logic
  server.js      HTTP server + Socket.IO

frontend/src/
  pages/         Landing, Login, Register, Dashboard, Workspace
  components/    Feature components + ui/ (Radix primitives)
  api/           Axios client with JWT interceptor
```

## License

ISC
