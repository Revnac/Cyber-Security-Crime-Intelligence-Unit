// web_dashboard/frontend/src/services/ingestionService.js
import authService from './authService'; // To get the auth token

const FIAT_INGEST_API_URL = '/api/ingest/fiat/csv';
const FIAT_TRANSACTIONS_API_URL = '/api/fiat/transactions'; // <<< ADD THIS
// const CRYPTO_INGEST_API_URL = '/api/ingest/csv'; // For crypto CSVs, if we want to consolidate

/**
 * Uploads a CSV file of fiat transactions for ingestion.
 * @param {File} file - The CSV file object to upload.
 * @returns {Promise<object>} - The summary response from the backend.
 */
const ingestFiatCSV = async (file) => {
  const token = authService.getAuthToken();
  if (!token) {
    return Promise.reject(new Error('No authentication token found.'));
  }
  if (!file) {
    return Promise.reject(new Error('No file selected for upload.'));
  }

  const formData = new FormData();
  // 'fiatTransactionsCsv' must match the field name expected by multer on the backend
  formData.append('fiatTransactionsCsv', file); 

  console.log(`IngestionService: Uploading fiat CSV file "${file.name}" to ${FIAT_INGEST_API_URL}`);

  try {
    const response = await fetch(FIAT_INGEST_API_URL, {
      method: 'POST',
      headers: {
        // 'Content-Type': 'multipart/form-data' is set automatically by browser when using FormData
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const responseData = await response.json(); // Always try to parse JSON

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }
    return responseData; // Expected: { message: '...', summary: { ... } }
  } catch (error) {
    console.error('Failed to ingest fiat CSV:', error);
    // If error object already has a message (e.g. from !response.ok), rethrow it,
    // otherwise create a more generic one.
    throw error; 
  }
};

// TODO: Add ingestCryptoCSV(file) function if consolidating ingestion services here.

const ingestionService = {
  ingestFiatCSV,
  getFiatTransactions, // <<< ADD THIS
  // ingestCryptoCSV,
};

export default ingestionService;
