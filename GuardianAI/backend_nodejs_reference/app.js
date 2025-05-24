// server/app.js
const express = require('express');
const app = express();
const crimeRoutes = require('./routes/crime');
const predictionRoutes = require('./routes/prediction');

app.use('/api/crime', crimeRoutes);
app.use('/api/prediction', predictionRoutes);

app.listen(3001, () => {
  console.log('Server listening on port 3001');
});
