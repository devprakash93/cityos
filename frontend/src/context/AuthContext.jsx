import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me/');
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login/', { email, password });
      if (response.data.success) {
        await fetchProfile();
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      const errData = error.response?.data;
      let errMsg = 'Login failed. Please check your credentials.';
      if (errData) {
        if (errData.message && typeof errData.message === 'string') {
          errMsg = errData.message;
        } else if (errData.detail) {
          errMsg = errData.detail;
        } else if (errData.non_field_errors) {
          errMsg = errData.non_field_errors[0];
        } else if (typeof errData === 'object') {
          // If it's a nested object (like field errors), try to get the first string
          const extractString = (obj) => {
            for (let val of Object.values(obj)) {
              if (typeof val === 'string') return val;
              if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
              if (typeof val === 'object' && val !== null) return extractString(val);
            }
            return JSON.stringify(obj);
          };
          errMsg = extractString(errData);
        }
      }
      return {
        success: false,
        message: errMsg,
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setUser(null);
    }
  };

  const hasRole = (roleName) => {
    return user?.role?.name === roleName;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
