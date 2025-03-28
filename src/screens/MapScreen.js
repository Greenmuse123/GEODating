import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Mock data for testing
const MOCK_USERS = [
  {
    id: '1',
    name: 'Sarah',
    age: 28,
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
    interests: ['Travel', 'Photography', 'Coffee'],
    profileImage: 'https://randomuser.me/api/portraits/women/1.jpg',
  },
  {
    id: '2',
    name: 'Mike',
    age: 31,
    location: {
      latitude: 40.7129,
      longitude: -74.0061,
    },
    interests: ['Hiking', 'Music', 'Cooking'],
    profileImage: 'https://randomuser.me/api/portraits/men/1.jpg',
  },
  // Add more mock users as needed
];

const MapScreen = () => {
  const [region, setRegion] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [showLocation, setShowLocation] = useState(true);
  const [users, setUsers] = useState(MOCK_USERS);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = () => {
    Geolocation.requestAuthorization();
  };

  const updateLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const newRegion = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setRegion(newRegion);
      },
      (error) => Alert.alert('Error', 'Unable to get location'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleMarkerPress = (user) => {
    Alert.alert(
      `${user.name}, ${user.age}`,
      `Interests: ${user.interests.join(', ')}`,
      [
        {
          text: 'Like',
          onPress: () => Alert.alert('Success', 'You liked this profile!'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={showLocation}
        showsMyLocationButton={true}
      >
        {users.map((user) => (
          <Marker
            key={user.id}
            coordinate={user.location}
            onPress={() => handleMarkerPress(user)}
          >
            <View style={styles.markerContainer}>
              <Icon name="account-circle" size={40} color="#FF4B6E" />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowLocation(!showLocation)}
        >
          <Icon
            name={showLocation ? 'eye-off' : 'eye'}
            size={24}
            color="#FF4B6E"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={updateLocation}>
          <Icon name="crosshairs-gps" size={24} color="#FF4B6E" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 30,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
  },
});

export default MapScreen; 