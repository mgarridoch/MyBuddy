import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();

  if (!session) {
    // Si no hay sesión, redireccionar al Login
    return <Navigate to="/login" replace />;
  }

  // Si hay sesión, mostrar el contenido
  return <>{children}</>;
};