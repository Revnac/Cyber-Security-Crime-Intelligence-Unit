// server/routes/crime.js
const express = require('express');
const router = express.Router();
// const Crime = require('../models/crime'); // Depends on a 'Crime' model not provided

router.get('/', async (req, res) => {
  // const crimes = await Crime.find(); // Needs DB and model
  const crimes = [{id:1, details: "Mock crime from Node route"}]; // Mock data
  res.json(crimes);
});

router.get('/trends', async (req, res) => {
  // const crimeTrends = await Crime.aggregate([ // Needs DB and model
  //   { $group: { _id: '$date', crimes: { $sum: 1 } } },
  //   { $sort: { _id: 1 } },
  // ]);
  const crimeTrends = [{date: "2024-01-01", crimes: 10}]; // Mock data
  res.json(crimeTrends);
});

module.exports = router;
