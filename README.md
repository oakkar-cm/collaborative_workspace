# Collaborative Workspace

A real-time team collaboration platform with shared documents, tasks, chat, whiteboard, file sharing, and voice chat.

## Current Status

This repository includes a production-hardening refactor focused on:

- secure authentication and API access
- workspace-level authorization
- safer realtime signaling and room access
- improved concurrency handling for poll updates
- performance/scalability middleware and query/index improvements

See `REFACTOR_ANALYSIS.md` for a full technical breakdown.

## Tech Stack

- Frontend: React 19, Tailwind CSS, Radix UI, Socket.IO Client, WebRTC
- Backend: Node.js, Express 5, Mongoose, Socket.IO
- Database: MongoDB

## Architecture

The application keeps the MVC-style flow:

- `routes` -> `controllers` -> `services` -> `models`

This structure is preserved while applying security and performance improvements.

## Setup

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Required backend settings (minimum):

- `MONGODB_URI`
- `JWT_SECRET` (>= 32 chars in production)
- `CLIENT_URL`
- `CORS_ORIGINS`

Optional realtime voice relay settings:

- `TURN_SHARED_SECRET`
- `TURN_URLS`
- `TURN_CREDENTIAL_TTL_SECONDS`
- `STUN_URLS`

### 2) Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env
npm start
```

Frontend env:

- `REACT_APP_BACKEND_URL=http://localhost:5000` (or your deployed backend URL)

## Health Check

- API health endpoint: `GET /api/health`
- Local URL: `http://localhost:5000/api/health`

## Security and Production Notes

- Auth now supports HttpOnly cookie sessions (and legacy Bearer fallback).
- TURN credentials are fetched from authenticated backend endpoint (`/api/rtc/ice-config`), not hardcoded in frontend.
- Socket identity fields are server-derived to prevent spoofing.
- API hardening middleware is enabled:
  - `helmet`
  - `express-rate-limit`
  - `express-mongo-sanitize`
  - `hpp`
  - `compression`
  - `morgan`

## Feature Overview

- Collaborative rich-text editor with realtime updates
- Kanban-style task management
- Team chat with polls
- File upload/download
- Whiteboard with drawing, shapes, notes, and image tools
- WebRTC voice chat signaling via Socket.IO

## Project Structure

```text
backend/
  controllers/
  middleware/
  models/
  routes/
  services/
  socket/
  utils/
  app.js
  server.js

frontend/src/
  api/
  components/
  pages/
  App.js
```

## Deployment

For deployment details (Render + Vercel or equivalent), keep backend and frontend env values aligned:

- frontend origin must be included in backend `CORS_ORIGINS`
- backend URL must be set in frontend `REACT_APP_BACKEND_URL`
- `AUTH_COOKIE_SECURE=true` in production HTTPS environments

## License

ISC
