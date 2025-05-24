// web_dashboard/frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.getCurrentUser()); // Initialize with user from localStorage

  useEffect(() => {
    // Optional: Add logic here to verify token validity with backend on app load
    // For now, simply loading from localStorage is a common approach for SPAs
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const login = async (usernameOrEmail, password) => {
    try {
      const userData = await authService.login(usernameOrEmail, password);
      if (userData.token) {
        setUser(userData); // userData includes token and user details
        return userData;
      } else {
        // authService.login already handles storing in localStorage
        // but if login fails, userData might contain an error message
        throw new Error(userData.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login context error:', error);
      throw error; // Re-throw to be caught by UI component
    }
  };

  const register = async (username, email, password, firstName, lastName, roles) => {
    try {
        const response = await authService.register(username, email, password, firstName, lastName, roles);
        // After successful registration, you might want to automatically log the user in
        // or redirect them to the login page.
        return response; // Contains success or error message
    } catch (error) {
        console.error('Register context error:', error);
        throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    // Redirect to login or home page usually handled by routing logic
  };
  
  // Function to check if user has specific roles
  const hasRole = (rolesRequired) => {
    if (!user || !user.user || !user.user.roles) return false;
    if (typeof rolesRequired === 'string') {
        rolesRequired = [rolesRequired];
    }
    return user.user.roles.some(role => rolesRequired.includes(role));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isAuthenticated: !!user, token: user ? user.token : null, userDetails: user ? user.user : null, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
