import React from 'react';
import CrimeMap from './CrimeMap';
import CrimeChart from './CrimeChart';
import CyberIntelWidget from './CyberIntelWidget'; // Added import
// import './Dashboard.css'; // Optional: if using a separate CSS file

const Dashboard = () => {
  const mockMapData = [
    { id: 1, lat: -26.1076, lng: 28.0567, description: "Mock Crime A - Randburg" },
    { id: 2, lat: -26.1086, lng: 28.0577, description: "Mock Crime B - Randburg" },
    { id: 3, lat: -26.1000, lng: 28.0500, description: "Mock Crime C - Nearby" }
  ];
  const mockMapCenter = { lat: -26.1076, lng: 28.0567 };

  const mockChartData = [
    { date: '2024-03-01', crimes: 3 },
    { date: '2024-03-02', crimes: 7 },
    { date: '2024-03-03', crimes: 5 },
    { date: '2024-03-04', crimes: 9 }
  ];

  // Optional basic styling
  const dashboardStyle = {
    padding: '20px'
  };

  const componentStyle = {
    marginBottom: '30px',
    border: '1px solid #eee',
    padding: '15px'
  };
  
  const componentTitleStyle = {
    borderBottom: '1px solid #ccc',
    paddingBottom: '10px',
    marginBottom: '15px'
  }

  return (
    <div style={dashboardStyle}>
      <div style={componentStyle}>
        <h2 style={componentTitleStyle}>Crime Hotspot Map</h2>
        <CrimeMap 
          apiKey="YOUR_GOOGLE_MAPS_API_KEY_PLACEHOLDER" 
          crimesData={mockMapData}
          initialCenter={mockMapCenter}
        />
      </div>
      
      <div style={componentStyle}>
        <h2 style={componentTitleStyle}>Crime Trends</h2>
        <CrimeChart chartData={mockChartData} />
      </div>

      {/* Added CyberIntelWidget section */}
      <div style={componentStyle}>
        <h2 style={componentTitleStyle}>Cyber Intelligence Tools</h2>
        <CyberIntelWidget />
      </div>
    </div>
  );
};

export default Dashboard;
