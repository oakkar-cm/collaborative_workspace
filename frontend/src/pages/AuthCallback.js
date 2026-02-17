import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error('Invalid authentication');
          navigate('/', { replace: true });
          return;
        }

        // Exchange session_id for user data
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        const user = response.data;
        toast.success(`Welcome, ${user.name}!`);

        // Navigate to dashboard with user data
        navigate('/dashboard', {
          replace: true,
          state: { user }
        });
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed');
        navigate('/', { replace: true });
      }
    };

    processSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366F1] mx-auto mb-4"></div>
        <p className="text-[#64748B]">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
