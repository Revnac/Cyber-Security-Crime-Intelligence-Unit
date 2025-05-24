// web_dashboard/frontend/src/components/crypto/CryptoTransactionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // useParams to get txHashOrId from URL
import cryptoService from '../../services/cryptoService';

// Basic inline styles (consider moving to a shared CSS or CSS Modules)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', border: '1px solid #eee', borderRadius: '8px', margin: '20px' },
  title: { borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0' },
  loading: { fontStyle: 'italic' },
  detailSection: { marginBottom: '15px' },
  label: { fontWeight: 'bold', color: '#555' },
  value: { marginLeft: '10px', wordBreak: 'break-all' }, // Allow long strings like hashes to wrap
  ioTable: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '10px' },
  ioTh: { backgroundColor: '#f8f8f8', padding: '8px', border: '1px solid #e0e0e0', textAlign: 'left' },
  ioTd: { padding: '8px', border: '1px solid #e0e0e0', wordBreak: 'break-all' },
  metadataPre: { backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  backLink: { display: 'inline-block', marginTop: '20px', color: '#007bff', textDecoration: 'none' }
};

const CryptoTransactionDetail = () => {
  const { txHashOrId } = useParams(); // Get the parameter from the URL
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!txHashOrId) {
        setError('Transaction hash or ID is missing.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await cryptoService.getTransactionDetails(txHashOrId);
        setTransaction(data);
      } catch (err) {
        console.error(`Failed to fetch transaction ${txHashOrId}:`, err);
        setError(err.message || `Could not fetch transaction ${txHashOrId}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [txHashOrId]);

  const renderDetail = (label, value) => (
    <div style={styles.detailSection}>
      <span style={styles.label}>{label}:</span>
      <span style={styles.value}>{value !== undefined && value !== null ? String(value) : 'N/A'}</span>
    </div>
  );

  const renderTimestamp = (label, timestamp) => (
    renderDetail(label, timestamp ? new Date(timestamp).toLocaleString() : 'N/A')
  );

  if (loading) return <p style={styles.loading}>Loading transaction details...</p>;
  if (error) return <p style={styles.error}>Error: {error}</p>;
  if (!transaction) return <p>Transaction not found or no details available.</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Transaction Details</h2>
      
      {renderDetail('Transaction Hash', transaction.txHash)}
      {renderDetail('Blockchain', transaction.blockchain)}
      {renderTimestamp('Timestamp', transaction.timestamp)}
      {renderDetail('Block Height', transaction.blockHeight)}
      {renderDetail('Value (USD)', transaction.valueUSD !== undefined ? `$${transaction.valueUSD.toFixed(2)}` : 'N/A')}
      {renderDetail('Fee', transaction.fee !== undefined ? transaction.fee.toFixed(8) : 'N/A')}
      
      <div style={styles.detailSection}>
        <span style={styles.label}>Inputs:</span>
        {transaction.inputs && transaction.inputs.length > 0 ? (
          <table style={styles.ioTable}>
            <thead><tr><th style={styles.ioTh}>Address</th><th style={styles.ioTh}>Amount</th><th style={styles.ioTh}>Prev TxHash</th></tr></thead>
            <tbody>
              {transaction.inputs.map((input, index) => (
                <tr key={`input-${index}`}>
                  <td style={styles.ioTd}>{input.address || 'N/A'}</td>
                  <td style={styles.ioTd}>{input.amount !== undefined ? input.amount.toFixed(8) : 'N/A'}</td>
                  <td style={styles.ioTd} title={input.previousTxHash}>{input.previousTxHash ? `${input.previousTxHash.substring(0,20)}...` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <span style={styles.value}>No inputs or coinbase.</span>}
      </div>

      <div style={styles.detailSection}>
        <span style={styles.label}>Outputs:</span>
        {transaction.outputs && transaction.outputs.length > 0 ? (
          <table style={styles.ioTable}>
            <thead><tr><th style={styles.ioTh}>Address</th><th style={styles.ioTh}>Amount</th><th style={styles.ioTh}>Script Type</th><th style={styles.ioTh}>Spent</th></tr></thead>
            <tbody>
              {transaction.outputs.map((output, index) => (
                <tr key={`output-${index}`}>
                  <td style={styles.ioTd}>{output.address || 'N/A'}</td>
                  <td style={styles.ioTd}>{output.amount !== undefined ? output.amount.toFixed(8) : 'N/A'}</td>
                  <td style={styles.ioTd}>{output.scriptType || 'N/A'}</td>
                  <td style={styles.ioTd}>{output.spent !== undefined ? String(output.spent) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <span style={styles.value}>No outputs.</span>}
      </div>

      {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
        <div style={styles.detailSection}>
          <span style={styles.label}>Metadata:</span>
          <pre style={styles.metadataPre}>{JSON.stringify(transaction.metadata, null, 2)}</pre>
        </div>
      )}
      
      {renderTimestamp('Created At (System)', transaction.createdAt)}

      <Link to="/crypto-transactions" style={styles.backLink}>&larr; Back to Transaction List</Link>
    </div>
  );
};

export default CryptoTransactionDetail;
