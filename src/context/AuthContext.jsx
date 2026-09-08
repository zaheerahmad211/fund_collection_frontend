
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from 'react';

import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Backend API URL
// Frontend .env:
// VITE_API_URL=https://fundcollectionbackend.vercel.app/api
const API_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState(
    localStorage.getItem('token')
  );

  // Load user when token exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;

      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Get logged-in user
  const loadUser = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/auth/me`
      );

      setUser(res.data);
    } catch (err) {
      console.error(
        'Error loading user:',
        err
      );

      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      const res = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        }
      );

      const { token, user } = res.data;

      // Save token
      localStorage.setItem('token', token);

      // Set authentication header
      axios.defaults.headers.common['x-auth-token'] = token;

      // Update state
      setToken(token);
      setUser(user);

      return {
        success: true,
      };
    } catch (err) {
      console.error(
        'Login error:',
        err
      );

      return {
        success: false,
        message:
          err.response?.data?.message ||
          'Login failed',
      };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');

    delete axios.defaults.headers.common[
      'x-auth-token'
    ];

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

