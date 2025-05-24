// web_dashboard/frontend/src/components/CrimeMap.js
import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const CrimeMap = () => {
  const [crimes, setCrimes] = useState([]);
  // Default center for the map (e.g., Randburg, Gauteng)
  // Users should be able to change this, or it should be dynamically set.
  const [mapCenter, setMapCenter] = useState({ lat: -26.094, lng: 28.000 }); // Approx. Randburg

  useEffect(() => {
    // Fetch crime data from the backend API
    // The URL '/api/crime' is a placeholder and should match the backend endpoint.
    fetch('/api/crime') // Example: http://localhost:3001/api/crime if backend runs on 3001
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Assuming data is an array of crime objects with id, lat, lng properties
        setCrimes(data);
        // Optional: Adjust map center based on fetched crimes, e.g., to the first crime or average location
        if (data.length > 0 && data[0].lat && data[0].lng) {
           // setMapCenter({ lat: data[0].lat, lng: data[0].lng });
        }
      })
      .catch(error => {
        console.error('Error fetching crime data for map:', error);
        // Potentially set an error state to display a message to the user
      });
  }, []); // Empty dependency array means this effect runs once on component mount

  const mapContainerStyle = {
    height: '600px', // Increased height for better usability
    width: '100%'   // Use full width of its container
  };

  // IMPORTANT: Replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' with an actual Google Maps API key.
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

  if (googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    console.warn('Google Maps API key is a placeholder. Map will not load correctly.');
    // Optionally, render a message to the UI
    return (
      <div style={{padding: '20px', textAlign: 'center', color: 'red'}}>
        Google Maps API key is missing or is a placeholder. Please configure it to display the map.
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={12} // Adjusted zoom level for a city view
      >
        {crimes.map(crime => (
          // Ensure each crime object has a unique 'id', 'lat', and 'lng' property.
          <Marker 
            key={crime.id} 
            position={{ lat: parseFloat(crime.lat), lng: parseFloat(crime.lng) }} 
            title={`Crime ID: ${crime.id}`}
            // Advanced: Consider custom icons based on crime type, clustering for many markers
          />
        ))}
        {/* Additional map features can be added here, e.g., heatmaps, drawing tools */}
      </GoogleMap>
    </LoadScript>
  );
};

export default CrimeMap;
