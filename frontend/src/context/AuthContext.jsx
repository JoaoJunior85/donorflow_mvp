import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('donorflow_token');
    if (token) {
      api
        .me()
        .then(setUser)
        .catch(() => localStorage.removeItem('donorflow_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { user, token } = await api.login({ email, password });
    localStorage.setItem('donorflow_token', token);
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const { user, token } = await api.register(data);
    localStorage.setItem('donorflow_token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('donorflow_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
