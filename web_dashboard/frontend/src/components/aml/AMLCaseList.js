// web_dashboard/frontend/src/components/aml/AMLCaseList.js
import React, { useState, useEffect, useCallback } from 'react';
import cryptoService from '../../services/cryptoService'; // Assuming getAMLCases is in cryptoService
import { Link } from 'react-router-dom'; // <<< UNCOMMENTED/ADDED

// Basic inline styles (consistent with CryptoTransactionList)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  title: { borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' },
  filters: { marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  select: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  button: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  th: { backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' },
  pagination: { marginTop: '20px', textAlign: 'center' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0'},
  loading: { fontStyle: 'italic' }
};

const AMLCaseList = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ 
    status: '', 
    priority: '', 
    ruleTriggered: '', 
    limit: 10 
  });

  const fetchAMLCases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, page: currentPage };
      // Remove empty filter values before sending
      for (const key in params) {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      }
      const result = await cryptoService.getAMLCases(params);
      
      if (result && Array.isArray(result.data)) {
        setCases(result.data);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.currentPage || 1);
      } else {
        setCases([]);
        setTotalPages(1);
        setCurrentPage(1);
        console.warn("No AML case data found or unexpected response structure:", result);
      }
    } catch (err) {
      console.error('Failed to fetch AML cases:', err);
      setError(err.message || 'Could not fetch AML cases.');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchAMLCases();
  }, [fetchAMLCases]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchAMLCases(); // Will be called by useEffect due to filters dependency change if not immediate
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>AML Cases / Alerts</h2>

      <form onSubmit={handleFilterSubmit} style={styles.filters}>
        <input
          type="text"
          name="caseId"
          style={styles.input}
          value={filters.caseId || ''}
          onChange={handleFilterChange}
          placeholder="Filter by Case ID"
        />
        <select name="status" value={filters.status || ''} onChange={handleFilterChange} style={styles.select}>
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Open">Open</option>
          <option value="Under Investigation">Under Investigation</option>
          <option value="Pending Review">Pending Review</option>
          <option value="EscalatedToAuthorities">Escalated</option>
          <option value="SARFiled">SAR Filed</option>
          <option value="Closed-FalsePositive">Closed - False Positive</option>
          <option value="Closed-Resolved">Closed - Resolved</option>
        </select>
        <select name="priority" value={filters.priority || ''} onChange={handleFilterChange} style={styles.select}>
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <input
          type="text"
          name="ruleTriggered"
          style={styles.input}
          value={filters.ruleTriggered || ''}
          onChange={handleFilterChange}
          placeholder="Filter by Rule Triggered"
        />
        {/* TODO: Add filter for assignedTo (might need user selector component) */}
        <button type="submit" style={styles.button} disabled={loading}>Apply Filters</button>
      </form>

      {loading && <p style={styles.loading}>Loading AML cases...</p>}
      {error && <p style={styles.error}>Error: {error}</p>}
      
      {!loading && !error && cases.length === 0 && <p>No AML cases found matching your criteria.</p>}

      {!loading && cases.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Case ID</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Rule Triggered</th>
                <th style={styles.th}>Summary</th>
                <th style={styles.th}>Assigned To</th>
                <th style={styles.th}>Opened At</th>
                {/* <th style={styles.th}>Details</th> */}
              </tr>
            </thead>
            <tbody>
              {cases.map((acase) => ( // Renamed from 'case' to 'acase' to avoid keyword clash if any
                <tr key={acase._id || acase.caseId}>
                  <td style={styles.td} title={acase.caseId}>
                    <Link to={`/aml-case/${acase._id}`}>
                      {acase.caseId}
                    </Link>
                  </td>
                  <td style={styles.td}>{acase.status}</td>
                  <td style={styles.td}>{acase.priority}</td>
                  <td style={styles.td} title={acase.ruleTriggered}>{acase.ruleTriggered}</td>
                  <td style={styles.td} title={acase.summary}>{acase.summary}</td>
                  <td style={styles.td}>{acase.assignedTo ? (acase.assignedTo.username || acase.assignedTo._id) : 'Unassigned'}</td>
                  <td style={styles.td}>{new Date(acase.openedAt).toLocaleString()}</td>
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

export default AMLCaseList;
