// web_dashboard/frontend/src/App.js
import React from 'react';
import './App.css'; // Optional: For basic App styling
import CrimeMap from './components/CrimeMap';
import CrimeChart from './components/CrimeChart';

function App() {
  // Advanced: Could include state here for date ranges, filters, etc., to pass to children
  return (
    <div className="App">
      <header className="App-header">
        <h1>Guardian AI - SAPS Crime Intelligence Dashboard</h1>
      </header>
      <main className="App-main">
        <section className="App-section map-section">
          <h2>Crime Hotspot Map</h2>
          {/* Consider adding controls here for filtering map data */}
          <CrimeMap />
        </section>
        <hr className="section-divider" /> {/* Visual separator */}
        <section className="App-section chart-section">
          <h2>Crime Trends Analysis</h2>
          {/* Consider adding controls here for changing chart parameters (date range, crime type) */}
          <CrimeChart />
        </section>
        {/* Future sections for advanced analytics, reporting, etc. can be added here */}
        {/* For example:
        <section className="App-section prediction-section">
          <h2>Predictive Analysis</h2>
          {/* <CrimePredictionComponent /> */}
        </section>
        */}
      </main>
      <footer className="App-footer">
        <p>© SAPS Intelligence Unit - Guardian AI Platform</p>
      </footer>
    </div>
  );
}

export default App;
