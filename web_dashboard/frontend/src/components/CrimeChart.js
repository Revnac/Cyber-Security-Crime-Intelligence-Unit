// web_dashboard/frontend/src/components/CrimeChart.js
import React, { useState, useEffect } from 'react';
// Ensure recharts is listed as a dependency in package.json
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CrimeChart = () => {
  const [crimeData, setCrimeData] = useState([]);

  useEffect(() => {
    // Fetch crime trend data from the backend API
    // The URL '/api/crime/trends' is a placeholder and should match the backend endpoint.
    fetch('/api/crime/trends') // Example: http://localhost:3001/api/crime/trends
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Assuming data is an array of objects, e.g., [{ date: '2023-01-01', crimes: 10 }, ...]
        // Or as per backend: [{ _id: '2023-01-01', crimes: 10 }]
        // If _id is used for date, it might need transformation here.
        const formattedData = data.map(item => ({ date: item._id || item.date, crimes: item.crimes }));
        setCrimeData(formattedData);
      })
      .catch(error => {
        console.error('Error fetching crime trend data for chart:', error);
        // Potentially set an error state to display a message to the user
      });
  }, []); // Empty dependency array means this effect runs once on component mount

  if (crimeData.length === 0) {
    return <p>Loading crime trend data or no data available...</p>;
    // Or a more sophisticated loading spinner component
  }

  return (
    // ResponsiveContainer makes the chart adapt to its parent container size
    <ResponsiveContainer width="100%" height={400}>
      <LineChart 
        data={crimeData}
        margin={{
          top: 20, right: 30, left: 20, bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        {/* XAxis dataKey should match the property name for the date/time in your data */}
        <XAxis dataKey="date" /> 
        <YAxis />
        <Tooltip />
        <Legend />
        {/* dataKey for Line should match the property name for crime counts */}
        <Line 
          type="monotone" 
          dataKey="crimes" 
          stroke="#8884d8" // Corrected: Provided a stroke color
          activeDot={{ r: 8 }}
          name="Number of Crimes"
        />
        {/* Additional lines can be added for different types of crimes or data series */}
        {/* e.g., <Line type="monotone" dataKey="theft" stroke="#82ca9d" /> */}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CrimeChart;
