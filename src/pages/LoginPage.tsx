import React from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  React.useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleGoogleLogin = async () => {
    try {
      // Si estamos en la App de Android, redirigimos al esquema nativo mybuddy://
      const redirectUrl = Capacitor.isNativePlatform()
        ? 'mybuddy://auth-callback'
        : window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      alert('Error al iniciar sesión con Google');
      console.error(error);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg)',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          border: '1px solid var(--color-border)',
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <h1 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          Bienvenido a MyBuddy
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.92rem' }}>
          Organiza tu vida, hábitos, gimnasio y tareas en un solo lugar.
        </p>

        <button
          onClick={handleGoogleLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-input-bg)',
            color: 'var(--color-text-main)',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '1.25rem',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Iniciar sesión con Google
        </button>

        <a
          style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}
          href="/privacy"
        >
          Información de privacidad
        </a>
      </div>
    </div>
  );
};