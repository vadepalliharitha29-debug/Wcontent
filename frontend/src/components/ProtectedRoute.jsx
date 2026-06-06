import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        backgroundColor: '#0b0f19', 
        color: '#f3f4f6',
        fontSize: '1.2rem',
        fontFamily: 'Outfit, sans-serif'
      }}>
        Loading Wcontent Dashboard...
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
