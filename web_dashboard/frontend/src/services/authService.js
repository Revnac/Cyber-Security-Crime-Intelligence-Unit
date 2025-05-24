// web_dashboard/frontend/src/services/authService.js
const API_URL = '/api/auth/'; // Uses proxy from package.json in development

const register = async (username, email, password, firstName = '', lastName = '', roles = ['Analyst']) => {
  const response = await fetch(API_URL + 'register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password, firstName, lastName, roles }),
  });
  return response.json(); // Returns promise
};

const login = async (usernameOrEmail, password) => {
  const response = await fetch(API_URL + 'login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ usernameOrEmail, password }),
  });
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('user', JSON.stringify(data)); // Store user info and token
  }
  return data; // Returns promise with user/token or error
};

const logout = () => {
  localStorage.removeItem('user');
  // Potentially call a backend logout endpoint if server-side session/token invalidation is implemented
};

const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
  } catch (error) {
    console.error("Error parsing user from localStorage", error);
    localStorage.removeItem('user'); // Clear corrupted item
    return null;
  }
};

// Function to get the auth token for API calls
const getAuthToken = () => {
    const user = getCurrentUser();
    return user ? user.token : null;
};

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
  getAuthToken,
};

export default authService;
