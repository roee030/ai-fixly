import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../src/components/layout';
import { chatService, monitorAndUpdateStatus } from '../../src/services/chat';
import { requestService } from '../../src/services/requests';
import { forwardChatMessage } from '../../src/services/broadcast';
import { logger } from '../../src/services/logger';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { COLORS } from '../../src/constants';

import type { ChatMessage } from '../../src/services/chat';
import type { ServiceRequest } from '../../src/services/requests';

export default function ChatScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Subscribe to request so we know the selected provider's phone + name
  useEffect(() => {
    if (!requestId) return;
    return requestService.onRequestChanged(requestId, setRequest);
  }, [requestId]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!requestId) return;

    const unsubscribe = chatService.onNewMessages(requestId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return unsubscribe;
  }, [requestId]);

  const providerPhone = (request as any)?.selectedProviderPhone || '';
  const providerName = (request as any)?.selectedProviderName || 'בעל מקצוע';

  const handleSend = async () => {
    if (!input.trim() || !user || !requestId) return;

    const text = input.trim();
    setInput('');
    setIsSending(true);

    try {
      // 1. Write to Firestore (app chat history)
      await chatService.sendMessage(requestId, user.uid, 'customer', text);

      // 2. Forward to provider via WhatsApp through the worker (middleman)
      if (providerPhone) {
        forwardChatMessage({
          requestId,
          providerPhone,
          text,
        }).catch((err) => logger.error('forwardChatMessage failed', err as Error));
      }

      // 3. AI monitor checks for completion/cancellation signals
      monitorAndUpdateStatus(requestId, text, 'customer').catch(() => {});
    } catch (err) {
      console.error('Send message error:', err);
      setInput(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleCall = () => {
    if (!providerPhone) return;
    Linking.openURL(`tel:${providerPhone}`).catch(() => {});
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCustomer = item.senderType === 'customer';
    const isSystem = item.senderType === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, isCustomer ? styles.customerBubble : styles.providerBubble]}>
        {!isCustomer && (
          <Text style={styles.senderLabel}>בעל מקצוע</Text>
        )}
        <Text style={[styles.messageText, isCustomer ? styles.customerText : styles.providerText]}>
          {item.text}
        </Text>
        <Text style={[styles.timeText, isCustomer ? styles.customerTime : styles.providerTime]}>
          {item.createdAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer padded={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{providerName}</Text>
          <Text style={styles.headerSubtitle}>כל ההודעות מתועדות וחוזרות דרך WhatsApp</Text>
        </View>
        {providerPhone ? (
          <Pressable onPress={handleCall} style={styles.callBtn}>
            <Ionicons name="call" size={20} color={COLORS.success} />
          </Pressable>
        ) : null}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyChatText}>שלח הודעה לבעל המקצוע</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="כתוב הודעה..."
            placeholderTextColor={COLORS.textTertiary}
            style={styles.textInput}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isSending}
            style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  callBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  headerSubtitle: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageBubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  customerBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  providerBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  senderLabel: { fontSize: 11, color: COLORS.textTertiary, marginBottom: 4, fontWeight: '600' },
  messageText: { fontSize: 15, lineHeight: 20 },
  customerText: { color: '#FFFFFF' },
  providerText: { color: COLORS.text },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  customerTime: { color: 'rgba(255,255,255,0.6)' },
  providerTime: { color: COLORS.textTertiary },
  systemMessage: { alignSelf: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8 },
  systemText: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' },
  emptyChat: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyChatText: { color: COLORS.textSecondary, fontSize: 14 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.backgroundLight,
  },
  textInput: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: COLORS.text, maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
