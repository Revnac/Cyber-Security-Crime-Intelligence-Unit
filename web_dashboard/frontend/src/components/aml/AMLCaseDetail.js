// web_dashboard/frontend/src/components/aml/AMLCaseDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // useParams to get txHashOrId from URL
import cryptoService from '../../services/cryptoService'; // Assuming getAMLCaseDetails is here

// Basic inline styles (consistent with CryptoTransactionDetail)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', border: '1px solid #eee', borderRadius: '8px', margin: '20px' },
  title: { borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '20px' },
  error: { color: 'red', padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#ffe0e0' },
  loading: { fontStyle: 'italic' },
  detailSection: { marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px dashed #eee' },
  label: { fontWeight: 'bold', color: '#333', display: 'block', marginBottom: '5px' },
  value: { marginLeft: '10px', wordBreak: 'break-word' },
  subSection: { marginTop: '10px', paddingLeft: '20px' },
  listItem: { marginBottom: '5px', padding: '5px', backgroundColor: '#f9f9f9', borderRadius: '3px' },
  noteItem: { border: '1px solid #e0e0e0', padding: '10px', marginBottom: '10px', borderRadius: '4px' },
  noteAuthor: { fontWeight: 'bold', fontSize: '0.9em', color: '#555' },
  noteTimestamp: { fontSize: '0.8em', color: '#777', marginLeft: '10px' },
  backLink: { display: 'inline-block', marginTop: '20px', color: '#007bff', textDecoration: 'none' }
};

const AMLCaseDetail = () => {
  const { id: caseIdOrMongoID } = useParams(); // Get the 'id' param from URL (e.g., /aml-case/:id)
  const [amlCase, setAmlCase] = useState(null);
  const [loading, setLoading] = useState(true); // Main page loading
  const [error, setError] = useState(''); // Main page error

  // New states for case management
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [actionError, setActionError] = useState(''); // For status/assign errors
  const [actionSuccess, setActionSuccess] = useState(''); // For status/assign success

  const [selectedStatus, setSelectedStatus] = useState(''); 
  const [assigneeUserId, setAssigneeUserId] = useState(''); 
  // const { user: currentUser } = useAuth(); // If needed for frontend checks

  // New states for linking transactions
  const [linkFiatTxId, setLinkFiatTxId] = useState('');
  const [linkCryptoTxId, setLinkCryptoTxId] = useState('');
  const [isLinking, setIsLinking] = useState(false); // Can be boolean or string ('fiat', 'crypto')
  const [linkError, setLinkError] = useState('');


  useEffect(() => {
    const fetchCaseDetails = async () => {
      if (!caseIdOrMongoID) {
        setError('Case ID is missing from URL.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await cryptoService.getAMLCaseDetails(caseIdOrMongoID);
        setAmlCase(data);
        // Initialize states from fetched case data
        setSelectedStatus(data.status || '');
        setAssigneeUserId(data.assignedTo?._id || ''); 
        // setSarDetails(data.sarFiled || { filed: false, dateFiled: '', referenceNumber: '' }); // SAR part deferred
      } catch (err) {
        console.error(`Failed to fetch AML case ${caseIdOrMongoID}:`, err);
        setError(err.message || `Could not fetch AML case ${caseIdOrMongoID}.`);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseIdOrMongoID]);

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

  // --- Handler Functions for Case Management ---
  const handleLinkFiatTx = async () => {
    if (!linkFiatTxId.trim()) {
      setLinkError('Please enter a Fiat Transaction ID to link.');
      return;
    }
    setIsLinking('fiat'); setLinkError(''); setActionSuccess(''); // Clear other messages
    try {
      const updatedCase = await cryptoService.linkFiatTransactionToAMLCase(caseIdOrMongoID, linkFiatTxId.trim());
      setAmlCase(updatedCase); // Refresh case details
      setLinkFiatTxId(''); // Clear input
      setActionSuccess('Fiat transaction linked successfully!'); 
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (error) {
      console.error("Error linking fiat transaction:", error);
      setLinkError(error.message || 'Failed to link fiat transaction.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkCryptoTx = async () => {
    if (!linkCryptoTxId.trim()) {
      setLinkError('Please enter a Crypto Transaction ID/Hash to link.');
      return;
    }
    setIsLinking('crypto'); setLinkError(''); setActionSuccess(''); // Clear other messages
    try {
      const updatedCase = await cryptoService.linkCryptoTransactionToAMLCase(caseIdOrMongoID, linkCryptoTxId.trim());
      setAmlCase(updatedCase); // Refresh case details
      setLinkCryptoTxId(''); // Clear input
      setActionSuccess('Crypto transaction linked successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (error) {
      console.error("Error linking crypto transaction:", error);
      setLinkError(error.message || 'Failed to link crypto transaction.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      setNoteError('Note cannot be empty.');
      return;
    }
    setIsSubmittingNote(true);
    setNoteError('');
    setActionSuccess('');
    setActionError('');
    try {
      const updatedCase = await cryptoService.addNoteToAMLCase(caseIdOrMongoID, { note: newNoteText });
      setAmlCase(updatedCase); // Update the case details with the new note
      setNewNoteText(''); // Clear the textarea
      setActionSuccess('Note added successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to add note:', err);
      setNoteError(err.message || 'Could not add note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      setActionError('Please select a status.');
      return;
    }
    setLoading(true); // Use main loading for these actions for simplicity
    setActionError('');
    setActionSuccess('');
    try {
      const updatedCase = await cryptoService.updateAMLCase(caseIdOrMongoID, { status: selectedStatus });
      setAmlCase(updatedCase);
      setSelectedStatus(updatedCase.status); // Ensure UI reflects confirmed status
      setActionSuccess('Status updated successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update status:', err);
      setActionError(err.message || 'Could not update status.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    setLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      // Send null if assigneeUserId is empty to unassign
      const updatedCase = await cryptoService.updateAMLCase(caseIdOrMongoID, { assignedTo: assigneeUserId.trim() || null });
      setAmlCase(updatedCase);
      setAssigneeUserId(updatedCase.assignedTo?._id || ''); // Update local state
      setActionSuccess(assigneeUserId.trim() ? 'Case assigned successfully!' : 'Case unassigned successfully!');
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to assign user:', err);
      setActionError(err.message || 'Could not assign user.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !amlCase) return <p style={styles.loading}>Loading AML case details...</p>; // Show initial loading only
  if (error && !amlCase) return <p style={styles.error}>Error: {error}</p>; // Show initial error only
  if (!amlCase) return <p>AML Case not found or no details available.</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>AML Case Details: {amlCase.caseId}</h2>

      {renderDetail('Status', amlCase.status)}
      {renderDetail('Priority', amlCase.priority)}
      {renderDetail('Rule Triggered', amlCase.ruleTriggered)}
      {renderDetail('Summary', amlCase.summary)}
      {renderDetail('Detailed Description', amlCase.detailedDescription)}
      {renderDetail('Assigned To', amlCase.assignedTo ? `${amlCase.assignedTo.username} (${amlCase.assignedTo.email})` : 'Unassigned')}
      {renderDetail('Opened At', amlCase.openedAt, true)}
      {renderDetail('Last Updated At', amlCase.updatedAt, true)}
      {amlCase.closedAt && renderDetail('Closed At', amlCase.closedAt, true)}
      {renderDetail('Resolution Details', amlCase.resolutionDetails)}

      <div style={styles.detailSection}>
        <span style={styles.label}>SAR Filed Details:</span>
        <div style={styles.subSection}>
            {renderDetail('Filed', String(amlCase.sarFiled?.filed))}
            {amlCase.sarFiled?.filed && (
                <>
                    {renderDetail('Date Filed', amlCase.sarFiled.dateFiled, true)}
                    {renderDetail('Reference Number', amlCase.sarFiled.referenceNumber)}
                </>
            )}
        </div>
      </div>
      
      <div style={styles.detailSection}>
        <span style={styles.label}>Triggering Transactions:</span>
        {amlCase.triggeringTransactions && amlCase.triggeringTransactions.length > 0 ? (
          <ul style={styles.subSection}>
            {amlCase.triggeringTransactions.map(tx => (
              <li key={tx._id || tx.txHash} style={styles.listItem}>
                <Link to={`/crypto-transaction/${tx.txHash || tx._id}`}>
                  {tx.txHash} ({tx.blockchain}) - Value: ${tx.valueUSD !== undefined ? tx.valueUSD.toFixed(2) : 'N/A'}
                </Link>
              </li>
            ))}
          </ul>
        ) : <span style={styles.value}>None</span>}
      </div>

      {/* Display Linked Fiat Transactions */}
      <div style={styles.detailSection}>
        <span style={styles.label}>Linked Fiat Transactions:</span>
        {amlCase.triggeringFiatTransactions && amlCase.triggeringFiatTransactions.length > 0 ? (
          <ul style={styles.subSection}>
            {amlCase.triggeringFiatTransactions.map(fTx => (
              <li key={fTx._id || fTx.internalTransactionId} style={styles.listItem}>
                ID: {fTx.internalTransactionId || fTx._id} - {fTx.currencyCode} {fTx.amount?.toFixed(2)} on {new Date(fTx.timestamp).toLocaleDateString()}
                {/* TODO: Link to a FiatTransactionDetail page if one exists later */}
              </li>
            ))}
          </ul>
        ) : <span style={styles.value}>None</span>}
      </div>

      {/* Placeholder for Triggering Wallet Addresses - assuming these are ObjectIds or need more details */}
      <div style={styles.detailSection}>
        <span style={styles.label}>Triggering Wallet Addresses:</span>
        {amlCase.triggeringWalletAddresses && amlCase.triggeringWalletAddresses.length > 0 ? (
          <ul style={styles.subSection}>
            {amlCase.triggeringWalletAddresses.map((addr, index) => (
              // Assuming addr is an ObjectId or a string address for now.
              // TODO: Link to a WalletAddressDetail page if available
              <li key={index} style={styles.listItem}>{typeof addr === 'object' ? addr._id : addr}</li>
            ))}
          </ul>
        ) : <span style={styles.value}>None</span>}
      </div>

      {/* Placeholder for Associated Entities */}
      <div style={styles.detailSection}>
        <span style={styles.label}>Associated Entities:</span>
        {amlCase.associatedEntities && amlCase.associatedEntities.length > 0 ? (
          <ul style={styles.subSection}>
            {amlCase.associatedEntities.map(entity => (
              // Assuming entity is an ObjectId or has a name property if populated
              // TODO: Link to an EntityDetail page if available
              <li key={entity._id || entity} style={styles.listItem}>{entity.name || (typeof entity === 'object' ? entity._id : entity)}</li>
            ))}
          </ul>
        ) : <span style={styles.value}>None</span>}
      </div>
      
      <div style={styles.detailSection}>
        <span style={styles.label}>Investigation Notes:</span>
        {amlCase.investigationNotes && amlCase.investigationNotes.length > 0 ? (
          <div style={styles.subSection}>
            {amlCase.investigationNotes.slice().reverse().map(note => ( // Show newest notes first
              <div 
                key={note._id} 
                style={
                  note.isSystemGenerated || !note.author 
                  ? {...styles.noteItem, backgroundColor: '#f0f5ff', borderLeft: '3px solid #007bff'} 
                  : styles.noteItem
                }
              >
                <p>{note.note}</p>
                <small>
                  <span style={styles.noteAuthor}>
                    By: {note.isSystemGenerated || !note.author ? 'System Automation' : (note.author.username || 'Unknown User')}
                  </span>
                  <span style={styles.noteTimestamp}>
                    At: {new Date(note.timestamp).toLocaleString()}
                  </span>
                </small>
              </div>
            ))}
          </div>
        ) : <span style={styles.value}>No notes yet.</span>}
      </div>

      {/* Placeholder for Attachments */}
      <div style={styles.detailSection}>
        <span style={styles.label}>Attachments:</span>
        {amlCase.attachments && amlCase.attachments.length > 0 ? (
          <ul style={styles.subSection}>
            {amlCase.attachments.map((att, index) => (
              <li key={index} style={styles.listItem}>{att.fileName} ({att.fileType})</li> // TODO: Link to download
            ))}
          </ul>
        ) : <span style={styles.value}>No attachments.</span>}
      </div>

      <Link to="/aml-cases" style={styles.backLink}>&larr; Back to AML Case List</Link>
      
      {/* --- Case Management Actions --- */}
      <div style={{...styles.detailSection, marginTop: '30px', borderTop: '2px solid #ccc', paddingTop: '20px'}}>
        <h3 style={{...styles.title, fontSize: '1.2em', color: '#007bff', marginBottom: '15px'}}>Case Management Actions</h3>

        {/* Global Action Feedback Area */}
        {actionError && <p style={{...styles.error, marginBottom: '15px'}}>{actionError}</p>}
        {actionSuccess && <p style={{color: 'green', marginBottom: '15px', textAlign: 'center', border: '1px solid green', padding: '10px', borderRadius: '4px', backgroundColor: '#e6ffe6'}}>{actionSuccess}</p>}

        {/* --- Add Note Section --- */}
        <div style={{...styles.subSection, border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginBottom: '20px'}}>
          <h4 style={{...styles.title, fontSize: '1.1em', borderBottom: 'none', marginBottom: '10px', color: '#333'}}>Add Investigation Note</h4>
          <textarea
            style={{ width: 'calc(100% - 22px)', minHeight: '80px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '10px'}}
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Enter your note..."
            disabled={isSubmittingNote || loading}
          />
          <button 
            onClick={handleAddNote} 
            style={{...styles.button, backgroundColor: '#5cb85c'}} 
            disabled={isSubmittingNote || !newNoteText.trim() || loading}
          >
            {isSubmittingNote ? 'Adding Note...' : 'Add Note'}
          </button>
          {noteError && <p style={{...styles.error, marginTop: '10px'}}>{noteError}</p>}
        </div>

        {/* --- Update Status Section --- */}
        <div style={{...styles.subSection, border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginBottom: '20px'}}>
          <h4 style={{...styles.title, fontSize: '1.1em', borderBottom: 'none', marginBottom: '10px', color: '#333'}}>Update Case Status</h4>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)} 
            style={{...styles.input, width: 'auto', marginRight: '10px'}} // Using styles.input for consistency
            disabled={loading}
          >
            <option value="New">New</option>
            <option value="Open">Open</option>
            <option value="Under Investigation">Under Investigation</option>
            <option value="Pending Review">Pending Review</option>
            <option value="EscalatedToAuthorities">Escalated To Authorities</option>
            <option value="SARFiled">SAR Filed</option>
            <option value="Closed-FalsePositive">Closed - False Positive</option>
            <option value="Closed-Resolved">Closed - Resolved</option>
            <option value="Closed-Other">Closed - Other</option>
          </select>
          <button 
            onClick={handleUpdateStatus} 
            style={styles.button} 
            disabled={loading || !selectedStatus || selectedStatus === amlCase.status}
          >
            Update Status
          </button>
        </div>

        {/* --- Assign User Section --- */}
        <div style={{...styles.subSection, border: '1px solid #eee', padding: '15px', borderRadius: '5px'}}>
          <h4 style={{...styles.title, fontSize: '1.1em', borderBottom: 'none', marginBottom: '10px', color: '#333'}}>Assign Case</h4>
          <input 
            type="text" 
            style={styles.input} 
            placeholder="Enter User MongoDB ID to assign"
            value={assigneeUserId}
            onChange={(e) => setAssigneeUserId(e.target.value)}
            disabled={loading}
          />
          <button 
            onClick={handleAssignUser} 
            style={styles.button} 
            disabled={loading || assigneeUserId === (amlCase.assignedTo?._id || '')}
          >
            {assigneeUserId.trim() ? 'Assign User' : 'Unassign User'}
          </button>
        </div>

        {/* --- Link Existing Transactions Section --- */}
        <div style={{...styles.subSection, border: '1px solid #eee', padding: '15px', borderRadius: '5px', marginTop: '20px'}}>
            <h4 style={{...styles.title, fontSize: '1.1em', borderBottom: 'none', marginBottom: '10px', color: '#333'}}>Link Existing Transactions to Case</h4>
            {linkError && <p style={{...styles.error, marginBottom: '10px'}}>{linkError}</p>}
            
            {/* Link Fiat Tx */}
            <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                type="text" 
                placeholder="Fiat Transaction MongoDB ID to link" 
                value={linkFiatTxId} 
                onChange={(e) => setLinkFiatTxId(e.target.value)}
                style={{...styles.input, flexGrow: 1}}
                disabled={isLinking || loading}
                />
                <button onClick={handleLinkFiatTx} style={styles.button} disabled={isLinking || !linkFiatTxId.trim() || loading}>
                {isLinking === 'fiat' ? 'Linking...' : 'Link Fiat Tx'}
                </button>
            </div>

            {/* Link Crypto Tx */}
            <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                <input 
                type="text" 
                placeholder="Crypto Transaction MongoDB ID to link" 
                value={linkCryptoTxId} 
                onChange={(e) => setLinkCryptoTxId(e.target.value)}
                style={{...styles.input, flexGrow: 1}}
                disabled={isLinking || loading}
                />
                <button onClick={handleLinkCryptoTx} style={styles.button} disabled={isLinking || !linkCryptoTxId.trim() || loading}>
                {isLinking === 'crypto' ? 'Linking...' : 'Link Crypto Tx'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AMLCaseDetail;
