import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Mock user data for testing
const MOCK_USER = {
  name: 'John Doe',
  age: 29,
  bio: 'Adventure seeker and coffee enthusiast. Love exploring new places and meeting interesting people.',
  interests: ['Travel', 'Photography', 'Coffee', 'Hiking'],
  profileImage: 'https://randomuser.me/api/portraits/men/2.jpg',
  verified: true,
  location: 'New York, NY',
};

const ProfileScreen = () => {
  const [locationSharing, setLocationSharing] = useState(true);
  const [showProfile, setShowProfile] = useState(true);

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleVerification = () => {
    Alert.alert('Verification', 'Verification process will be implemented soon!');
  };

  const renderInterestChip = (interest) => (
    <View key={interest} style={styles.interestChip}>
      <Text style={styles.interestText}>{interest}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: MOCK_USER.profileImage }}
          style={styles.profileImage}
        />
        <View style={styles.verificationBadge}>
          <Icon name="check-decagram" size={20} color="#FF4B6E" />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{MOCK_USER.name}</Text>
          <Text style={styles.age}>{MOCK_USER.age}</Text>
        </View>
        <Text style={styles.location}>
          <Icon name="map-marker" size={16} color="#666" /> {MOCK_USER.location}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Me</Text>
        <Text style={styles.bio}>{MOCK_USER.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <View style={styles.interestsContainer}>
          {MOCK_USER.interests.map(renderInterestChip)}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Settings</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Location Sharing</Text>
          <Switch
            value={locationSharing}
            onValueChange={setLocationSharing}
            trackColor={{ false: '#767577', true: '#FF4B6E' }}
            thumbColor={locationSharing ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Show Profile</Text>
          <Switch
            value={showProfile}
            onValueChange={setShowProfile}
            trackColor={{ false: '#767577', true: '#FF4B6E' }}
            thumbColor={showProfile ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={handleEditProfile}
        >
          <Icon name="pencil" size={20} color="#FF4B6E" />
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.verifyButton]}
          onPress={handleVerification}
        >
          <Icon name="check-decagram" size={20} color="#fff" />
          <Text style={[styles.buttonText, styles.verifyButtonText]}>
            Get Verified
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF4B6E',
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 10,
    right: '35%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  age: {
    fontSize: 20,
    color: '#666',
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#FF4B6E20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    color: '#FF4B6E',
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingText: {
    fontSize: 16,
  },
  buttonContainer: {
    padding: 20,
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 25,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#FF4B6E20',
  },
  verifyButton: {
    backgroundColor: '#FF4B6E',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyButtonText: {
    color: '#fff',
  },
});

export default ProfileScreen; 