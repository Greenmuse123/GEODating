import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { getNearbyUsers } from '../config/firebase';
import { calculateDistance, formatDistance } from '../config/mapbox';

const useMatching = (userId, userLocation, preferences = {}) => {
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    maxDistance = 50, // Maximum distance in kilometers
    minAge = 18,
    maxAge = 100,
    interests = [],
    gender = null,
  } = preferences;

  useEffect(() => {
    if (userLocation) {
      fetchPotentialMatches();
    }
  }, [userLocation, preferences]);

  const fetchPotentialMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get nearby users from Firebase
      const nearbyUsers = await getNearbyUsers(userLocation, maxDistance);

      // Filter users based on preferences
      const filteredUsers = nearbyUsers.filter((user) => {
        // Skip if it's the current user
        if (user.id === userId) return false;

        // Check age range
        if (user.age < minAge || user.age > maxAge) return false;

        // Check gender preference if specified
        if (gender && user.gender !== gender) return false;

        // Check interests if specified
        if (interests.length > 0) {
          const hasMatchingInterests = user.interests.some((interest) =>
            interests.includes(interest)
          );
          if (!hasMatchingInterests) return false;
        }

        // Calculate and check distance
        const distance = calculateDistance(userLocation, user.location);
        if (distance > maxDistance * 1000) return false; // Convert km to meters

        return true;
      });

      // Add distance information to each user
      const usersWithDistance = filteredUsers.map((user) => ({
        ...user,
        distance: calculateDistance(userLocation, user.location),
        formattedDistance: formatDistance(
          calculateDistance(userLocation, user.location)
        ),
      }));

      setPotentialMatches(usersWithDistance);
    } catch (err) {
      console.error('Error fetching potential matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const likeUser = async (likedUserId) => {
    try {
      setLoading(true);
      setError(null);

      // Add like to the database
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('likes')
        .doc(likedUserId)
        .set({
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

      // Check if the other user has already liked the current user
      const otherUserLike = await firestore()
        .collection('users')
        .doc(likedUserId)
        .collection('likes')
        .doc(userId)
        .get();

      if (otherUserLike.exists) {
        // It's a match!
        const matchData = {
          users: [userId, likedUserId],
          timestamp: firestore.FieldValue.serverTimestamp(),
        };

        // Create match in the database
        await firestore().collection('matches').add(matchData);

        // Update matches state
        const matchedUser = potentialMatches.find((user) => user.id === likedUserId);
        if (matchedUser) {
          setMatches((prevMatches) => [...prevMatches, matchedUser]);
        }
      }
    } catch (err) {
      console.error('Error liking user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dislikeUser = async (dislikedUserId) => {
    try {
      setLoading(true);
      setError(null);

      // Add dislike to the database
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('dislikes')
        .doc(dislikedUserId)
        .set({
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.error('Error disliking user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get matches from the database
      const matchesSnapshot = await firestore()
        .collection('matches')
        .where('users', 'array-contains', userId)
        .get();

      const matchIds = matchesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return data.users.find((id) => id !== userId);
      });

      // Get user profiles for matches
      const matchProfiles = await Promise.all(
        matchIds.map(async (matchId) => {
          const userDoc = await firestore().collection('users').doc(matchId).get();
          return {
            id: matchId,
            ...userDoc.data(),
          };
        })
      );

      setMatches(matchProfiles);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    potentialMatches,
    matches,
    loading,
    error,
    likeUser,
    dislikeUser,
    getMatches,
    fetchPotentialMatches,
  };
};

export default useMatching; 