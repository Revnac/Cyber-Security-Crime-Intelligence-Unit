// visualization/ip_geolocator.js
// This script requires the Google Maps API to be loaded in the HTML file that uses this script.
// It also expects an HTML element with id='map' for the map to be rendered in.

// Ensure Google Maps API is loaded
if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
    console.error('Google Maps API is not loaded. This script will not work.');
    // Optionally, display a message on the map div
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
        // Optionally display a message on the map
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
            const locationData = await getGeolocation(ipAddress);
            if (locationData && typeof locationData.lat === 'number' && typeof locationData.lng === 'number') {
                new google.maps.Marker({
                    position: { lat: locationData.lat, lng: locationData.lng },
                    map: map,
                    title: `IP: ${ipAddress}\nLat: ${locationData.lat}, Lng: ${locationData.lng}`,
                });
            } else {
                console.warn(`Could not retrieve valid location for IP: ${ipAddress}`);
            }
        } catch (error) {
            console.error(`Error processing IP ${ipAddress}:`, error);
        }
    }
}

/**
 * Fetches geolocation data for a given IP address.
 * IMPORTANT: This function currently returns placeholder data.
 * Replace with a real API call to an IP geolocation service.
 * @param {string} ipAddress - The IP address to geolocate.
 * @returns {Promise<object|null>} A promise that resolves to an object with lat and lng, or null if an error occurs.
 */
async function getGeolocation(ipAddress) {
    // Placeholder for API key - replace with your actual API key from ipgeolocation.io or another service
    const apiKey = 'YOUR_API_KEY_HERE'; 
    // Corrected API URL structure for ipgeolocation.io
    const apiUrl = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}`;

    console.log(`Fetching geolocation for IP: ${ipAddress} using URL (example): ${apiUrl}`);

    // --- START OF REAL API CALL SECTION (currently commented out) ---
    /*
    if (apiKey === 'YOUR_API_KEY_HERE') {
        console.warn('API key for IP geolocation is a placeholder. Using mock data instead.');
        // Fallback to mock data if API key is not set
        return new Promise(resolve => {
            setTimeout(() => { // Simulate network delay
                resolve({ lat: 37.7749, lng: -122.4194, city: 'San Francisco (Mock Data)' });
            }, 500);
        });
    }

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        // Assuming the API returns data in a format like: { latitude: XXX, longitude: YYY, ... }
        // Adjust property names (data.latitude, data.longitude) based on the actual API response structure.
        if (data && data.latitude && data.longitude) {
            return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), city: data.city || 'Unknown city' };
        } else {
            console.error('Invalid or incomplete data received from geolocation API:', data);
            return null;
        }
    } catch (error) {
        console.error('Error fetching geolocation data:', error);
        return null;
    }
    */
    // --- END OF REAL API CALL SECTION ---

    // --- START OF CURRENT PLACEHOLDER RESPONSE ---
    // This is placeholder data. The actual API call is commented out above.
    // To use a real API, uncomment the section above and ensure you have a valid API key.
    console.warn(`Using MOCK geolocation data for IP: ${ipAddress}. Replace with a real API call.`);
    return new Promise(resolve => {
        // Simulate different locations for different IPs for better visualization
        const mockLat = Math.random() * 180 - 90; // Random latitude
        const mockLng = Math.random() * 360 - 180; // Random longitude
        setTimeout(() => { // Simulate network delay
             resolve({ lat: mockLat, lng: mockLng, city: 'Mock Location' });
        }, 200);
    });
    // --- END OF CURRENT PLACEHOLDER RESPONSE ---
}

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
