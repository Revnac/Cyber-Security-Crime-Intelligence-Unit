// web_dashboard/frontend/src/services/cryptoService.js
import authService from './authService'; // To get the auth token

// Base URL for crypto related APIs - adjust if your backend routes are different
// For now, we'll use a placeholder as the actual crypto transaction endpoint isn't created yet.
// const CRYPTO_API_URL = '/api/crypto'; // Example base
const CRYPTO_TRANSACTIONS_API_URL = '/api/crypto/transactions'; // <<< CHANGE THIS
const AML_CASES_API_URL = '/api/aml/cases'; // <<< ADD THIS
const WALLET_ADDRESSES_API_URL = '/api/crypto/wallets'; // <<< ADD THIS

/**
 * Fetches cryptocurrency transactions.
 * Placeholder: Currently uses the '/api/crime' endpoint.
 * This should be updated to a dedicated '/api/crypto/transactions' endpoint when available.
 * @param {object} filters - Optional filters like page, limit, blockchain, etc.
 * @returns {Promise<object>} - The data from the API (e.g., { data: [], totalPages: 1, currentPage: 1 })
 */
const getTransactions = async (filters = {}) => {
  const token = authService.getAuthToken();
  if (!token) {
    // Handle case where token is not available, though protected routes should prevent this.
    return Promise.reject(new Error('No authentication token found.'));
  }

  // Build query string from filters
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.append('page', filters.page);
  if (filters.limit) queryParams.append('limit', filters.limit);
  if (filters.blockchain) queryParams.append('blockchain', filters.blockchain);
  // Add other filters as needed: e.g., address, txHash search

  const queryString = queryParams.toString();
  const requestUrl = `${CRYPTO_TRANSACTIONS_API_URL}${queryString ? `?${queryString}` : ''}`; // <<< CHANGE THIS
  
  console.log(`CryptoService: Fetching transactions from ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Attempt to parse error response from backend, otherwise throw generic error
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (parseError) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    return response.json(); // Expects backend to return { data: [], totalPages, currentPage, totalCount }
  } catch (error) {
    console.error('Failed to fetch crypto transactions:', error);
    throw error; // Re-throw to be handled by the calling component
  }
};

/**
 * Fetches details for a single cryptocurrency transaction.
 * @param {string} txHashOrId - The transaction hash or MongoDB _id.
 * @returns {Promise<object>} - The transaction details from the API.
 */
const getTransactionDetails = async (txHashOrId) => {
  const token = authService.getAuthToken();
  if (!token) {
    return Promise.reject(new Error('No authentication token found.'));
  }

  if (!txHashOrId) {
    return Promise.reject(new Error('Transaction hash or ID is required.'));
  }

  const requestUrl = `${CRYPTO_TRANSACTIONS_API_URL}/${txHashOrId}`;
  console.log(`CryptoService: Fetching transaction details from ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (parseError) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    return response.json(); // Expects backend to return the single transaction object
  } catch (error) {
    console.error(`Failed to fetch transaction details for ${txHashOrId}:`, error);
    throw error;
  }
};

// TODO: Add other crypto-related API service functions as needed:
// - getTransactionById(txId)
// - getWalletDetails(walletAddress, blockchain)
// - getEntityDetails(entityId)
// - getAMLCaseById(caseId)
// - getAMLCaseList(filters)

/**
 * Fetches AML cases.
 * @param {object} filters - Optional filters like page, limit, status, priority, etc.
 * @returns {Promise<object>} - The data from the API (e.g., { data: [], totalPages: 1, currentPage: 1 })
 */
const getAMLCases = async (filters = {}) => {
  const token = authService.getAuthToken();
  if (!token) {
    return Promise.reject(new Error('No authentication token found.'));
  }

  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.append('page', filters.page);
  if (filters.limit) queryParams.append('limit', filters.limit);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.priority) queryParams.append('priority', filters.priority);
  if (filters.ruleTriggered) queryParams.append('ruleTriggered', filters.ruleTriggered);
  if (filters.assignedTo) queryParams.append('assignedTo', filters.assignedTo);
  if (filters.caseId) queryParams.append('caseId', filters.caseId);
  // Add other relevant filters as needed

  const queryString = queryParams.toString();
  const requestUrl = `${AML_CASES_API_URL}${queryString ? `?${queryString}` : ''}`;
  
  console.log(`CryptoService: Fetching AML cases from ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      } catch (parseError) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    return response.json(); // Expects backend to return { data: [], totalPages, currentPage, totalCount }
  } catch (error) {
    console.error('Failed to fetch AML cases:', error);
    throw error;
  }
};

/**
 * Fetches details for a single AML case.
 * @param {string} caseIdOrMongoID - The caseId or MongoDB _id of the case.
 * @returns {Promise<object>} - The case details from the API.
 */
const getAMLCaseDetails = async (caseIdOrMongoID) => {
  const token = authService.getAuthToken();
  if (!token) return Promise.reject(new Error('No authentication token found.'));
  if (!caseIdOrMongoID) return Promise.reject(new Error('Case ID is required.'));

  const requestUrl = `${AML_CASES_API_URL}/${caseIdOrMongoID}`;
  console.log(`CryptoService: Fetching AML case details from ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to fetch AML case details for ${caseIdOrMongoID}:`, error);
    throw error;
  }
};

/**
 * Updates an AML case.
 * @param {string} caseIdOrMongoID - The caseId or MongoDB _id of the case to update.
 * @param {object} caseData - An object containing the fields to update.
 * @returns {Promise<object>} - The updated case details from the API.
 */
const updateAMLCase = async (caseIdOrMongoID, caseData) => {
  const token = authService.getAuthToken();
  if (!token) return Promise.reject(new Error('No authentication token found.'));
  if (!caseIdOrMongoID) return Promise.reject(new Error('Case ID is required for update.'));
  if (!caseData || Object.keys(caseData).length === 0) return Promise.reject(new Error('Case data for update is required.'));

  const requestUrl = `${AML_CASES_API_URL}/${caseIdOrMongoID}`;
  console.log(`CryptoService: Updating AML case ${caseIdOrMongoID} at ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(caseData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to update AML case ${caseIdOrMongoID}:`, error);
    throw error;
  }
};

/**
 * Adds a note to an AML case.
 * @param {string} caseIdOrMongoID - The caseId or MongoDB _id of the case.
 * @param {object} noteData - An object containing the note, e.g., { note: "This is a test note." }.
 * @returns {Promise<object>} - The updated case details (including all notes) from the API.
 */
const addNoteToAMLCase = async (caseIdOrMongoID, noteData) => {
  const token = authService.getAuthToken();
  if (!token) return Promise.reject(new Error('No authentication token found.'));
  if (!caseIdOrMongoID) return Promise.reject(new Error('Case ID is required to add a note.'));
  if (!noteData || !noteData.note || String(noteData.note).trim() === '') return Promise.reject(new Error('Note content is required.'));

  const requestUrl = `${AML_CASES_API_URL}/${caseIdOrMongoID}/notes`;
  console.log(`CryptoService: Adding note to AML case ${caseIdOrMongoID} at ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(noteData), // Backend expects { "note": "..." }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to add note to AML case ${caseIdOrMongoID}:`, error);
    throw error;
  }
};


const cryptoService = {
  getTransactions,
  getTransactionDetails, // <<< ADD THIS
  getAMLCases, // <<< ADD THIS
  getWalletAddresses, // <<< ADD THIS
  getAMLCaseDetails, // <<< ADD THIS
  updateAMLCase, // <<< ADD THIS
  addNoteToAMLCase, // <<< ADD THIS
  // ... other functions
};

export default cryptoService;
