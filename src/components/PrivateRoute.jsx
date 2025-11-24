import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, requiredRole }) => {
    const { currentUser, userRole, loading } = useAuth();

    if (loading) {
        return <div className="h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
        // If specific role required and user doesn't have it (and is not admin)
        // For now, just redirect to dashboard or show unauthorized
        return <Navigate to="/" />;
    }

    return children;
};

export default PrivateRoute;
