import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Mock data for testing
const MOCK_CHATS = [
  {
    id: '1',
    name: 'Sarah',
    lastMessage: 'Hey! Would you like to meet for coffee?',
    time: '2:30 PM',
    unread: 2,
    profileImage: 'https://randomuser.me/api/portraits/women/1.jpg',
    distance: '0.5 mi',
    online: true,
  },
  {
    id: '2',
    name: 'Mike',
    lastMessage: 'Great hiking spot nearby!',
    time: '1:45 PM',
    unread: 0,
    profileImage: 'https://randomuser.me/api/portraits/men/1.jpg',
    distance: '1.2 mi',
    online: false,
  },
  {
    id: '3',
    name: 'Emma',
    lastMessage: 'See you there!',
    time: '12:15 PM',
    unread: 0,
    profileImage: 'https://randomuser.me/api/portraits/women/2.jpg',
    distance: '0.8 mi',
    online: true,
  },
];

const ChatListScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', { chatId: item.id })}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.profileImage }} style={styles.avatar} />
        {item.online && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
        <Text style={styles.distance}>
          <Icon name="map-marker" size={12} color="#666" /> {item.distance}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-variant" size={24} color="#FF4B6E" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={MOCK_CHATS}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  unreadBadge: {
    backgroundColor: '#FF4B6E',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  distance: {
    fontSize: 12,
    color: '#666',
  },
});

export default ChatListScreen; 