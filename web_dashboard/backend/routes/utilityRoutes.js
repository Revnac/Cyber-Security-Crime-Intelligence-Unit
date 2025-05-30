// web_dashboard/backend/routes/utilityRoutes.js
const express = require('express');
const router = express.Router();
const axios = require('axios'); // Using axios for HTTP requests for simplicity, add to package.json later
const { protect } = require('../middleware/authMiddleware');
const { param, validationResult } = require('express-validator');

// GET /api/util/ip-geolocation/:ipAddress - Proxy for IP Geolocation
router.get(
  '/ip-geolocation/:ipAddress',
  protect, // Protect this utility endpoint
  [
    param('ipAddress')
      .trim()
      .isIP().withMessage('Invalid IP address format.')
      // Add .isIP(4) for IPv4 only if needed, or allow both v4 and v6
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
    }

    const { ipAddress } = req.params;
    const apiKey = process.env.IPGEOLOCATION_API_KEY; // Server-side environment variable

    if (!apiKey || apiKey === 'YOUR_API_KEY_PLACEHOLDER' || apiKey === 'YOUR_IPGEOLOCATION_API_KEY_SERVER_SIDE') {
      // Log this issue on the server, but don't expose API key status to client directly
      console.error('IPGEOLOCATION_API_KEY is not configured on the server.');
      return res.status(500).json({ message: 'Geolocation service is not configured.' });
    }

    const geolocationApiUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}`;

    try {
      // Using axios for the external API call
      const response = await axios.get(geolocationApiUrl, { timeout: 5000 }); // 5 second timeout
      
      // We can choose to return the whole response or select specific fields
      // For now, let's return a curated selection to avoid exposing too much from the external API
      // and to provide a consistent structure.
      const data = response.data;
      if (data) {
        res.json({
          ip: data.ip,
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          region_name: data.state_prov, // often called state_prov or region_name
          country_name: data.country_name,
          country_code2: data.country_code2,
          isp: data.isp,
          organization: data.organization, // if available
          time_zone: data.time_zone ? data.time_zone.name : null, // example of accessing nested data
          // Add any other fields you deem relevant from ipgeolocation.io's response
        });
      } else {
        res.status(404).json({ message: 'Geolocation data not found for this IP.' });
      }
    } catch (error) {
      console.error(`Error fetching geolocation for IP ${ipAddress} from external API:`, error.message);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('External API Error Data:', error.response.data);
        console.error('External API Error Status:', error.response.status);
        // Avoid sending detailed external API errors directly to client for security
        return res.status(error.response.status || 502).json({ message: 'Error from geolocation service.' });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('External API No Response:', error.request);
        return res.status(504).json({ message: 'No response from geolocation service.' });
      } else {
        // Something happened in setting up the request that triggered an Error
        return res.status(500).json({ message: 'Internal server error while fetching geolocation.' });
      }
    }
  }
);

module.exports = router;
