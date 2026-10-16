import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import axiosClient, { getBaseURL } from '@/api/axiosClient';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  message_id: number;
  sender_id: number;
  sender_type: string;
  message: string;
  created_at: string;
}

export default function SupportChatScreen() {
  const { partnerId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchChatHistory();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [partnerId]);

  const fetchChatHistory = async () => {
    try {
      const res = await axiosClient.get(`/chat/support/${partnerId}`);
      if (res.data.success) {
        const fetchedChatId = res.data.chat.chat_id;
        setChatId(fetchedChatId);
        setMessages(res.data.messages || []);
        setupSocket(fetchedChatId);
      }
    } catch (error) {
      console.error('Error fetching support chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = (currentChatId: number) => {
    const socket = io(getBaseURL().replace('/api/v1', ''), {
      auth: (cb) => {
        SecureStore.getItemAsync('token')
          .then((token) => cb({ token: token || '' }))
          .catch(() => cb({ token: '' }));
      },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_chat', currentChatId);
    });

    socket.on('receive_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !chatId || !user) return;

    const messageData = {
      chat_id: chatId,
      sender_id: user.user_id || user.id,
      sender_type: user.role || 'UNKNOWN',
      message: newMessage.trim(),
    };

    socketRef.current?.emit('send_message', messageData);
    setNewMessage('');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const currentUserId = user?.user_id || user?.id;
    const isMe = item.sender_id === currentUserId;

    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
          {item.message}
        </Text>
        <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.theirTimeText]}>
          {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Hỗ trợ & CSKH</Text>
          <Text style={styles.headerSubtitle}>{user?.role === 'ADMIN' ? `Đối tác: ${partnerId}` : 'Admin Hệ thống'}</Text>
        </View>
      </View>

      {/* Chat Area */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3182CE" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.message_id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]} 
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#718096',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3182CE',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#2D3748',
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirTimeText: {
    color: '#A0AEC0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#EDF2F7',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    marginRight: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3182CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#A0AEC0',
  },
});
