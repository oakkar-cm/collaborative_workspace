import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, clearToken } from '../api/authStorage';
import { getMe } from '../api/endpoints/auth';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const checkAuth = async () => {
      try {
        await getMe();
        setIsAuthenticated(true);
      } catch (error) {
        clearToken();
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1]" />
      </div>
    );
  }

  return isAuthenticated ? children : null;
};

export default ProtectedRoute;
