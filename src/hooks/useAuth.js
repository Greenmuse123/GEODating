import { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import {
  signIn,
  signUp,
  signOut,
  updateUserProfile,
  getUserProfile,
  uploadProfileImage,
} from '../config/firebase';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        try {
          const userProfile = await getUserProfile(user.uid);
          setProfile(userProfile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setError(err.message);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const user = await signIn(email, password);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, userData) => {
    try {
      setLoading(true);
      setError(null);
      const user = await signUp(email, password, userData);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      await updateUserProfile(user.uid, userData);
      const updatedProfile = await getUserProfile(user.uid);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePicture = async (imageUri) => {
    try {
      setLoading(true);
      setError(null);
      const imageUrl = await uploadProfileImage(user.uid, imageUri);
      const updatedProfile = await getUserProfile(user.uid);
      setProfile(updatedProfile);
      return imageUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);
      return userProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updateProfilePicture,
    refreshProfile,
  };
};

export default useAuth; 