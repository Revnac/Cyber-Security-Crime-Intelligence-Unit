// web_dashboard/frontend/src/components/crypto/WalletAddressList.js
import React, { useState, useEffect, useCallback } from 'react';
import cryptoService from '../../services/cryptoService';
// import { Link } from 'react-router-dom'; // For linking to wallet details later

// Basic inline styles (consistent with other list components)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
  title: { borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' },
  filters: { marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '10px' },
  button: { padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
  th: { backgroundColor: '#f0f0f0', padding: '10px', border: '1px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', border: '1px solid #ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' },
  tagsCell: { maxWidth: '250px', whiteSpace: 'normal' },
  pagination: { marginTop: '20px', textAlign: 'center' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0'},
  loading: { fontStyle: 'italic' }
};

const WalletAddressList = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ 
    blockchain: '', 
    address: '', 
    tag: '',
    riskScoreMin: '',
    riskScoreMax: '',
    limit: 10 
  });

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters, page: currentPage };
      for (const key in params) { // Remove empty filter values
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      }
      const result = await cryptoService.getWalletAddresses(params);
      
      if (result && Array.isArray(result.data)) {
        setWallets(result.data);
        setTotalPages(result.totalPages || 1);
        setCurrentPage(result.currentPage || 1);
      } else {
        setWallets([]);
        setTotalPages(1);
        setCurrentPage(1);
        console.warn("No wallet address data found or unexpected response structure:", result);
      }
    } catch (err) {
      console.error('Failed to fetch wallet addresses:', err);
      setError(err.message || 'Could not fetch wallet addresses.');
      setWallets([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleFilterChange = (e) => {
    const { name, value, type } = e.target;
    setFilters({ 
        ...filters, 
        [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value 
    });
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page
    fetchWallets(); 
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Wallet Addresses</h2>

      <form onSubmit={handleFilterSubmit} style={styles.filters}>
        <input
          type="text" name="address" style={styles.input}
          value={filters.address} onChange={handleFilterChange} placeholder="Filter by Address (partial)"
        />
        <input
          type="text" name="blockchain" style={styles.input}
          value={filters.blockchain} onChange={handleFilterChange} placeholder="Blockchain (e.g., Bitcoin)"
        />
        <input
          type="text" name="tag" style={styles.input}
          value={filters.tag} onChange={handleFilterChange} placeholder="Tag"
        />
        <input
          type="number" name="riskScoreMin" style={styles.input}
          value={filters.riskScoreMin} onChange={handleFilterChange} placeholder="Min Risk (0-100)" min="0" max="100"
        />
        <input
          type="number" name="riskScoreMax" style={styles.input}
          value={filters.riskScoreMax} onChange={handleFilterChange} placeholder="Max Risk (0-100)" min="0" max="100"
        />
        <button type="submit" style={styles.button} disabled={loading}>Apply Filters</button>
      </form>

      {loading && <p style={styles.loading}>Loading wallet addresses...</p>}
      {error && <p style={styles.error}>Error: {error}</p>}
      
      {!loading && !error && wallets.length === 0 && <p>No wallet addresses found matching your criteria.</p>}

      {!loading && wallets.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>Blockchain</th>
                <th style={styles.th}>Risk Score</th>
                <th style={styles.th}>Tags</th>
                <th style={styles.th}>Tx Count</th>
                <th style={styles.th}>Total Received</th>
                <th style={styles.th}>Total Sent</th>
                <th style={styles.th}>Last Seen</th>
                {/* <th style={styles.th}>Details</th> */}
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet._id || wallet.address}>
                  <td style={styles.td} title={wallet.address}>{wallet.address}</td>
                  <td style={styles.td}>{wallet.blockchain}</td>
                  <td style={styles.td}>{wallet.riskScore !== null && wallet.riskScore !== undefined ? wallet.riskScore.toFixed(0) : 'N/A'}</td>
                  <td style={{...styles.td, ...styles.tagsCell}}>{wallet.tags && wallet.tags.length > 0 ? wallet.tags.join(', ') : 'None'}</td>
                  <td style={styles.td}>{wallet.transactionCount}</td>
                  <td style={styles.td}>{wallet.totalReceived !== undefined ? wallet.totalReceived.toFixed(4) : 'N/A'}</td>
                  <td style={styles.td}>{wallet.totalSent !== undefined ? wallet.totalSent.toFixed(4) : 'N/A'}</td>
                  <td style={styles.td}>{wallet.lastSeenAt ? new Date(wallet.lastSeenAt).toLocaleDateString() : 'N/A'}</td>
                  {/* 
                  <td style={styles.td}>
                    <Link to={`/wallet-address/${wallet.address}?blockchain=${wallet.blockchain}`}>View</Link>
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

export default WalletAddressList;
