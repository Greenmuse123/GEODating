import MapboxGL from '@mapbox/react-native-mapbox-gl';

// Initialize Mapbox
MapboxGL.setAccessToken('YOUR_MAPBOX_ACCESS_TOKEN');

// Map style configuration
export const mapStyle = {
  light: MapboxGL.StyleURL.Light,
  dark: MapboxGL.StyleURL.Dark,
  street: MapboxGL.StyleURL.Street,
};

// Default map settings
export const defaultMapSettings = {
  initialRegion: {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  minZoomLevel: 10,
  maxZoomLevel: 20,
  showUserLocation: true,
  showUserHeading: true,
  compassEnabled: true,
  rotateEnabled: true,
  scrollEnabled: true,
  pitchEnabled: true,
  zoomEnabled: true,
};

// Location permission handling
export const requestLocationPermission = async () => {
  try {
    const granted = await MapboxGL.requestAndroidLocationPermissions();
    return granted;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

// Calculate distance between two points
export const calculateDistance = (point1, point2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) *
      Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Format distance for display
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

// Custom marker styles
export const markerStyles = {
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
};

// Map region calculation
export const calculateRegion = (points, padding = 0.1) => {
  if (!points || points.length === 0) return null;

  const lats = points.map(point => point.latitude);
  const lngs = points.map(point => point.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latDelta = (maxLat - minLat) * (1 + padding);
  const lngDelta = (maxLng - minLng) * (1 + padding);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
};

export default {
  mapStyle,
  defaultMapSettings,
  requestLocationPermission,
  calculateDistance,
  formatDistance,
  markerStyles,
  calculateRegion,
}; 