import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useJobChat } from '../hooks/useJobChat';
import { Colors } from '../utils/colors';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDay(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatScreen({ route }) {
  const { jobId } = route.params;
  const { user, profile, isAdmin } = useAuth();
  const { messages, loading, sendMessage, refresh } = useJobChat(jobId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef(null);

  const senderName = profile?.full_name || user?.email || (isAdmin ? 'Admin' : 'Technician');

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setText('');
    setSending(true);
    try {
      await sendMessage(msg, user?.id, senderName);
    } catch (e) {
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  // Group messages by day for date separators
  const enriched = messages.map((m, i) => {
    const prevDay = i > 0 ? formatDay(messages[i - 1].created_at) : null;
    const thisDay = formatDay(m.created_at);
    return { ...m, showDay: thisDay !== prevDay };
  });

  const renderItem = ({ item }) => {
    const isOwn = item.user_id === user?.id;
    return (
      <>
        {item.showDay && (
          <View style={styles.daySep}>
            <Text style={styles.dayText}>{formatDay(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
          {!isOwn && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.sender_name || '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            {!isOwn && (
              <Text style={styles.senderName}>{item.sender_name}</Text>
            )}
            <Text style={[styles.msgText, isOwn && styles.msgTextOwn]}>{item.text}</Text>
            <Text style={[styles.msgTime, isOwn && styles.msgTimeOwn]}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={Colors.accent} />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color={Colors.lightGray} />
          <Text style={styles.emptyText}>No messages yet.</Text>
          <Text style={styles.emptySubtext}>Start the conversation below.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={enriched}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={Colors.gray}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color={Colors.white} size="small" />
            : <Ionicons name="send" size={18} color={Colors.white} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  list: { padding: 12, paddingBottom: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textLight, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: Colors.gray, marginTop: 4 },

  daySep: { alignItems: 'center', marginVertical: 12 },
  dayText: { fontSize: 11, fontWeight: '600', color: Colors.textLight, backgroundColor: Colors.lightGray, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },

  row: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 8 },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },

  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  avatarText: { color: Colors.white, fontSize: 12, fontWeight: '700' },

  bubble: { maxWidth: '75%', borderRadius: 16, padding: 10, paddingBottom: 6 },
  bubbleOwn: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },

  senderName: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  msgText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  msgTextOwn: { color: Colors.white },
  msgTime: { fontSize: 10, color: Colors.textLight, marginTop: 3, textAlign: 'right' },
  msgTimeOwn: { color: 'rgba(255,255,255,0.7)' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.screenBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.lightGray },
});
