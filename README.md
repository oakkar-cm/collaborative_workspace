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
