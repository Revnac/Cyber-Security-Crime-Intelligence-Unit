// web_dashboard/frontend/src/components/forensics/FundsTraceResults.js
import React, { useState, useEffect, useCallback } from 'react'; // Ensure all hooks are imported
import ReactFlow, { MiniMap, Controls, Background, addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import 'reactflow/dist/style.css'; // Main styles for React Flow
// Optional: import 'reactflow/dist/theme-default.css'; if using default theme


// Basic inline styles
const styles = {
  resultsContainer: { marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' },
  summaryBox: { marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' },
  sectionTitle: { marginTop: '0', marginBottom: '10px', fontSize: '1.1em', color: '#333' },
  list: { listStyleType: 'none', paddingLeft: '0' },
  listItem: { padding: '5px 0', borderBottom: '1px dotted #eee', fontSize: '0.9em' },
  listItemLast: { borderBottom: 'none' },
  label: { fontWeight: 'bold' },
  nodeDetails: { marginLeft: '10px', fontStyle: 'italic', color: '#555' },
  edgeDetails: { marginLeft: '10px', fontStyle: 'italic', color: '#007bff' },
  warning: { color: 'orange', fontWeight: 'bold'},
  error: { color: 'red', fontWeight: 'bold'},
  graphPlaceholder: { 
    width: '100%', 
    height: '600px', // Adjusted height for ReactFlow
    border: '1px solid #ddd', // Changed from dashed for a more permanent look
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: '#aaa', 
    backgroundColor: '#fdfdfd',
    marginTop: '10px'
  }
};

const FundsTraceResults = ({ results, isLoading, error }) => {
  const [rfNodes, setRfNodes] = useState([]);
  const [rfEdges, setRfEdges] = useState([]);

  // Callbacks for React Flow
  const onNodesChange = useCallback((changes) => setRfNodes((nds) => applyNodeChanges(changes, nds)), [setRfNodes]);
  const onEdgesChange = useCallback((changes) => setRfEdges((eds) => applyEdgeChanges(changes, eds)), [setRfEdges]);
  const onConnect = useCallback((connection) => setRfEdges((eds) => addEdge(connection, eds)), [setRfEdges]);

  useEffect(() => {
    if (results && results.nodes && results.edges) {
      // Transform API results.nodes to React Flow nodes
      const transformedNodes = results.nodes.map((node, index) => ({
        id: String(node.id), // Ensure ID is a string
        type: node.type === 'transaction' ? 'default' : 'default', // Or custom node types
        data: { label: `${node.label} (${node.blockchain}) ${node.type === 'transaction' && node.valueUSD ? '- $'+node.valueUSD.toFixed(0) : ''}` },
        position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 120 + (node.type === 'transaction' ? 50 : 0) }, // Basic layout
        style: node.type === 'transaction' 
          ? { background: '#88dd88', color: '#333', border: '1px solid #777', width: 180, padding: '10px', borderRadius: '3px' } 
          : { background: '#88bbff', color: '#333', border: '1px solid #777', width: 180, padding: '10px', borderRadius: '3px' },
      }));
      setRfNodes(transformedNodes);

      // Transform API results.edges to React Flow edges
      const transformedEdges = results.edges.map((edge, index) => ({
        id: `e${edge.source}-${edge.target}-${index}`, // Ensure unique edge ID
        source: String(edge.source),
        target: String(edge.target),
        label: edge.amount ? `${edge.relationship} (${edge.amount.toFixed(4)} ${edge.tokenType !== 'Native' && edge.tokenType ? edge.tokenType : edge.blockchain.substring(0,3)})` : edge.relationship,
        type: 'smoothstep', // Or 'default', 'straight'
        animated: true,
      }));
      setRfEdges(transformedEdges);
    } else {
      setRfNodes([]);
      setRfEdges([]);
    }
  }, [results]);


  if (isLoading) {
    return <p style={styles.loading}>Performing trace analysis, please wait...</p>;
  }

  if (error) {
    return <p style={{...styles.error, ...styles.resultsContainer}}>Error performing trace: {error}</p>;
  }

  if (!results) {
    return null; // Or <p>Submit trace parameters to see results.</p>;
  }

  const { summary } = results; // nodes and edges are used by ReactFlow via rfNodes/rfEdges state

  return (
    <div style={styles.resultsContainer}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Trace Results</h3>
      
      <div style={styles.summaryBox}>
        <p><span style={styles.label}>Start Identifier:</span> {summary.startIdentifier} ({summary.identifierType})</p>
        <p><span style={styles.label}>Direction:</span> {summary.direction}</p>
        <p><span style={styles.label}>Blockchain:</span> {summary.blockchain}</p>
        <p><span style.label}>Max Hops Requested:</span> {summary.maxHops}</p>
        <p><span style.label}>Hops Reached:</span> {summary.hopsReached}</p>
        <p><span style.label}>Transactions Found:</span> {summary.foundTransactions}</p>
        <p><span style.label}>Addresses Found:</span> {summary.foundAddresses}</p>
        <p><span style.label}>DB Queries Made:</span> {summary.queriesMade || 'N/A'}</p>
        {summary.warning && <p><span style={styles.label}>Warning:</span> <span style={styles.warning}>{summary.warning}</span></p>}
      </div>

      {/* Textual lists removed/commented out, replaced by ReactFlow graph */}
      {/* 
      <div>
        <h4 style={styles.sectionTitle}>Nodes ({results.nodes?.length || 0}):</h4>
        ...
      </div>
      <div style={{marginTop: '15px'}}>
        <h4 style={styles.sectionTitle}>Edges ({results.edges?.length || 0}):</h4>
        ...
      </div>
      */}
      
      <div style={{ ...styles.graphPlaceholder }}>
        {rfNodes && rfNodes.length > 0 ? (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            attributionPosition="bottom-right"
          >
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
            <Controls />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        ) : (
          <p>No graph data to display, or trace resulted in too few elements for a graph.</p>
        )}
      </div>
      
      {/* Removed older TODO comment as it's now implemented above */}
    </div>
  );
};

export default FundsTraceResults;
