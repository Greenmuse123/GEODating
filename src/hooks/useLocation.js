import { useState, useEffect, useRef } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { updateUserLocation } from '../config/firebase';
import { calculateDistance, formatDistance } from '../config/mapbox';

const useLocation = (userId, options = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [distance, setDistance] = useState(null);
  const watchId = useRef(null);

  const {
    updateInterval = 30000, // Default 30 seconds
    distanceThreshold = 100, // Default 100 meters
    onLocationUpdate = null,
  } = options;

  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (watchId.current) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const requestLocationPermission = () => {
    Geolocation.requestAuthorization();
  };

  const startLocationUpdates = () => {
    setIsLoading(true);
    setError(null);

    watchId.current = Geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        setLocation(newLocation);
        setIsLoading(false);

        // Update location in Firebase if user is logged in
        if (userId) {
          updateUserLocation(userId, newLocation).catch((err) => {
            console.error('Error updating location in Firebase:', err);
            setError(err.message);
          });
        }

        // Calculate distance if previous location exists
        if (location) {
          const newDistance = calculateDistance(location, newLocation);
          setDistance(newDistance);

          // Only trigger callback if distance exceeds threshold
          if (newDistance > distanceThreshold && onLocationUpdate) {
            onLocationUpdate(newLocation, formatDistance(newDistance));
          }
        }
      },
      (error) => {
        setError(error.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: distanceThreshold,
        interval: updateInterval,
        fastestInterval: updateInterval,
      }
    );
  };

  const stopLocationUpdates = () => {
    if (watchId.current) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      setError(null);

      Geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(newLocation);
          setIsLoading(false);
          resolve(newLocation);
        },
        (error) => {
          setError(error.message);
          setIsLoading(false);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  return {
    location,
    error,
    isLoading,
    distance,
    startLocationUpdates,
    stopLocationUpdates,
    getCurrentLocation,
  };
};

export default useLocation; 