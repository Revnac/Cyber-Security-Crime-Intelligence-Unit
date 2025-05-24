// src/components/CrimeChart.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Added more components

const CrimeChart = ({ chartData }) => { // Accept chartData as a prop
  const [crimeData, setCrimeData] = useState([]);

  useEffect(() => {
    if (chartData) {
      setCrimeData(chartData);
    } else {
      // Replace with API call or keep mock data
      // fetch('/api/crime/trends')
      //   .then(response => response.json())
      //   .then(data => setCrimeData(data));
      setCrimeData([ // Example mock data
        { date: '2024-01-01', crimes: 5 },
        { date: '2024-01-02', crimes: 8 },
        { date: '2024-01-03', crimes: 3 },
      ]);
    }
  }, [chartData]);

  return (
    <ResponsiveContainer width="100%" height={400}> {/* Make chart responsive */}
      <LineChart data={crimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="crimes" stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default CrimeChart;
