// web_dashboard/frontend/src/components/ingestion/FiatCSVUpload.js
import React, { useState } from 'react';
import ingestionService from '../../services/ingestionService'; // Assuming service is here

// Basic inline styles
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', border: '1px solid #eee', borderRadius: '8px', margin: '20px', maxWidth: '600px' },
  title: { borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
  input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '5px' },
  button: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
  error: { color: 'red', marginTop: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0'},
  success: { color: 'green', marginTop: '10px', padding: '10px', border: '1px solid green', borderRadius: '4px', backgroundColor: '#e6ffed'},
  summary: { marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', whiteSpace: 'pre-wrap' },
  loading: { fontStyle: 'italic' }
};

const FiatCSVUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadSummary, setUploadSummary] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadError('');
    setUploadSuccess('');
    setUploadSummary(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a CSV file to upload.');
      return;
    }

    setIsLoading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadSummary(null);

    try {
      const response = await ingestionService.ingestFiatCSV(selectedFile);
      setUploadSuccess(response.message || 'File processed successfully!');
      setUploadSummary(response.summary || null);
      setSelectedFile(null); // Clear file input after successful upload
      // Clear the file input visually (this is a bit tricky with controlled file inputs)
      event.target.reset(); 
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError(error.message || 'File upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Upload Fiat Transactions CSV</h2>
      <form onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label htmlFor="fiatCsvFile" style={styles.label}>CSV File:</label>
          <input
            type="file"
            id="fiatCsvFile"
            style={styles.input}
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <small>Ensure CSV headers match expected format (e.g., Internal_Transaction_ID, Amount, Currency_Code, etc.)</small>
        </div>
        <button type="submit" style={styles.button} disabled={isLoading || !selectedFile}>
          {isLoading ? 'Uploading...' : 'Upload and Process CSV'}
        </button>
      </form>

      {isLoading && <p style={styles.loading}>Processing file, please wait...</p>}
      {uploadError && <p style={styles.error}>{uploadError}</p>}
      {uploadSuccess && <p style={styles.success}>{uploadSuccess}</p>}
      
      {uploadSummary && (
        <div style={styles.summary}>
          <strong>Ingestion Summary:</strong>
          <p>Processed: {uploadSummary.processed}</p>
          <p>Saved: {uploadSummary.saved}</p>
          <p>Failed: {uploadSummary.failed}</p>
        </div>
      )}
    </div>
  );
};

export default FiatCSVUpload;
