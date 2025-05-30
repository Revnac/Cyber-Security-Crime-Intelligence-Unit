// web_dashboard/frontend/src/pages/FundsTracePage.js
import React, { useState } from 'react';
import FundsTraceForm from '../components/forensics/FundsTraceForm';
import FundsTraceResults from '../components/forensics/FundsTraceResults';
import forensicsService from '../services/forensicsService'; // Assuming service is here

// Basic inline styles
const styles = {
  pageContainer: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  pageTitle: { fontSize: '1.8em', color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px', marginBottom: '20px' },
  // Add other page-level styles if needed
};

const FundsTracePage = () => {
  const [traceResults, setTraceResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTraceSubmit = async (traceParams) => {
    setIsLoading(true);
    setError('');
    setTraceResults(null); // Clear previous results
    try {
      const results = await forensicsService.performTrace(traceParams);
      setTraceResults(results);
    } catch (err) {
      console.error("Error performing trace on page:", err);
      setError(err.message || 'Failed to perform funds trace. Please check parameters or server logs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <h1 style={styles.pageTitle}>Cryptocurrency Funds Tracer</h1>
      <p style={{marginBottom: '20px', fontSize: '0.9em', color: '#555'}}>
        Enter a starting cryptocurrency address or transaction hash to trace funds. 
        The trace will attempt to follow transactions up to the specified number of hops.
        Note: Tracing can be resource-intensive. Max hops are limited.
      </p>
      
      <FundsTraceForm onTraceSubmit={handleTraceSubmit} isLoading={isLoading} />
      
      {/* Conditionally render results or initial message */}
      {isLoading && <p style={{fontStyle: 'italic', marginTop: '20px'}}>Performing trace analysis, please wait...</p>}
      {error && <p style={{color: 'red', marginTop: '20px', border: '1px solid red', padding: '10px'}}>Error: {error}</p>}
      
      {/* Render results only if not loading and no error, or if traceResults is populated */}
      {!isLoading && !error && traceResults && (
        <FundsTraceResults results={traceResults} isLoading={false} error={null} />
      )}
      {!isLoading && !error && !traceResults && (
        <p style={{marginTop: '20px', fontStyle: 'italic'}}>Submit trace parameters to view results.</p>
      )}
    </div>
  );
};

export default FundsTracePage;
