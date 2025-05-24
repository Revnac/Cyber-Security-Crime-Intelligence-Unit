// src/components/CrimeMap.js
import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const CrimeMap = ({apiKey, crimesData, initialCenter}) => { // Accept apiKey, crimesData, initialCenter as props
  const [crimes, setCrimes] = useState([]);
  const [mapCenter, setMapCenter] = useState(initialCenter || { lat: -26.1076, lng: 28.0567 }); // Default to Randburg, or prop

  useEffect(() => {
    if (crimesData) {
      setCrimes(crimesData);
    } else {
      // Replace with API call or keep mock data for now
      // fetch('/api/crime')
      //   .then(response => response.json())
      //   .then(data => setCrimes(data));
      setCrimes([ // Example mock data
        { id: 1, lat: -26.1076, lng: 28.0567, description: "Mock Crime 1" },
        { id: 2, lat: -26.1086, lng: 28.0577, description: "Mock Crime 2" },
      ]);
    }
  }, [crimesData]);

  useEffect(() => {
    if(initialCenter) {
      setMapCenter(initialCenter);
    }
  }, [initialCenter]);
  
  const googleMapsApiKey = apiKey || "YOUR_GOOGLE_MAPS_API_KEY_PLACEHOLDER"; // Use prop or placeholder

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey}>
      <GoogleMap
        mapContainerStyle={{ height: '400px', width: '100%' }} // Make width responsive
        center={mapCenter}
        zoom={15}
      >
        {crimes.map(crime => (
          <Marker 
            key={crime.id} 
            position={{ lat: crime.lat, lng: crime.lng }}
            title={crime.description} // Show description on hover
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
};

export default CrimeMap;
