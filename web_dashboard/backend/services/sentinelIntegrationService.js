// web_dashboard/backend/services/sentinelIntegrationService.js
const axios = require('axios'); // Assumes axios is a dependency from previous steps
const { auditLog } = require('../utils/logger');

// --- Configuration - These MUST be set in environment variables for security ---
// For Microsoft Graph API (Security API for Incidents/Alerts)
const SENTINEL_TENANT_ID = process.env.SENTINEL_TENANT_ID;
const SENTINEL_CLIENT_ID = process.env.SENTINEL_CLIENT_ID; // Application (client) ID
const SENTINEL_CLIENT_SECRET = process.env.SENTINEL_CLIENT_SECRET; // Client secret
const SENTINEL_GRAPH_API_ENDPOINT = process.env.SENTINEL_GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0/security'; // or /beta/security

// For Azure Monitor Log Analytics API (Alternative for querying raw logs/alerts if needed)
// const SENTINEL_WORKSPACE_ID = process.env.SENTINEL_WORKSPACE_ID; 
// const LOG_ANALYTICS_API_ENDPOINT = `https://api.loganalytics.io/v1/workspaces/${SENTINEL_WORKSPACE_ID}/query`;

let sentinelAuthToken = null;
let tokenExpiryTime = 0;

/**
 * Gets an OAuth 2.0 access token for Microsoft Graph API.
 * Implements client credentials flow. Caches the token until it expires.
 * @returns {Promise<string|null>} Access token or null if an error occurs.
 */
const getSentinelAuthToken = async () => {
  if (sentinelAuthToken && Date.now() < tokenExpiryTime) {
    // console.log("Using cached Sentinel auth token.");
    return sentinelAuthToken;
  }

  if (!SENTINEL_TENANT_ID || !SENTINEL_CLIENT_ID || !SENTINEL_CLIENT_SECRET) {
    console.error('Sentinel auth credentials (TENANT_ID, CLIENT_ID, CLIENT_SECRET) are not configured in environment variables.');
    auditLog('ERROR', 'SENTINEL_AUTH_CONFIG_MISSING', 'System', { message: 'Missing critical Sentinel auth env vars.' });
    return null;
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${SENTINEL_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', SENTINEL_CLIENT_ID);
  params.append('scope', 'https://graph.microsoft.com/.default'); // Scope for Graph API
  params.append('client_secret', SENTINEL_CLIENT_SECRET);
  params.append('grant_type', 'client_credentials');

  try {
    console.log("Attempting to fetch new Sentinel auth token...");
    const response = await axios.post(tokenEndpoint, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000 // 10 seconds timeout
    });

    if (response.data && response.data.access_token) {
      sentinelAuthToken = response.data.access_token;
      // Set expiry time slightly before actual expiry (e.g., 5 minutes buffer)
      tokenExpiryTime = Date.now() + (response.data.expires_in - 300) * 1000; 
      console.log("Successfully fetched new Sentinel auth token.");
      auditLog('INFO', 'SENTINEL_AUTH_TOKEN_FETCHED', 'System', { expires_in_seconds: response.data.expires_in });
      return sentinelAuthToken;
    } else {
      throw new Error('Access token not found in response.');
    }
  } catch (error) {
    console.error('Error fetching Sentinel auth token:', error.response ? error.response.data : error.message);
    auditLog('ERROR', 'SENTINEL_AUTH_TOKEN_FAILURE', 'System', { error: error.response ? error.response.data : error.message });
    sentinelAuthToken = null;
    tokenExpiryTime = 0;
    return null;
  }
};


/**
 * Fetches alerts or incidents from Microsoft Sentinel using the Graph Security API.
 * @param {object} params - Parameters for filtering (e.g., createdDateTime, severity, status).
 *                        Example: { top: 10, filter: "status ne 'resolved' and severity eq 'high'" }
 * @param {'alerts' | 'incidents'} resourceType - Type of resource to fetch ('alerts' or 'incidents').
 * @returns {Promise<Array<object>>} - A list of fetched alerts/incidents.
 */
const fetchSentinelData = async (params = { top: 25 }, resourceType = 'alerts') => {
  const token = await getSentinelAuthToken();
  if (!token) {
    console.error(`Cannot fetch Sentinel ${resourceType}, auth token unavailable.`);
    return []; // Return empty array or throw error
  }

  const validResourceTypes = ['alerts', 'incidents'];
  if (!validResourceTypes.includes(resourceType)) {
      console.error(`Invalid resourceType: ${resourceType}. Must be one of ${validResourceTypes.join(', ')}.`);
      return [];
  }

  // Construct query parameters for Graph API
  const queryParams = new URLSearchParams();
  if (params.top) queryParams.append('$top', params.top);
  if (params.filter) queryParams.append('$filter', params.filter); // e.g., "severity eq 'high'"
  if (params.orderby) queryParams.append('$orderby', params.orderby); // e.g., "createdDateTime desc"
  // Add other OData query parameters as needed: $select, $expand

  const requestUrl = `${SENTINEL_GRAPH_API_ENDPOINT}/${resourceType}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  console.log(`SentinelService: Fetching ${resourceType} from ${requestUrl}`);
  auditLog('INFO', `SENTINEL_FETCH_${resourceType.toUpperCase()}_REQUESTED`, 'System', { url: requestUrl.split('?')[0], params: params });


  try {
    const response = await axios.get(requestUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 seconds timeout
    });

    if (response.data && Array.isArray(response.data.value)) {
      auditLog('INFO', `SENTINEL_FETCH_${resourceType.toUpperCase()}_SUCCESS`, 'System', { count: response.data.value.length });
      return response.data.value;
    } else {
      console.warn(`No ${resourceType} found or unexpected response structure from Sentinel:`, response.data);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching Sentinel ${resourceType}:`, error.response ? error.response.data : error.message);
    auditLog('ERROR', `SENTINEL_FETCH_${resourceType.toUpperCase()}_FAILURE`, 'System', { error: error.response ? error.response.data : error.message });
    return []; // Return empty array on error
  }
};

/**
 * Transforms a raw Sentinel alert/incident object into our SecurityEvent model structure.
 * This is based on the SENTINEL_TO_SECURITY_EVENT_MAPPING.md document.
 * @param {object} sentinelData - The raw alert or incident object from Sentinel.
 * @param {'alert' | 'incident'} sourceType - Indicates if the source is an alert or incident.
 * @returns {object|null} - A transformed object matching SecurityEvent schema or null.
 */
const transformSentinelDataToSecurityEvent = (sentinelData, sourceType) => {
  if (!sentinelData || !sentinelData.id) {
    console.warn("TransformSentinelData: Invalid or incomplete Sentinel data provided.", sentinelData);
    return null;
  }

  // Helper to map Sentinel severity to our internal enum
  const mapSeverity = (sentinelSeverity) => {
    const s = String(sentinelSeverity).toLowerCase();
    if (s === 'high') return 'High';
    if (s === 'medium') return 'Medium';
    if (s === 'low') return 'Low';
    if (s === 'informational' || s === 'unknown') return 'Informational';
    return 'Informational'; // Default
  };

  // Helper to parse MITRE data (conceptual, needs actual Sentinel field knowledge)
  const parseMitre = (data) => {
    const tactics = [];
    const techniques = [];
    // Example for incidents using Graph API (field name might be 'mitreTechniques')
    if (Array.isArray(data.mitreTechniques)) {
        data.mitreTechniques.forEach(techId => {
            // Assuming techId is like "T1234". We'd need a way to get name and tactic.
            // This part is highly dependent on how Sentinel provides this.
            // For now, let's assume we just store the ID and need to enrich later.
            // A more robust solution would involve a local MITRE knowledge base or more detailed API fields.
            techniques.push({ id: techId, name: `Technique ${techId} (Name TBD)`, link: `https://attack.mitre.org/techniques/${techId.replace('.', '/')}` });
            // Inferring tactics from techniques is complex; often Sentinel alerts provide tactics directly.
        });
    }
    // If Sentinel alerts have a 'tactics' array (of strings/names)
    if (Array.isArray(data.tactics)) {
        data.tactics.forEach(tacticName => {
            // We need to map tacticName to tacticID (e.g., "Initial Access" -> "TA0001")
            // This requires a lookup map. For placeholder:
            const tacticId = `TAXXXX (${tacticName})`; // Placeholder ID
            tactics.push({ id: tacticId, name: tacticName, link: `https://attack.mitre.org/tactics/${tacticId.split(' ')[0]}` });
        });
    }
    // If direct 'alertProductTactics' or similar field exists for alerts:
    // if (Array.isArray(data.alertProductTactics)) { ... }

    return { mitre_tactics: tactics, mitre_techniques: techniques };
  };
  
  try {
    const transformed = {
      originalEventId: sentinelData.id,
      eventSource: `Microsoft-Sentinel-${sourceType}`, // e.g., Microsoft-Sentinel-alert
      eventTimestamp: new Date(sentinelData.createdDateTime || sentinelData.timeGenerated || sentinelData.raisedTime || Date.now()),
      receivedTimestamp: new Date(), // Set by our system on ingestion
      severity: mapSeverity(sentinelData.severity),
      description: sentinelData.title || sentinelData.displayName || sentinelData.description || `Sentinel ${sourceType} ${sentinelData.id}`,
      mitreAttackMapping: parseMitre(sentinelData),
      rawData: sentinelData, // Store the full original event
      status: 'New', // Default status in our system
      tags: ['from_sentinel', sourceType, ...(sentinelData.tags || [])]
      // assignedTo and relatedCaseId would be set later if applicable
    };
    return transformed;
  } catch (error) {
      console.error(`Error transforming Sentinel ${sourceType} data for ID ${sentinelData.id}:`, error.message);
      return null;
  }
};


module.exports = {
  fetchSentinelData,
  transformSentinelDataToSecurityEvent,
  getSentinelAuthToken // Exporting for potential direct use or testing
};
