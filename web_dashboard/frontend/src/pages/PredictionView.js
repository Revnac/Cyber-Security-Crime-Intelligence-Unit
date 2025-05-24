// web_dashboard/frontend/src/pages/PredictionView.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // To get token for API calls
// import authService from '../services/authService'; // Or directly use getAuthToken

const PredictionView = () => {
  const [predictions, setPredictions] = useState(null); // Could be hotspots, risk scores, etc.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth(); // Get token for authenticated API requests

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!token) {
        setError('Authentication token not found. Cannot fetch predictions.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        // Replace with actual API endpoint for fetching prediction data
        // This endpoint needs to be created in the backend.
        // It should be protected and might accept parameters (date range, area, etc.)
        // const response = await fetch('/api/predictions', { // Example endpoint
        //   headers: {
        //     'Authorization': `Bearer ${token}`,
        //   },
        // });

        // if (!response.ok) {
        //   const errorData = await response.json();
        //   throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        // }
        // const data = await response.json();
        // setPredictions(data);

        // --- MOCK DATA FOR NOW ---
        console.log("Fetching predictions with token:", token ? "Token present" : "No Token");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        const mockData = {
          generatedAt: new Date().toISOString(),
          type: "Simulated Hotspot Prediction",
          predictedHotspots: [
            { id: 1, lat: -26.090, lng: 28.005, riskScore: 0.85, details: "High risk of theft - Evening" },
            { id: 2, lat: -26.100, lng: 27.990, riskScore: 0.70, details: "Moderate risk of assault - Night" },
            { id: 3, lat: -26.095, lng: 28.010, riskScore: 0.90, details: "Very high risk of carjacking - Late Night" },
          ],
          confidenceLevel: 0.75,
          summary: "Predictions based on historical data up to last week. Focus on indicated areas."
        };
        setPredictions(mockData);
        // --- END MOCK DATA ---

      } catch (err) {
        console.error('Error fetching prediction data:', err);
        setError(err.message || 'Failed to fetch prediction data.');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [token]); // Re-fetch if token changes (e.g., on login/logout, though usually handled by route protection)

  // Basic inline styles
  const styles = {
    container: { padding: '20px', border: '1px solid #eee', borderRadius: '8px', margin: '20px 0', backgroundColor: '#f9f9f9' },
    title: { borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' },
    error: { color: 'red' },
    loading: { fontStyle: 'italic' },
    predictionItem: { marginBottom: '10px', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' },
    summary: { marginTop: '20px', fontStyle: 'italic', color: '#555'}
  };

  if (loading) return <p style={styles.loading}>Loading prediction data...</p>;
  if (error) return <p style={styles.error}>Error: {error}</p>;
  if (!predictions) return <p>No prediction data available at the moment.</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Crime Prediction View ({predictions.type})</h2>
      <p><strong>Data Generated At:</strong> {new Date(predictions.generatedAt).toLocaleString()}</p>
      <p><strong>Overall Confidence Level:</strong> {predictions.confidenceLevel * 100}%</p>
      
      <h3>Predicted Hotspots/Events:</h3>
      {predictions.predictedHotspots && predictions.predictedHotspots.length > 0 ? (
        <ul>
          {predictions.predictedHotspots.map(spot => (
            <li key={spot.id} style={styles.predictionItem}>
              <strong>Location (Lat/Lng):</strong> {spot.lat.toFixed(3)}, {spot.lng.toFixed(3)} <br />
              <strong>Risk Score:</strong> {spot.riskScore.toFixed(2)} <br />
              <strong>Details:</strong> {spot.details}
            </li>
          ))}
        </ul>
      ) : (
        <p>No specific hotspots predicted in this run.</p>
      )}
      <p style={styles.summary}><strong>Summary:</strong> {predictions.summary}</p>
      {/* 
        Future enhancements:
        - Integrate with CrimeMap to show hotspots visually.
        - Allow filtering predictions by date, area, risk level.
        - Display charts for prediction trends or confidence scores.
      */}
    </div>
  );
};

export default PredictionView;
