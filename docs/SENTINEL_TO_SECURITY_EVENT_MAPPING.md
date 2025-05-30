# Microsoft Sentinel Alert/Incident to SecurityEvent Model Mapping

This document outlines a conceptual mapping from common fields found in Microsoft Sentinel alerts or incidents (retrieved via the Microsoft Graph Security API or Azure Monitor API) to the fields in our `SecurityEvent` Mongoose model. The actual fields available from Sentinel can vary based on the alert source and Sentinel configuration.

**`SecurityEvent` Model Fields Reference:**

*   `originalEventId`: (String) Sentinel Alert/Incident ID.
*   `eventSource`: (String) Static value, e.g., 'Microsoft-Sentinel'.
*   `eventTimestamp`: (Date) Timestamp of when the alert/incident occurred in Sentinel (e.g., `createdDateTime`, `startTime`, `timeGenerated`).
*   `receivedTimestamp`: (Date) Timestamp when our system ingested it (set by our service).
*   `severity`: (String Enum) Map Sentinel severity (e.g., 'High', 'Medium', 'Low', 'Informational') to our enum.
*   `description`: (String) Sentinel Alert/Incident title or description.
*   `mitreAttackMapping`: (Object)
    *   `mitre_tactics`: [{id, name, link}]
    *   `mitre_techniques`: [{id, name, link}]
*   `rawData`: (Mixed) The full JSON object of the Sentinel alert/incident.
*   `status`: (String Enum) Initial status in our system (e.g., 'New'). Sentinel might have its own status.
*   `assignedTo`: (ObjectId ref: 'User') Initially null, can be assigned in our system.
*   `relatedCaseId`: (String) Link to an `AMLCase` if applicable.
*   `tags`: [String] Additional tags we might add.

---

## Conceptual Mapping from Sentinel to SecurityEvent

This mapping assumes we are fetching alerts/incidents from Sentinel. The exact field names from Sentinel API responses need to be verified during implementation.

| SecurityEvent Field         | Potential Sentinel Source Field(s) (Examples)                                  | Transformation/Notes                                                                                                                               |
|-----------------------------|--------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `originalEventId`           | `id` (Graph API incident/alert ID), `alertId`, `name` (sometimes used as ID)   | Choose the most stable unique identifier from Sentinel.                                                                                              |
| `eventSource`               | N/A                                                                            | Static value: 'Microsoft-Sentinel'. Could be more granular if needed (e.g., 'Sentinel-RuleName').                                                  |
| `eventTimestamp`            | `createdDateTime`, `startTime`, `timeGenerated`, `raisedTime`                    | Select the most relevant timestamp representing when the event/alert occurred. Convert to ISO Date.                                                |
| `receivedTimestamp`         | N/A                                                                            | Set by our ingestion service (`new Date()`).                                                                                                       |
| `severity`                  | `severity` (e.g., High, Medium, Low, Informational), `alertSeverity`           | Map Sentinel's severity values to our `SecurityEvent` enum. Handle potential case differences.                                                     |
| `description`               | `title`, `displayName`, `description`, `alertDisplayName`                        | Use the most descriptive field. May require concatenation or selection.                                                                            |
| `mitreAttackMapping`        | `tactics` (array of strings), `techniques` (array of strings from `mitreTechniques` in incidents, or embedded in alert entities/details) | **This is a key area for detailed parsing.** Sentinel often provides MITRE tactic names and technique IDs. We need to: <br> - Extract tactic IDs (e.g., 'TAXXXX') and names. <br> - Extract technique IDs (e.g., 'TXXXX' or 'TXXXX.XXX') and names. <br> - Construct the `link` URLs. <br> - Store as arrays of objects as per `MitreMappingSchema`. |
| `rawData`                   | The entire JSON object of the fetched Sentinel alert/incident.                   | Store the full original data for reference and future analysis.                                                                                    |
| `status`                    | N/A (Sentinel has its own status, e.g., `status`, `incidentStatus`)            | Default to 'New' in our system. Sentinel's status can be stored in `rawData` or a custom field within `metadata` if needed for sync.               |
| `assignedTo`                | `assignedTo` (Graph API incident owner)                                        | If Sentinel has an owner, we could try to map it to our User model, or store the Sentinel owner name in `metadata`. Default to `null`.                |
| `relatedCaseId`             | N/A                                                                            | Initially `null`. Can be linked later in our system.                                                                                               |
| `tags`                      | `tags` (Graph API), `labels`                                                   | Transfer existing tags/labels from Sentinel. Add new ones as needed (e.g., 'from_sentinel').                                                       |

### Detailed Field Considerations for `mitreAttackMapping`

Sentinel alerts (especially from Microsoft Defender products) often include MITRE ATT&CK information. Incidents in the Graph API might have a `mitreTechniques` array.

*   **Tactics:** Sentinel might provide tactic names (e.g., "Initial Access"). We need to map these names to their IDs (e.g., "TA0001") and construct the link. A local mapping dictionary or a utility function might be needed if only names are available.
*   **Techniques:** Sentinel usually provides technique IDs (e.g., "T1059.001"). We would need to get the corresponding technique name (either from Sentinel data if provided, or by maintaining a local MITRE knowledge base/mapping, or by parsing from a description). The link can be constructed from the ID.

### Example Transformation Snippet (Conceptual Pseudocode)

```javascript
function transformSentinelAlertToSecurityEvent(sentinelAlert) {
  const securityEvent = {
    originalEventId: sentinelAlert.id,
    eventSource: 'Microsoft-Sentinel',
    eventTimestamp: new Date(sentinelAlert.createdDateTime || sentinelAlert.timeGenerated),
    receivedTimestamp: new Date(),
    severity: mapSentinelSeverity(sentinelAlert.severity), // mapSentinelSeverity is a helper
    description: sentinelAlert.title || sentinelAlert.alertDisplayName,
    mitreAttackMapping: parseMitreData(sentinelAlert), // parseMitreData is a helper
    rawData: sentinelAlert,
    status: 'New',
    // ... other fields
  };
  return securityEvent;
}

function mapSentinelSeverity(sentinelSeverity) {
  const s = String(sentinelSeverity).toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'medium') return 'Medium';
  if (s === 'low') return 'Low';
  return 'Informational'; // Default
}

function parseMitreData(sentinelAlert) {
  const tactics = [];
  const techniques = [];
  // Logic to find and parse tactics from sentinelAlert.tactics or other fields
  // Example: if (sentinelAlert.tactics) { sentinelAlert.tactics.forEach(tName => { /* find ID, construct link */ }); }
  // Logic to find and parse techniques from sentinelAlert.mitreTechniques or other fields
  // Example: if (sentinelAlert.mitreTechniques) { sentinelAlert.mitreTechniques.forEach(tId => { /* find Name, construct link */ }); }
  return { mitre_tactics: tactics, mitre_techniques: techniques };
}
```

This conceptual mapping will guide the implementation of `transformSentinelAlertToSecurityEvent` in `sentinelIntegrationService.js`. Actual field names from the Sentinel API need to be confirmed during development.
```
