import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SettingsScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showDistance, setShowDistance] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // Handle logout logic here
            Alert.alert('Success', 'Logged out successfully');
          },
        },
      ]
    );
  };

  const renderSettingItem = ({ icon, title, value, onValueChange, type = 'switch' }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Icon name={icon} size={24} color="#FF4B6E" style={styles.settingIcon} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#767577', true: '#FF4B6E' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : (
        <Icon name="chevron-right" size={24} color="#666" />
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="account-edit" size={24} color="#FF4B6E" style={styles.settingIcon} />
            <Text style={styles.settingTitle}>Edit Profile</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="shield-lock" size={24} color="#FF4B6E" style={styles.settingIcon} />
            <Text style={styles.settingTitle}>Privacy Settings</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {renderSettingItem({
          icon: 'bell-outline',
          title: 'Push Notifications',
          value: notifications,
          onValueChange: setNotifications,
        })}
        {renderSettingItem({
          icon: 'map-marker',
          title: 'Location Services',
          value: locationServices,
          onValueChange: setLocationServices,
        })}
        {renderSettingItem({
          icon: 'weather-night',
          title: 'Dark Mode',
          value: darkMode,
          onValueChange: setDarkMode,
        })}
        {renderSettingItem({
          icon: 'ruler',
          title: 'Show Distance',
          value: showDistance,
          onValueChange: setShowDistance,
        })}
        {renderSettingItem({
          icon: 'circle-slice-8',
          title: 'Show Online Status',
          value: showOnlineStatus,
          onValueChange: setShowOnlineStatus,
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="help-circle" size={24} color="#FF4B6E" style={styles.settingIcon} />
            <Text style={styles.settingTitle}>Help Center</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="file-document" size={24} color="#FF4B6E" style={styles.settingIcon} />
            <Text style={styles.settingTitle}>Terms of Service</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="shield-check" size={24} color="#FF4B6E" style={styles.settingIcon} />
            <Text style={styles.settingTitle}>Privacy Policy</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={24} color="#FF4B6E" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    margin: 20,
    backgroundColor: '#FF4B6E20',
    borderRadius: 25,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4B6E',
  },
});

export default SettingsScreen; 