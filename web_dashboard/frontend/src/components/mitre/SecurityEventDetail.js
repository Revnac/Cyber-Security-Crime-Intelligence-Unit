// web_dashboard/frontend/src/components/mitre/SecurityEventDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import securityEventService from '../../services/securityEventService';

// Basic inline styles (consistent with other detail components)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', border: '1px solid #eee', borderRadius: '8px', margin: '20px' },
  title: { borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0' },
  loading: { fontStyle: 'italic' },
  detailSection: { marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #eee' },
  label: { fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '3px' },
  value: { marginLeft: '10px', wordBreak: 'break-word' },
  rawDataPre: { backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '300px', overflowY: 'auto' },
  mitreList: { margin: 0, paddingLeft: '20px', listStyleType: 'disc' },
  backLink: { display: 'inline-block', marginTop: '20px', color: '#007bff', textDecoration: 'none' }
};

const SecurityEventDetail = () => {
  const { eventId } = useParams(); // Get the 'eventId' param from URL
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) {
        setError('Event ID is missing from URL.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await securityEventService.getSecurityEventById(eventId);
        setEvent(data);
      } catch (err) {
        console.error(`Failed to fetch security event ${eventId}:`, err);
        setError(err.message || `Could not fetch security event ${eventId}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const renderDetail = (label, value, isDate = false) => (
    <div style={styles.detailSection}>
      <span style={styles.label}>{label}:</span>
      <span style={styles.value}>
        {value !== undefined && value !== null ? 
            (isDate ? new Date(value).toLocaleString() : String(value)) 
            : 'N/A'}
      </span>
    </div>
  );
  
  const renderMitreDetail = (mapping) => {
    if (!mapping || (!mapping.mitre_tactics?.length && !mapping.mitre_techniques?.length)) {
      return <span style={styles.value}>N/A</span>;
    }
    return (
      <div style={styles.value}>
        {mapping.mitre_tactics && mapping.mitre_tactics.length > 0 && (
          <div>
            <strong>Tactics:</strong>
            <ul style={styles.mitreList}>
              {mapping.mitre_tactics.map(t => (
                <li key={t.id}>
                  <a href={t.link} target="_blank" rel="noopener noreferrer" title={t.name}>
                    {t.id}
                  </a>: {t.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {mapping.mitre_techniques && mapping.mitre_techniques.length > 0 && (
          <div style={{ marginTop: mapping.mitre_tactics?.length > 0 ? '5px' : '0' }}>
            <strong>Techniques:</strong>
            <ul style={styles.mitreList}>
              {mapping.mitre_techniques.map(t => (
                <li key={t.id}>
                  <a href={t.link} target="_blank" rel="noopener noreferrer" title={t.name}>
                    {t.id}
                  </a>: {t.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <p style={styles.loading}>Loading security event details...</p>;
  if (error) return <p style={styles.error}>Error: {error}</p>;
  if (!event) return <p>Security event not found or no details available.</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Security Event Detail: {event.originalEventId || event._id}</h2>

      {renderDetail('Event Source', event.eventSource)}
      {renderDetail('Description', event.description)}
      {renderDetail('Severity', event.severity)}
      {renderDetail('Status', event.status)}
      {renderDetail('Event Timestamp', event.eventTimestamp, true)}
      {renderDetail('Received Timestamp', event.receivedTimestamp, true)}
      {renderDetail('Assigned To', event.assignedTo ? event.assignedTo.username : 'Unassigned')}
      {renderDetail('Related Case ID', event.relatedCaseId)}
      
      <div style={styles.detailSection}>
        <span style={styles.label}>Tags:</span>
        <span style={styles.value}>
          {event.tags && event.tags.length > 0 ? event.tags.join(', ') : 'None'}
        </span>
      </div>
      
      <div style={styles.detailSection}>
        <span style={styles.label}>MITRE ATT&CK Mapping:</span>
        {renderMitreDetail(event.mitreAttackMapping)}
      </div>

      {event.rawData && (
        <div style={styles.detailSection}>
          <span style={styles.label}>Raw Data:</span>
          <pre style={styles.rawDataPre}>{JSON.stringify(event.rawData, null, 2)}</pre>
        </div>
      )}
      
      {renderDetail('System Record ID', event._id)}
      {renderDetail('Created At (System)', event.createdAt, true)}
      {renderDetail('Last Updated At (System)', event.updatedAt, true)}

      <Link to="/security-events" style={styles.backLink}>&larr; Back to Security Event List</Link>
    </div>
  );
};

export default SecurityEventDetail;
