// web_dashboard/frontend/src/components/crypto/CryptoTransactionList.js
import React, { useState, useEffect, useCallback } from 'react';
import cryptoService from '../../services/cryptoService'; // Adjust path if necessary
import { Link } from 'react-router-dom'; // <<< UNCOMMENTED/ADDED

// Basic inline styles (consider moving to CSS Modules or a global CSS file for larger apps)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  title: { borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' },
  filters: { marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', gap: '10px', alignItems: 'center' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  button: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  th: { backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' },
  pagination: { marginTop: '20px', textAlign: 'center' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0'},
  loading: { fontStyle: 'italic' },
  detailsCell: { maxWidth: '250px' } // For inputs/outputs
};

const CryptoTransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ blockchain: '', limit: 10 }); // Default limit

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Pass current page and other filters to the service
      const params = { ...filters, page: currentPage };
      const result = await cryptoService.getTransactions(params);
      
      // The backend /api/crime currently returns data.data for the list
      // When we have a dedicated /api/crypto/transactions, it might just return result.data
      // Adapt based on actual API response structure.
      // For now, assuming /api/crime structure: { data: { data: [], totalPages, currentPage, totalCount }}
      // Or if it's simpler: { data: [], totalPages, currentPage }
      
      // The new backend /api/crypto/transactions returns:
      // { data: [], totalPages, currentPage, totalCount }
      // No more nested result.data.data
      if (result && Array.isArray(result.data)) {
        setTransactions(result.data); // result.data is the array of transactions
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.currentPage || 1);
        // Optionally, store totalCount if you want to display it
        // setTotalCount(result.totalCount || 0); 
      } else {
        setTransactions([]);
        setTotalPages(1);
        setCurrentPage(1);
        console.warn("No transaction data found or unexpected response structure:", result);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err.message || 'Could not fetch transactions.');
      setTransactions([]); // Clear transactions on error
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]); // useCallback ensures fetchTransactions is stable if dependencies are stable

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when filters change
    fetchTransactions(); // fetchTransactions will be called by useEffect due to filters dependency change if not immediate
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // fetchTransactions will be called by useEffect due to currentPage dependency change
    }
  };
  
  const renderTransactionDetails = (items, type) => {
    if (!items || items.length === 0) return 'N/A';
    return (
      <ul style={{ margin: 0, paddingLeft: '15px', listStyleType: 'disc' }}>
        {items.slice(0, 2).map((item, index) => ( // Show first 2 items
          <li key={`${type}-${index}`}>{item.address} ({item.amount ? item.amount.toFixed(4) : 'N/A'})</li>
        ))}
        {items.length > 2 && <li>...and {items.length - 2} more</li>}
      </ul>
    );
  };


  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Cryptocurrency Transactions</h2>

      <form onSubmit={handleFilterSubmit} style={styles.filters}>
        <input
          type="text"
          name="blockchain"
          style={styles.input}
          value={filters.blockchain}
          onChange={handleFilterChange}
          placeholder="Filter by Blockchain (e.g., Bitcoin)"
        />
        {/* Add more filter inputs here - e.g., address search, date range */}
        <button type="submit" style={styles.button} disabled={loading}>Apply Filters</button>
      </form>

      {loading && <p style={styles.loading}>Loading transactions...</p>}
      {error && <p style={styles.error}>Error: {error}</p>}
      
      {!loading && !error && transactions.length === 0 && <p>No transactions found.</p>}

      {!loading && transactions.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tx Hash</th>
                <th style={styles.th}>Blockchain</th>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>Inputs (Max 2)</th>
                <th style={styles.th}>Outputs (Max 2)</th>
                <th style={styles.th}>Fee</th>
                <th style={styles.th}>Value (USD)</th>
                {/* <th style={styles.th}>Details</th> */}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                // Assuming tx._id is available from backend for key.
                // If /api/crime is used, it has `id` (string) or `_id` (ObjectId).
                // If /api/crypto/transactions is used, it should have _id.
                // Our CryptoTransaction model has txHash as unique.
                <tr key={tx.id || tx._id || tx.txHash}>
                  <td style={styles.td} title={tx.txHash || tx.caseNumber /* from /api/crime as placeholder */}>
                    <Link to={`/crypto-transaction/${tx.txHash || tx._id}`}>
                      {tx.txHash || tx.caseNumber || 'N/A'}
                    </Link>
                  </td>
                  <td style={styles.td}>{tx.blockchain || (tx.type || 'N/A') /* from /api/crime as placeholder */}</td>
                  <td style={styles.td}>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : (tx.date ? new Date(tx.date).toLocaleString() : 'N/A')}</td>
                  <td style={{...styles.td, ...styles.detailsCell}}>{renderTransactionDetails(tx.inputs, 'in')}</td>
                  <td style={{...styles.td, ...styles.detailsCell}}>{renderTransactionDetails(tx.outputs, 'out')}</td>
                  <td style={styles.td}>{tx.fee !== undefined ? tx.fee.toFixed(5) : 'N/A'}</td>
                  <td style={styles.td}>{tx.valueUSD !== undefined ? `$${tx.valueUSD.toFixed(2)}` : 'N/A'}</td>
                  {/* 
                  <td style={styles.td}>
                    <Link to={`/crypto-transaction/${tx.txHash || tx._id}`}>View</Link>
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

export default CryptoTransactionList;
