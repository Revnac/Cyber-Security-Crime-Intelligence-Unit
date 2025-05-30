// web_dashboard/frontend/src/components/forensics/FundsTraceForm.js
import React, { useState } from 'react';

// Basic inline styles (consistent with other form/filter components)
const styles = {
  formContainer: { padding: '15px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' },
  formGroup: { marginBottom: '10px', display: 'flex', flexDirection: 'column' },
  label: { marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9em' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9em' },
  select: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9em' },
  button: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', marginTop: '10px' },
  error: { color: 'red', fontSize: '0.9em', marginTop: '5px' }
};

const FundsTraceForm = ({ onTraceSubmit, isLoading }) => {
  const [startIdentifier, setStartIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState('address'); // 'address' or 'tx'
  const [direction, setDirection] = useState('forward'); // 'forward', 'backward', or 'both'
  const [blockchain, setBlockchain] = useState(''); // e.g., 'Bitcoin', 'Ethereum'
  const [maxHops, setMaxHops] = useState(2); // Default to 2 hops
  const [formError, setFormError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!startIdentifier.trim() || !blockchain.trim()) {
      setFormError('Start Identifier and Blockchain are required.');
      return;
    }
    if (maxHops <= 0 || maxHops > 5) { // Align with backend validation for maxHops
        setFormError('Max Hops must be between 1 and 5.');
        return;
    }

    onTraceSubmit({
      startIdentifier: startIdentifier.trim(),
      identifierType,
      direction,
      blockchain: blockchain.trim(),
      maxHops: parseInt(maxHops, 10),
      // options: {} // For future additional options
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.formContainer}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Initiate Funds Trace</h3>
      {formError && <p style={styles.error}>{formError}</p>}
      
      <div style={styles.formGroup}>
        <label htmlFor="startIdentifier" style={styles.label}>Start Identifier (Address or Tx Hash):</label>
        <input
          type="text" id="startIdentifier" name="startIdentifier" style={styles.input}
          value={startIdentifier} onChange={(e) => setStartIdentifier(e.target.value)}
          placeholder="e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa or tx_hash_string"
          required disabled={isLoading}
        />
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="identifierType" style={styles.label}>Identifier Type:</label>
        <select 
          id="identifierType" name="identifierType" style={styles.select}
          value={identifierType} onChange={(e) => setIdentifierType(e.target.value)}
          disabled={isLoading}
        >
          <option value="address">Address</option>
          <option value="tx">Transaction Hash</option>
        </select>
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="direction" style={styles.label}>Trace Direction:</label>
        <select 
          id="direction" name="direction" style={styles.select}
          value={direction} onChange={(e) => setDirection(e.target.value)}
          disabled={isLoading}
        >
          <option value="forward">Forward</option>
          <option value="backward">Backward</option>
          <option value="both">Both</option>
        </select>
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="blockchain" style={styles.label}>Blockchain:</label>
        <input
          type="text" id="blockchain" name="blockchain" style={styles.input}
          value={blockchain} onChange={(e) => setBlockchain(e.target.value)}
          placeholder="e.g., Bitcoin, Ethereum (case-sensitive as per backend)"
          required disabled={isLoading}
        />
      </div>

      <div style={styles.formGroup}>
        <label htmlFor="maxHops" style={styles.label}>Max Hops (1-5):</label>
        <input
          type="number" id="maxHops" name="maxHops" style={styles.input}
          value={maxHops} onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
          min="1" max="5" required disabled={isLoading}
        />
      </div>
      
      <button type="submit" style={styles.button} disabled={isLoading}>
        {isLoading ? 'Tracing...' : 'Perform Trace'}
      </button>
    </form>
  );
};

export default FundsTraceForm;
