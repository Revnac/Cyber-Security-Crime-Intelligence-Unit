// web_dashboard/frontend/src/visualization/ip_geolocator.js
// This script requires the Google Maps API to be loaded in the HTML file that uses this script.
// It also expects an HTML element with id='map' for the map to be rendered in.

// Ensure Google Maps API is loaded
if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    console.error('Google Maps API is not loaded. This script will not work.');
    var mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = 'Error: Google Maps API not loaded. Cannot display map.';
        mapElement.style.color = 'red';
        mapElement.style.textAlign = 'center';
        mapElement.style.padding = '20px';
    }
}

/**
 * Initializes and plots IP address locations on a Google Map.
 * @param {string[]} ipAddresses - An array of IP addresses to plot.
 */
async function plotLocations(ipAddresses) {
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API is not available for plotLocations.');
        return;
    }

    const mapDiv = document.getElementById('map');
    if (!mapDiv) {
        console.error('Map element with id="map" not found.');
        return;
    }

    const map = new google.maps.Map(mapDiv, {
        center: { lat: 0, lng: 0 }, // Default center
        zoom: 2, // Default zoom to show the whole world
    });

    if (!ipAddresses || ipAddresses.length === 0) {
        console.warn('No IP addresses provided to plot.');
        new google.maps.Marker({
           position: map.getCenter(),
           map: map,
           label: 'No IP addresses to display'
        });
        return;
    }

    console.log(`Plotting ${ipAddresses.length} IP addresses.`);

    for (const ipAddress of ipAddresses) {
        try {
            const locationData = await getGeolocation(ipAddress); // Uses the NEW getGeolocation
            if (locationData && typeof locationData.lat === 'number' && typeof locationData.lng === 'number') {
                new google.maps.Marker({
                    position: { lat: locationData.lat, lng: locationData.lng },
                    map: map,
                    title: `IP: ${ipAddress}\nCity: ${locationData.city}\nCountry: ${locationData.country}\nISP: ${locationData.isp}`,
                });
            } else {
                console.warn(`Could not retrieve valid location for IP: ${ipAddress}`);
            }
        } catch (error) {
            console.error(`Error processing IP ${ipAddress}:`, error);
        }
    }
}

// Assume authService can be imported if this were a service module,
// or token is passed if it's a utility function called from components.
// For this iteration, let's modify it to accept a token.
// import authService from '../services/authService'; // Not directly, pass token instead for this file.

async function getGeolocation(ipAddress, token) { // Token is now an argument
  if (!ipAddress) {
    console.error('IP address is required for geolocation.');
    return null;
  }

  if (!token) {
    console.warn('Authentication token not provided to getGeolocation. Cannot fetch live geolocation data via proxy.');
    return null;
  }

  // Calls the backend proxy which uses the server-side API key
  const apiUrl = `/api/util/ip-geolocation/${ipAddress}`; 
  console.log(`Fetching proxied geolocation for IP: ${ipAddress} from ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Send the JWT to the backend proxy
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API request to proxy failed with status ${response.status}: ${errorData.message || response.statusText || 'Unknown API error'}`
      );
    }
    const data = await response.json();

    // Backend proxy returns a curated structure.
    if (data && data.latitude && data.longitude) {
      return { 
        lat: parseFloat(data.latitude), 
        lng: parseFloat(data.longitude), 
        city: data.city || 'Unknown city',
        country: data.country_name || 'Unknown country',
        region: data.region_name || 'Unknown region',
        isp: data.isp || 'Unknown ISP',
        organization: data.organization || 'Unknown organization',
        timezone: data.time_zone || 'Unknown timezone',
        originalResponse: data // Keep the curated response from proxy
      };
    } else {
      console.error('Invalid or incomplete data received from geolocation proxy:', data);
      if (data && data.message) {
          throw new Error(`Geolocation proxy returned error: ${data.message}`);
      }
      return null;
    }
  } catch (error) {
    console.error('Error fetching geolocation data via proxy:', error);
    throw error;
  }
}

// The plotLocations function would need to be updated to get and pass the token if it's to use this directly.
// Example:
// async function plotLocations(ipAddresses, token) { // Now needs token
//   // ...
//   for (const ipAddress of ipAddresses) {
//     const location = await getGeolocation(ipAddress, token); // Pass token
//     // ...
//   }
// }
// Or, preferably, components using this would call getGeolocation directly after getting token from useAuth.

// Example Usage (uncomment to test, or call from your HTML/main script):
/*
document.addEventListener('DOMContentLoaded', function() {
    if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
        const exampleIPs = ['8.8.8.8', '1.1.1.1', '104.16.132.229']; // Example IP addresses
        plotLocations(exampleIPs);
    } else {
        console.log('Google Maps API not ready for example usage of plotLocations.');
    }
});
*/
