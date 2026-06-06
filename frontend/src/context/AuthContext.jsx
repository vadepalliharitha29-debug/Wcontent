import React, { createContext, useState, useEffect, useContext } from 'react';

// Create the Auth Context
const AuthContext = createContext(null);

// Pure JavaScript helper to decode JWT payload (Zero Dependencies!)
const parseJwt = (token) => {
  try {
    // A JWT is split into: Header.Payload.Signature
    // We grab the Payload [1], replace URL-safe chars, and decode base64
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(() => {
    const access = localStorage.getItem('accessToken');
    const refresh = localStorage.getItem('refreshToken');
    return access ? { access, refresh } : null;
  });
  const [loading, setLoading] = useState(true);

  // When tokens change, decode user profile or clear local storage
  useEffect(() => {
    if (tokens) {
      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      const decodedUser = parseJwt(tokens.access);
      if (decodedUser) {
        setUser({
          id: decodedUser.user_id,
          username: decodedUser.username,
          email: decodedUser.email,
          bio: decodedUser.bio,
          creatorType: decodedUser.creator_type,
          portfolioUrl: decodedUser.portfolio_url,
          profilePicture: decodedUser.profile_picture,
        });
      } else {
        // Token is invalid/corrupt
        logout();
      }
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
    setLoading(false);
  }, [tokens]);

  const login = async (username, password) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed. Invalid credentials.');
      }

      // Save tokens, which triggers the useEffect hook to parse user metadata
      setTokens({ access: data.access, refresh: data.refresh });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (username, email, password, creatorType) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          creator_type: creatorType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        // Collect field validation errors if any
        const firstError = Object.values(data)[0];
        throw new Error(
          Array.isArray(firstError) ? firstError[0] : 'Registration failed.'
        );
      }
      
      // Auto login immediately after signup
      return await login(username, password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setTokens(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  // Helper to attach authorization token to fetch calls easily
  const authFetch = async (url, options = {}) => {
    if (!tokens) throw new Error('No authorization tokens found.');

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${tokens.access}`,
    };

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration: if 401, try to refresh
    if (response.status === 401 && tokens.refresh) {
      try {
        const refreshResponse = await fetch('http://127.0.0.1:8000/api/auth/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccess = refreshData.access;
          
          // Save new token
          setTokens({ access: newAccess, refresh: tokens.refresh });
          
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${newAccess}`;
          response = await fetch(url, { ...options, headers });
        } else {
          logout();
        }
      } catch (err) {
        logout();
      }
    }

    return response;
  };

  const value = {
    user,
    tokens,
    loading,
    login,
    register,
    logout,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
