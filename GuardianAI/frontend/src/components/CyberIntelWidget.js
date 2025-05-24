import React, { useState } from 'react';

const CyberIntelWidget = () => {
  const [ipAddress, setIpAddress] = useState('');
  const [ipReputationData, setIpReputationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (event) => {
    setIpAddress(event.target.value);
  };

  const handleSubmit = async () => {
    if (!ipAddress) {
      alert("Please enter an IP address.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setIpReputationData(null); // Clear previous results

    try {
      // Assuming backend is running on http://localhost:8000
      const response = await fetch(`http://localhost:8000/tools/check-ip-reputation/${ipAddress}`);
      if (!response.ok) {
        // Try to get error message from backend if available
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch (e) {
            // Could not parse error JSON, stick with status code
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setIpReputationData(data);
    } catch (e) {
      console.error("Failed to fetch IP reputation:", e);
      setError(`Failed to fetch IP reputation: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Basic styling for the widget
  const widgetStyle = {
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    marginTop: '20px'
  };

  const inputStyle = {
    marginRight: '10px',
    padding: '8px',
    borderRadius: '3px',
    border: '1px solid #ccc'
  };

  const buttonStyle = {
    padding: '8px 15px',
    borderRadius: '3px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer'
  };
  
  const buttonDisabledStyle = {
    ...buttonStyle,
    backgroundColor: '#cccccc',
    cursor: 'not-allowed'
  }

  const preStyle = {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '3px',
    marginTop: '10px',
    whiteSpace: 'pre-wrap', // Handles long lines
    wordBreak: 'break-all' // Breaks long words/strings
  }


  return (
    <div style={widgetStyle}>
      <h3>Check IP Reputation</h3>
      <input 
        type="text" 
        value={ipAddress} 
        onChange={handleInputChange} 
        placeholder="Enter IP Address"
        style={inputStyle}
      />
      <button 
        onClick={handleSubmit} 
        disabled={isLoading} 
        style={isLoading ? buttonDisabledStyle : buttonStyle}
      >
        {isLoading ? 'Checking...' : 'Check IP Reputation'}
      </button>

      {isLoading && <p>Loading...</p>}

      {error && <p style={{color: 'red'}}>{error}</p>}

      {ipReputationData && (
        <div>
          <h4>Reputation Details:</h4>
          <pre style={preStyle}>{JSON.stringify(ipReputationData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default CyberIntelWidget;
