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

// --- NEW getGeolocation function from the current subtask ---
async function getGeolocation(ipAddress) {
  const apiKey = process.env.REACT_APP_IPGEOLOCATION_API_KEY || 'YOUR_API_KEY_PLACEHOLDER';

  if (!ipAddress) {
    console.error('IP address is required for geolocation.');
    return null; // Or throw new Error('IP address is required.');
  }

  if (!apiKey || apiKey === 'YOUR_API_KEY_PLACEHOLDER') {
    console.warn(
      'IP Geolocation API key (REACT_APP_IPGEOLOCATION_API_KEY) is not configured or is a placeholder. ' +
      'Cannot fetch live geolocation data. Returning null or mock data if implemented.'
    );
    return null; 
  }

  const apiUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}`;
  console.log(`Fetching live geolocation for IP: ${ipAddress} from ${apiUrl.replace(apiKey, 'REACT_APP_IPGEOLOCATION_API_KEY_USED')}`); // Avoid logging key

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to get error message from API
      throw new Error(
        `API request failed with status ${response.status}: ${errorData.message || response.statusText || 'Unknown API error'}`
      );
    }
    const data = await response.json();

    if (data && data.latitude && data.longitude) {
      return { 
        lat: parseFloat(data.latitude), 
        lng: parseFloat(data.longitude), 
        city: data.city || 'Unknown city',
        country: data.country_name || 'Unknown country',
        isp: data.isp || 'Unknown ISP',
        fullResponse: data 
      };
    } else {
      console.error('Invalid or incomplete data received from geolocation API:', data);
      if (data && data.message) {
          throw new Error(`API returned error: ${data.message}`);
      }
      return null;
    }
  } catch (error) {
    console.error('Error fetching geolocation data:', error);
    throw error; 
  }
}
// --- END NEW getGeolocation function ---

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
