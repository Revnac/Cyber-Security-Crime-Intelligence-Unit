// web_dashboard/frontend/src/App.js
import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import AuthProvider and useAuth

import CrimeMap from './components/CrimeMap';
import CrimeChart from './components/CrimeChart';
import LoginPage from './pages/LoginPage'; // Import LoginPage
import RegisterPage from './pages/RegisterPage'; // Import RegisterPage
import PredictionView from './pages/PredictionView'; // <<< ADD THIS
import CryptoTransactionList from './components/crypto/CryptoTransactionList'; // <<< ADD THIS
import CryptoTransactionDetail from './components/crypto/CryptoTransactionDetail'; // <<< ADD THIS
import AMLCaseList from './components/aml/AMLCaseList'; // <<< ADD THIS
import WalletAddressList from './components/crypto/WalletAddressList'; // <<< ADD THIS
import AMLCaseDetail from './components/aml/AMLCaseDetail'; // <<< ADD THIS

// A simple protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to so we can send them along after they login.
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Main dashboard component (example of a protected area)
const Dashboard = () => {
  const { userDetails, logout, hasRole } = useAuth(); // Get userDetails, logout, and hasRole from AuthContext
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <div>
      <header className="App-header">
        <h1>Guardian AI - SAPS Crime Intelligence Dashboard</h1>
        {userDetails && (
          <div style={{ color: 'white', padding: '0 20px', fontSize: '0.9em' }}>
            <span>Welcome, {userDetails.username} ({userDetails.roles.join(', ')})</span>
            <button onClick={handleLogout} style={{ marginLeft: '20px', padding: '5px 10px', cursor: 'pointer' }}>Logout</button>
          </div>
        )}
      </header>
      <main className="App-main">
        {hasRole(['Admin']) && (
          <section className="App-section admin-section" style={{backgroundColor: '#fff0f0', border: '1px solid red'}}>
            <h2>Admin Exclusive Section</h2>
            <p>This content is only visible to users with the 'Admin' role.</p>
            {/* Add admin-specific links or components here */}
            {/* <Link to="/admin/settings">Admin Settings</Link> */}
          </section>
        )}
        <section className="App-section map-section">
          <h2>Crime Hotspot Map</h2>
          <CrimeMap />
        </section>
        <hr className="section-divider" />
        <section className="App-section chart-section">
          <h2>Crime Trends Analysis</h2>
          <CrimeChart />
        </section>
      </main>
      <footer className="App-footer">
        <p>© SAPS Intelligence Unit - Guardian AI Platform</p>
      </footer>
    </div>
  );
};

// App component with routing
function App() {
  return (
    <AuthProvider> {/* Wrap the entire application with AuthProvider */}
      <Router>
        <div className="App">
          <nav className="App-nav"> {/* Basic navigation example */}
            <ul>
              <li><Link to="/">Home/Dashboard</Link></li>
              {/* Conditional links based on auth status can be added here later */}
              {/* Example: if not authenticated, show Login/Register, else show Dashboard/Logout */}
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
              <li><Link to="/predictions">Crime Predictions</Link></li> {/* <<< ADD THIS */}
              <li><Link to="/crypto-transactions">Crypto Transactions</Link></li> {/* <<< ADD THIS */}
              <li><Link to="/aml-cases">AML Cases</Link></li> {/* <<< ADD THIS */}
              <li><Link to="/wallet-addresses">Wallet Addresses</Link></li> {/* <<< ADD THIS */}
            </ul>
          </nav>
          
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            {/* Add other routes here, e.g., /dashboard, /crime/:id, etc. */}
            {/* For now, "/" is the main protected dashboard area */}
            <Route 
              path="/predictions"
              element={
                <ProtectedRoute>
                  <PredictionView />
                </ProtectedRoute>
              }
            /> {/* <<< ADD THIS */}
            <Route 
              path="/crypto-transactions"
              element={
                <ProtectedRoute>
                  <CryptoTransactionList />
                </ProtectedRoute>
              }
            /> {/* <<< ADD THIS */}
            <Route 
              path="/crypto-transaction/:txHashOrId"
              element={
                <ProtectedRoute>
                  <CryptoTransactionDetail />
                </ProtectedRoute>
              }
            /> {/* <<< ADD THIS */}
            <Route 
              path="/aml-cases"
              element={
                <ProtectedRoute>
                  <AMLCaseList />
                </ProtectedRoute>
              }
            /> {/* <<< ADD THIS */}
            <Route 
              path="/wallet-addresses"
              element={
                <ProtectedRoute>
                  <WalletAddressList />
                </ProtectedRoute>
              }
            /> {/* <<< ADD THIS */}
            <Route 
              path="/aml-case/:id" 
              element={
                <ProtectedRoute>
                  <AMLCaseDetail />
                </ProtectedRoute>
              }
            /> {/* <<< ADD THIS */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Update App.css for basic nav styling (optional, but good for usability)
// Add this to web_dashboard/frontend/src/App.css:
/*
.App-nav {
  background-color: #333;
  padding: 10px 0;
  margin-bottom: 20px;
}

.App-nav ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
}

.App-nav ul li {
  margin: 0 15px;
}

.App-nav ul li a {
  color: white;
  text-decoration: none;
  font-weight: bold;
}

.App-nav ul li a:hover {
  text-decoration: underline;
}
*/

export default App;
