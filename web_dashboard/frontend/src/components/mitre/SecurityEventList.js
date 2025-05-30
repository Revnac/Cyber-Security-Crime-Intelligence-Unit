// web_dashboard/frontend/src/components/mitre/SecurityEventList.js
import React, { useState, useEffect, useCallback } from 'react';
import securityEventService from '../../services/securityEventService';
import { Link } from 'react-router-dom'; // <<< UNCOMMENTED/ADDED

// Basic inline styles (consistent with other list components)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  title: { borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' },
  filters: { marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  select: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  button: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', tableLayout: 'fixed' }, // tableLayout fixed for better column width control
  th: { backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '10px', border: '1px solid #ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  descriptionCell: { whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: '300px' },
  mitreCell: { whiteSpace: 'normal', maxWidth: '250px' },
  pagination: { marginTop: '20px', textAlign: 'center' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0'},
  loading: { fontStyle: 'italic' }
};

const SecurityEventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ 
    eventSource: '', 
    severity: '', 
    status: '',
    mitreTacticId: '',
    mitreTechniqueId: '',
    limit: 15 // Default limit
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, page: currentPage };
      for (const key in params) { // Remove empty filter values
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      }
      const result = await securityEventService.getSecurityEvents(params);
      
      if (result && Array.isArray(result.data)) {
        setEvents(result.data);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.currentPage || 1);
      } else {
        setEvents([]);
        setTotalPages(1);
        setCurrentPage(1);
        console.warn("No security event data found or unexpected response structure:", result);
      }
    } catch (err) {
      console.error('Failed to fetch security events:', err);
      setError(err.message || 'Could not fetch security events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchEvents(); 
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  const renderMitreMapping = (mapping) => {
    if (!mapping || (!mapping.mitre_tactics?.length && !mapping.mitre_techniques?.length)) {
      return 'N/A';
    }
    return (
      <>
        {mapping.mitre_tactics && mapping.mitre_tactics.length > 0 && (
          <div>
            <strong>Tactics:</strong>
            <ul style={{ margin: 0, paddingLeft: '15px', listStyleType: 'disc' }}>
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
            <ul style={{ margin: 0, paddingLeft: '15px', listStyleType: 'disc' }}>
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
      </>
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Security Events Log</h2>

      <form onSubmit={handleFilterSubmit} style={styles.filters}>
        <input type="text" name="eventSource" style={styles.input} value={filters.eventSource} onChange={handleFilterChange} placeholder="Event Source (e.g., Meraki-IDS)" />
        <select name="severity" value={filters.severity} onChange={handleFilterChange} style={styles.select}>
          <option value="">All Severities</option>
          <option value="Informational">Informational</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <select name="status" value={filters.status} onChange={handleFilterChange} style={styles.select}>
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="UnderInvestigation">Under Investigation</option>
          <option value="Correlated">Correlated</option>
          <option value="Closed">Closed</option>
        </select>
        <input type="text" name="mitreTacticId" style={styles.input} value={filters.mitreTacticId} onChange={handleFilterChange} placeholder="Tactic ID (e.g., TA0001)" />
        <input type="text" name="mitreTechniqueId" style={styles.input} value={filters.mitreTechniqueId} onChange={handleFilterChange} placeholder="Technique ID (e.g., T1190)" />
        <button type="submit" style={styles.button} disabled={loading}>Apply Filters</button>
      </form>

      {loading && <p style={styles.loading}>Loading security events...</p>}
      {error && <p style={styles.error}>Error: {error}</p>}
      
      {!loading && !error && events.length === 0 && <p>No security events found matching your criteria.</p>}

      {!loading && events.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, width: '15%'}}>Timestamp</th>
                <th style={{...styles.th, width: '10%'}}>Source</th>
                <th style={{...styles.th, width: '10%'}}>Severity</th>
                <th style={{...styles.th, width: '25%'}}>Description</th>
                <th style={{...styles.th, width: '25%'}}>MITRE ATT&CK</th>
                <th style={{...styles.th, width: '10%'}}>Status</th>
                <th style={{...styles.th, width: '10%'}}>Actions</th> {/* <<< ADDED HEADER */}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id} style={event.eventSource && event.eventSource.includes('Sentinel') ? { backgroundColor: '#e6f7ff' } : {}}>
                  <td style={styles.td}>{new Date(event.eventTimestamp).toLocaleString()}</td>
                  <td style={styles.td} title={event.eventSource}>{event.eventSource}</td>
                  <td style={styles.td}>{event.severity}</td>
                  <td style={{...styles.td, ...styles.descriptionCell}} title={event.description}>{event.description}</td>
                  <td style={{...styles.td, ...styles.mitreCell}}>{renderMitreMapping(event.mitreAttackMapping)}</td>
                  <td style={styles.td}>{event.status}</td>
                  <td style={styles.td}> {/* <<< ADDED CELL */}
                    <Link to={`/security-event/${event._id}`}>View Details</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={styles.pagination}>
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage <= 1 || loading}
              style={styles.button}
            >
              Previous
            </button>
            <span style={{ margin: '0 10px' }}>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage >= totalPages || loading}
              style={styles.button}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SecurityEventList;
