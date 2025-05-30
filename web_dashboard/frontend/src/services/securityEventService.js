// web_dashboard/frontend/src/services/securityEventService.js
import authService from './authService'; // To get the auth token

const EVENTS_API_URL = '/api/events'; // Base URL for security event APIs

/**
 * Fetches security events with optional filters.
 * @param {object} filters - Optional filters like page, limit, eventSource, severity, status, etc.
 * @returns {Promise<object>} - The data from the API (e.g., { data: [], totalPages: 1, currentPage: 1 })
 */
const getSecurityEvents = async (filters = {}) => {
  const token = authService.getAuthToken();
  if (!token) {
    return Promise.reject(new Error('No authentication token found.'));
  }

  const queryParams = new URLSearchParams();
  // General filters
  if (filters.page) queryParams.append('page', filters.page);
  if (filters.limit) queryParams.append('limit', filters.limit);
  if (filters.eventSource) queryParams.append('eventSource', filters.eventSource);
  if (filters.severity) queryParams.append('severity', filters.severity);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.startDate) queryParams.append('startDate', filters.startDate); // Expects ISO string
  if (filters.endDate) queryParams.append('endDate', filters.endDate);     // Expects ISO string
  if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);

  // MITRE specific filters
  if (filters.mitreTacticId) queryParams.append('mitreTacticId', filters.mitreTacticId);
  if (filters.mitreTechniqueId) queryParams.append('mitreTechniqueId', filters.mitreTechniqueId);
  
  const queryString = queryParams.toString();
  const requestUrl = `${EVENTS_API_URL}${queryString ? `?${queryString}` : ''}`;
  
  console.log(`SecurityEventService: Fetching events from ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json(); // Expects { data: [], totalPages, currentPage, totalCount }
  } catch (error) {
    console.error('Failed to fetch security events:', error);
    throw error;
  }
};

/**
 * Fetches security events by a specific MITRE ATT&CK Tactic ID.
 * (This function might be redundant if getSecurityEvents with filters is preferred,
 *  but included as per original plan for Step 12.2.3 service placeholders)
 * @param {string} tacticId - The MITRE ATT&CK Tactic ID.
 * @param {object} filters - Optional filters like page, limit, etc.
 * @returns {Promise<object>} - The data from the API.
 */
const getSecurityEventsByTactic = async (tacticId, filters = {}) => {
  if (!tacticId) return Promise.reject(new Error('MITRE Tactic ID is required.'));
  // Can use getSecurityEvents or call a specific backend endpoint if it offers more specific logic
  return getSecurityEvents({ ...filters, mitreTacticId: tacticId });
  // Or if backend has /api/events/by-tactic/:tacticId
  // const token = authService.getAuthToken(); /* ... fetch call to specific endpoint ... */
};

/**
 * Fetches security events by a specific MITRE ATT&CK Technique ID.
 * (This function might be redundant if getSecurityEvents with filters is preferred)
 * @param {string} techniqueId - The MITRE ATT&CK Technique ID.
 * @param {object} filters - Optional filters like page, limit, etc.
 * @returns {Promise<object>} - The data from the API.
 */
const getSecurityEventsByTechnique = async (techniqueId, filters = {}) => {
  if (!techniqueId) return Promise.reject(new Error('MITRE Technique ID is required.'));
  return getSecurityEvents({ ...filters, mitreTechniqueId: techniqueId });
  // Or if backend has /api/events/by-technique/:techniqueId
  // const token = authService.getAuthToken(); /* ... fetch call to specific endpoint ... */
};

// Placeholder for event ingestion if frontend ever needs to do this (e.g., manual event entry form)
// const ingestSecurityEvent = async (eventData) => {
//   const token = authService.getAuthToken();
//   if (!token) return Promise.reject(new Error('No authentication token found.'));
//   const requestUrl = `${EVENTS_API_URL}/ingest`;
//   // ... POST request logic ...
// };

/**
 * Fetches details for a single security event by its MongoDB _id.
 * @param {string} eventId - The MongoDB _id of the security event.
 * @returns {Promise<object>} - The event details from the API.
 */
const getSecurityEventById = async (eventId) => {
  const token = authService.getAuthToken();
  if (!token) {
    return Promise.reject(new Error('No authentication token found.'));
  }

  if (!eventId) {
    return Promise.reject(new Error('Event ID is required.'));
  }

  const requestUrl = `${EVENTS_API_URL}/${eventId}`;
  console.log(`SecurityEventService: Fetching event details from ${requestUrl}`);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json(); // Expects backend to return the single event object
  } catch (error) {
    console.error(`Failed to fetch event details for ${eventId}:`, error);
    throw error;
  }
};

const securityEventService = {
  getSecurityEvents,
  getSecurityEventsByTactic,
  getSecurityEventsByTechnique,
  getSecurityEventById, // <<< ADD THIS
  // ingestSecurityEvent // If implemented
};

export default securityEventService;
