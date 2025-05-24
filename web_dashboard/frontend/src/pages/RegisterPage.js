// web_dashboard/frontend/src/pages/RegisterPage.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Assuming React Router

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // For simplicity, roles are not set by user during registration here, default in backend.
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await register(username, email, password, firstName, lastName);
      if (response.message === 'User registered successfully.') { // Check for success message from backend
        setSuccess('Registration successful! You can now login.');
        // Optionally redirect to login page after a delay or on button click
        setTimeout(() => navigate('/login'), 2000); 
      } else {
        // If backend returns errors in a specific structure, parse them here
        setError(response.message || (response.errors && response.errors[0].msg) || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };
  
  // Basic inline styles (consistent with LoginPage)
  const styles = {
    container: { maxWidth: '450px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px' },
    input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    button: { width: '100%', padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    error: { color: 'red', marginBottom: '10px', textAlign: 'center' },
    success: { color: 'green', marginBottom: '10px', textAlign: 'center' },
    title: { textAlign: 'center', color: '#333', marginBottom: '20px'}
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Register</h2>
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label htmlFor="username" style={styles.label}>Username:</label>
          <input type="text" id="username" style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="email" style={styles.label}>Email:</label>
          <input type="email" id="email" style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="password" style={styles.label}>Password (min 8 characters):</label>
          <input type="password" id="password" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="confirmPassword" style={styles.label}>Confirm Password:</label>
          <input type="password" id="confirmPassword" style={styles.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="firstName" style={styles.label}>First Name (Optional):</label>
          <input type="text" id="firstName" style={styles.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="lastName" style={styles.label}>Last Name (Optional):</label>
          <input type="text" id="lastName" style={styles.input} value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
        </div>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
       {/* Optional: Link to Login page */}
      {/* <p style={{textAlign: 'center', marginTop: '15px'}}>Already have an account? <Link to="/login">Login here</Link></p> */}
    </div>
  );
};

export default RegisterPage;
