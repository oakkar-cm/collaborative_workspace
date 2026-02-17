import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import WorkspacePage from './pages/WorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Suppress ResizeObserver errors (cosmetic only, doesn't affect functionality)
const debounce = (callback, delay) => {
  let tid;
  return function (...args) {
    const ctx = this;
    tid && clearTimeout(tid);
    tid = setTimeout(() => {
      callback.apply(ctx, args);
    }, delay);
  };
};

const _ = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends _ {
  constructor(callback) {
    callback = debounce(callback, 20);
    super(callback);
  }
};

function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Check for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/workspace/:workspaceId" element={
        <ProtectedRoute>
          <WorkspacePage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
