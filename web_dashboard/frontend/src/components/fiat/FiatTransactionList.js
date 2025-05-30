// web_dashboard/frontend/src/components/fiat/FiatTransactionList.js
import React, { useState, useEffect, useCallback } from 'react';
import ingestionService from '../../services/ingestionService'; // Assuming getFiatTransactions is here
// import { Link } from 'react-router-dom'; // For linking to details later

// Basic inline styles (consistent with other list components)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  title: { borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' },
  filters: { marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  select: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  button: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', tableLayout: 'fixed' },
  th: { backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '10px', border: '1px solid #ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' },
  descriptionCell: { whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: '250px' },
  pagination: { marginTop: '20px', textAlign: 'center' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0'},
  loading: { fontStyle: 'italic' }
};

const FiatTransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ 
    currencyCode: '', 
    transactionType: '', 
    status: '',
    accountNumber: '',
    limit: 15 
  });

  const fetchFiatTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, page: currentPage };
      for (const key in params) { // Remove empty filter values
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      }
      const result = await ingestionService.getFiatTransactions(params);
      
      if (result && Array.isArray(result.data)) {
        setTransactions(result.data);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.currentPage || 1);
      } else {
        setTransactions([]);
        setTotalPages(1);
        setCurrentPage(1);
        console.warn("No fiat transaction data found or unexpected response structure:", result);
      }
    } catch (err) {
      console.error('Failed to fetch fiat transactions:', err);
      setError(err.message || 'Could not fetch fiat transactions.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchFiatTransactions();
  }, [fetchFiatTransactions]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchFiatTransactions(); 
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const renderPartyDetails = (details) => {
    if (!details) return 'N/A';
    return `${details.holderName || ''} (Acc: ${details.accountNumber || 'N/A'}, Bank: ${details.bankName || 'N/A'})`.trim();
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Fiat Transactions</h2>

      <form onSubmit={handleFilterSubmit} style={styles.filters}>
        <input type="text" name="accountNumber" style={styles.input} value={filters.accountNumber} onChange={handleFilterChange} placeholder="Account Number (Sender/Receiver)" />
        <input type="text" name="currencyCode" style={styles.input} value={filters.currencyCode} onChange={handleFilterChange} placeholder="Currency (e.g., ZAR)" />
        <input type="text" name="transactionType" style={styles.input} value={filters.transactionType} onChange={handleFilterChange} placeholder="Transaction Type" />
        <select name="status" value={filters.status} onChange={handleFilterChange} style={styles.select}>
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Failed">Failed</option>
          <option value="Reversed">Reversed</option>
          <option value="Under Review">Under Review</option>
        </select>
        <button type="submit" style={styles.button} disabled={loading}>Apply Filters</button>
      </form>

      {loading && <p style={styles.loading}>Loading fiat transactions...</p>}
      {error && <p style={styles.error}>Error: {error}</p>}
      
      {!loading && !error && transactions.length === 0 && <p>No fiat transactions found matching your criteria.</p>}

      {!loading && transactions.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{...styles.th, width: '10%'}}>Timestamp</th>
                <th style={{...styles.th, width: '10%'}}>Internal ID</th>
                <th style={{...styles.th, width: '10%'}}>Type</th>
                <th style={{...styles.th, width: '5%'}}>Currency</th>
                <th style={{...styles.th, width: '10%'}}>Amount</th>
                <th style={{...styles.th, width: '15%'}}>Sender</th>
                <th style={{...styles.th, width: '15%'}}>Receiver</th>
                <th style={{...styles.th, width: '15%'}}>Description</th>
                <th style={{...styles.th, width: '5%'}}>Status</th>
                {/* <th style={styles.th}>Details</th> */}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id || tx.internalTransactionId}>
                  <td style={styles.td}>{new Date(tx.timestamp).toLocaleString()}</td>
                  <td style={styles.td} title={tx.internalTransactionId}>{tx.internalTransactionId}</td>
                  <td style={styles.td}>{tx.transactionType}</td>
                  <td style={styles.td}>{tx.currencyCode}</td>
                  <td style={styles.td}>{tx.amount !== undefined ? tx.amount.toFixed(2) : 'N/A'}</td>
                  <td style={styles.td} title={renderPartyDetails(tx.senderDetails)}>{renderPartyDetails(tx.senderDetails)}</td>
                  <td style={styles.td} title={renderPartyDetails(tx.receiverDetails)}>{renderPartyDetails(tx.receiverDetails)}</td>
                  <td style={{...styles.td, ...styles.descriptionCell}} title={tx.description}>{tx.description}</td>
                  <td style={styles.td}>{tx.status}</td>
                  {/* 
                  <td style={styles.td}>
                    <Link to={`/fiat-transaction/${tx.internalTransactionId || tx._id}`}>View</Link>
                  </td> 
                  */}
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

export default FiatTransactionList;
