# collaborative_workspace

## Why register/login might not work – checklist

1. **MongoDB must be running**  
   The backend saves and reads users from MongoDB. If MongoDB is not running, the backend may not start or will fail on register. Install [MongoDB](https://www.mongodb.com/try/download/community) and start it (e.g. service or `mongod`).

2. **Backend must be running**  
   In a terminal: `cd backend && npm start`. You should see `MongoDB Connected` and `Server running on http://localhost:5000`. If you see a DB error, start MongoDB first.

3. **Frontend must point at the backend**  
   The frontend uses `REACT_APP_BACKEND_URL` from `frontend/.env`. The file should contain:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:5000
   ```
   Restart the frontend after changing `.env`: stop with Ctrl+C, then `cd frontend && npm start`.

4. **Check backend health**  
   Open **http://localhost:5000/api/health** in the browser. You should see `{"ok":true,"db":"connected"}`. If you get an error or `"db":"disconnected"`, the backend or MongoDB is not ready.

---

Iteration 1 - Estimated work days : 13 days

Backend server setup	-	1 day
User authentication (backend)	-	2 days
User authentication (frontend)	-	1 day
Workspace creation (backend) - 2 days
Workspace UI (frontend)	-	1 day
Real-time editor (backend) -	3 days
Real-time editor (frontend)	-	2 days
User presence indicator	-	1 day
