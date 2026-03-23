import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { setToken } from '../api/authStorage';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          toast.error('Invalid authentication');
          navigate('/', { replace: true });
          return;
        }

        const response = await client.post('/auth/session', {
          session_id: sessionId
        });

        const { token, user } = response.data;
        if (token) {
          setToken(token);
        }

        toast.success(`Welcome, ${user?.name || 'back'}!`);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth error:', error);
        toast.error(error.response?.data?.message || 'Authentication failed');
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
