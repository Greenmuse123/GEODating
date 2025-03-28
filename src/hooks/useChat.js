import { useState, useEffect, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import { createChat, sendMessage } from '../config/firebase';

const useChat = (userId, chatId = null) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatInfo, setChatInfo] = useState(null);
  const unsubscribe = useRef(null);

  useEffect(() => {
    if (chatId) {
      subscribeToChat();
    }
    return () => {
      if (unsubscribe.current) {
        unsubscribe.current();
      }
    };
  }, [chatId]);

  const subscribeToChat = () => {
    setLoading(true);
    setError(null);

    // Subscribe to chat info
    const chatRef = firestore().collection('chats').doc(chatId);
    unsubscribe.current = chatRef.onSnapshot(
      (doc) => {
        if (doc.exists) {
          setChatInfo(doc.data());
        }
      },
      (err) => {
        console.error('Error subscribing to chat:', err);
        setError(err.message);
      }
    );

    // Subscribe to messages
    const messagesRef = chatRef.collection('messages');
    messagesRef
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(
        (snapshot) => {
          const newMessages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(newMessages.reverse());
          setLoading(false);
        },
        (err) => {
          console.error('Error subscribing to messages:', err);
          setError(err.message);
          setLoading(false);
        }
      );
  };

  const startNewChat = async (otherUserId) => {
    try {
      setLoading(true);
      setError(null);
      const newChatId = await createChat(userId, otherUserId);
      return newChatId;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendNewMessage = async (message) => {
    if (!chatId) return;

    try {
      setLoading(true);
      setError(null);
      await sendMessage(chatId, userId, message);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async (lastMessageTimestamp) => {
    if (!chatId) return;

    try {
      setLoading(true);
      setError(null);
      const messagesRef = firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages');
      
      const snapshot = await messagesRef
        .orderBy('timestamp', 'desc')
        .startAfter(lastMessageTimestamp)
        .limit(20)
        .get();

      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages((prevMessages) => [...prevMessages, ...newMessages.reverse()]);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!chatId) return;

    try {
      const messagesRef = firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages');

      const unreadMessages = await messagesRef
        .where('senderId', '!=', userId)
        .where('read', '==', false)
        .get();

      const batch = firestore().batch();
      unreadMessages.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
    } catch (err) {
      console.error('Error marking messages as read:', err);
      setError(err.message);
    }
  };

  return {
    messages,
    chatInfo,
    loading,
    error,
    startNewChat,
    sendNewMessage,
    loadMoreMessages,
    markMessagesAsRead,
  };
};

export default useChat; 