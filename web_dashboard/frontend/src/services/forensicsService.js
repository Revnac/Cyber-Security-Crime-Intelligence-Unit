// web_dashboard/frontend/src/services/forensicsService.js
import authService from './authService'; // To get the auth token

const FORENSICS_API_URL = '/api/crypto'; // Base URL for crypto forensics related APIs

/**
 * Performs a funds trace by calling the backend API.
 * @param {object} traceParams - Parameters for the trace.
 *   Expected: { startIdentifier, identifierType, direction, blockchain, maxHops, options (optional) }
 * @returns {Promise<object>} - The graph data response from the backend.
 */
const performTrace = async (traceParams) => {
  const token = authService.getAuthToken();
  if (!token) {
    return Promise.reject(new Error('No authentication token found.'));
  }

  if (!traceParams || !traceParams.startIdentifier || !traceParams.identifierType || !traceParams.direction || !traceParams.blockchain || !traceParams.maxHops) {
    return Promise.reject(new Error('Missing required parameters for fund tracing.'));
  }

  const requestUrl = `${FORENSICS_API_URL}/trace-funds`;
  console.log(`ForensicsService: Performing trace from ${requestUrl} with params:`, traceParams);

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(traceParams),
    });

    const responseData = await response.json(); // Always try to parse JSON

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }
    return responseData; // Expected: { nodes: [], edges: [], summary: {} }
  } catch (error) {
    console.error('Failed to perform funds trace:', error);
    throw error; 
  }
};

const forensicsService = {
  performTrace,
};

export default forensicsService;
