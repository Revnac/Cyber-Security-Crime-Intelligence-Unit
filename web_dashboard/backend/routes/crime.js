// web_dashboard/backend/routes/crime.js
const express = require('express');
const router = express.Router();
const Crime = require('../models/crime'); // Assuming your Mongoose model is here

// --- API Endpoints for Crime Data --- //

// GET all crime data (potentially with pagination and filtering for advanced use)
// Example: GET /api/crime?limit=10&page=1&type=Theft&status=Reported&sortBy=date:desc
router.get('/', async (req, res) => {
  try {
    // Basic query object
    let query = {};
    // Advanced Filtering (examples)
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;
    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.startDate && req.query.endDate) {
      query.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    } else if (req.query.startDate) {
      query.date = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.date = { $lte: new Date(req.query.endDate) };
    }

    // Pagination (example)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Default to 100, adjust as needed for map/chart
    const skip = (page - 1) * limit;

    // Sorting (example: 'date:desc' or 'severity:asc')
    let sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort = { date: -1 }; // Default sort by newest first
    }

    const crimes = await Crime.find(query).sort(sort).skip(skip).limit(limit).lean(); // .lean() for faster plain JS objects
    const totalCrimes = await Crime.countDocuments(query);

    // For the frontend map, it might expect 'id', 'lat', 'lng'. Ensure model provides these or transform here.
    // The model's pre-save hook should handle lat/lng from location.coordinates.
    // MongoDB's _id is typically used as 'id'.
    const crimesForClient = crimes.map(crime => ({
        id: crime._id.toString(), // Convert ObjectId to string
        caseNumber: crime.caseNumber,
        description: crime.description,
        date: crime.date,
        type: crime.type,
        address: crime.location ? crime.location.address : '',
        lat: crime.lat, // Should be populated by pre-save hook or directly
        lng: crime.lng, // Should be populated by pre-save hook or directly
        severity: crime.severity,
        status: crime.status,
        narrative: crime.narrative,
        source: crime.source
    }));

    res.json({
        data: crimesForClient,
        totalPages: Math.ceil(totalCrimes / limit),
        currentPage: page,
        totalCount: totalCrimes
    });
  } catch (err) {
    console.error('Error fetching crime data:', err);
    res.status(500).json({ message: 'Server error while fetching crime data.', error: err.message });
  }
});

// GET crime data trends (for charts)
// Example: GET /api/crime/trends?period=monthly&crimeType=Theft
router.get('/trends', async (req, res) => {
  try {
    // Advanced: Allow grouping by day, week, month, year, and filtering by crime type, location, etc.
    // For simplicity, this example groups by date (day by default in schema, adjust format for month/year)
    const period = req.query.period || 'daily'; // daily, monthly, yearly
    let groupByFormat;
    switch (period) {
        case 'yearly': groupByFormat = '%Y'; break;
        case 'monthly': groupByFormat = '%Y-%m'; break;
        case 'daily':
        default: groupByFormat = '%Y-%m-%d'; break;
    }

    // Add match stage for filtering if needed (e.g., by crime type, date range)
    const matchStage = {};
    if (req.query.crimeType) {
        matchStage.type = req.query.crimeType;
    }
    // Add date range filtering for trends as well
    if (req.query.startDate && req.query.endDate) {
      matchStage.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }

    const crimeTrends = await Crime.aggregate([
      { $match: matchStage }, // Optional: filter before grouping
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$date' } }, // Group by formatted date string
          crimes: { $sum: 1 } // Count occurrences for each group
        }
      },
      { $sort: { _id: 1 } } // Sort by date ascending
    ]);
    // The frontend chart expects 'date' and 'crimes'. _id from group stage is our 'date'.
    res.json(crimeTrends.map(trend => ({ date: trend._id, crimes: trend.crimes })));
  } catch (err) {
    console.error('Error fetching crime trends:', err);
    res.status(500).json({ message: 'Server error while fetching crime trends.', error: err.message });
  }
});

// POST new crime data (for data entry or integration with other systems)
// This is a more advanced endpoint, ensure proper validation and security.
router.post('/', async (req, res) => {
  try {
    // Basic validation: ensure required fields are present
    // const { description, date, type, lat, lng, address, severity, status, narrative, source, caseNumber } = req.body;
    // if (!date) { // Add more required fields as necessary
    //   return res.status(400).json({ message: 'Missing required fields (e.g., date).' });
    // }

    const newCrimeData = { ...req.body };
    // If lat/lng are provided, ensure location.coordinates is set for GeoJSON if that's the primary storage
    if (newCrimeData.lat != null && newCrimeData.lng != null) {
        newCrimeData.location = {
            type: 'Point',
            coordinates: [parseFloat(newCrimeData.lng), parseFloat(newCrimeData.lat)],
            address: newCrimeData.address
        };
    }

    const crime = new Crime(newCrimeData);
    const savedCrime = await crime.save();
    res.status(201).json(savedCrime);
  } catch (err) {
    console.error('Error saving new crime data:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', error: err.message, details: err.errors });
    }
    res.status(500).json({ message: 'Server error while saving crime data.', error: err.message });
  }
});

// GET a single crime by ID
router.get('/:id', async (req, res) => {
  try {
    const crime = await Crime.findById(req.params.id).lean();
    if (!crime) {
      return res.status(404).json({ message: 'Crime not found' });
    }
    res.json(crime);
  } catch (err) {
    console.error(`Error fetching crime with id ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT (update) a crime by ID
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };
    if (updateData.lat != null && updateData.lng != null) {
        updateData.location = {
            type: 'Point',
            coordinates: [parseFloat(updateData.lng), parseFloat(updateData.lat)],
            address: updateData.address || '' // Ensure address is included if location is updated
        };
    }
    const updatedCrime = await Crime.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).lean();
    if (!updatedCrime) {
      return res.status(404).json({ message: 'Crime not found for update' });
    }
    res.json(updatedCrime);
  } catch (err) {
    console.error(`Error updating crime with id ${req.params.id}:`, err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', error: err.message, details: err.errors });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE a crime by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedCrime = await Crime.findByIdAndDelete(req.params.id);
    if (!deletedCrime) {
      return res.status(404).json({ message: 'Crime not found for deletion' });
    }
    res.json({ message: 'Crime deleted successfully' });
  } catch (err) {
    console.error(`Error deleting crime with id ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
