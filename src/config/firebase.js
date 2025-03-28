import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Initialize Firebase
const firebaseConfig = {
  // Replace these with your Firebase configuration values
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (configuration will be added by the user)
const initializeFirebase = () => {
  // Firebase configuration will be added here
  // This is just a placeholder for the actual configuration
};

// Authentication functions
export const signIn = async (email, password) => {
  try {
    const response = await auth().signInWithEmailAndPassword(email, password);
    return response.user;
  } catch (error) {
    throw error;
  }
};

export const signUp = async (email, password, userData) => {
  try {
    const response = await auth().createUserWithEmailAndPassword(email, password);
    await firestore().collection('users').doc(response.user.uid).set({
      ...userData,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return response.user;
  } catch (error) {
    throw error;
  }
};

export const signOut = async () => {
  try {
    await auth().signOut();
  } catch (error) {
    throw error;
  }
};

// User profile functions
export const updateUserProfile = async (userId, userData) => {
  try {
    await firestore().collection('users').doc(userId).update(userData);
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const doc = await firestore().collection('users').doc(userId).get();
    return doc.data();
  } catch (error) {
    throw error;
  }
};

// Location functions
export const updateUserLocation = async (userId, location) => {
  try {
    await firestore().collection('users').doc(userId).update({
      location,
      lastUpdated: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

export const getNearbyUsers = async (location, radius) => {
  try {
    // This is a simplified version. In a real app, you would use geohashing
    // or a similar solution for efficient location-based queries
    const users = await firestore()
      .collection('users')
      .where('locationSharing', '==', true)
      .get();
    
    return users.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// Chat functions
export const createChat = async (user1Id, user2Id) => {
  try {
    const chatRef = await firestore().collection('chats').add({
      participants: [user1Id, user2Id],
      createdAt: firestore.FieldValue.serverTimestamp(),
      lastMessage: null,
      lastMessageTime: null,
    });
    return chatRef.id;
  } catch (error) {
    throw error;
  }
};

export const sendMessage = async (chatId, senderId, message) => {
  try {
    await firestore().collection('chats').doc(chatId).collection('messages').add({
      senderId,
      message,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
    
    await firestore().collection('chats').doc(chatId).update({
      lastMessage: message,
      lastMessageTime: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Storage functions
export const uploadProfileImage = async (userId, imageUri) => {
  try {
    const reference = storage().ref(`profile_images/${userId}`);
    await reference.putFile(imageUri);
    const url = await reference.getDownloadURL();
    await updateUserProfile(userId, { profileImage: url });
    return url;
  } catch (error) {
    throw error;
  }
};

export default {
  initializeFirebase,
  signIn,
  signUp,
  signOut,
  updateUserProfile,
  getUserProfile,
  updateUserLocation,
  getNearbyUsers,
  createChat,
  sendMessage,
  uploadProfileImage,
}; 