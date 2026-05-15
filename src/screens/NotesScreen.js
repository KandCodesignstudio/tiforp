import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';
import { useNotes } from '../hooks/useNotes';
import { Colors } from '../utils/colors';

function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'a few seconds ago';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTripDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getFullYear()}`;
}

function NoteCard({ note }) {
  return (
    <View style={styles.noteCard}>
      <Text style={styles.noteAuthor}>{note.author}</Text>
      <Text style={styles.noteText}>{note.text}</Text>
      <Text style={styles.noteTime}>{timeAgo(note.createdAt)}</Text>
    </View>
  );
}

export default function NotesScreen({ route }) {
  const { jobId } = route.params;
  const { user, isAdmin } = useAuth();
  const { jobs } = useJobs({ isAdmin, userId: user?.id, channelId: 'notes' });
  const job = jobs.find((j) => j.id === jobId) ?? route.params.job;
  const { notes, addNote } = useNotes(jobId);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  const trips = job?.trips ?? [];
  const [selectedTrip, setSelectedTrip] = useState(
    () => trips.find((t) => t.status !== 'completed' && t.status !== 'for_return')?.tripNumber
      ?? trips[0]?.tripNumber
      ?? 1
  );
  const filteredNotes = notes.filter((n) => n.tripNumber === selectedTrip);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const author = user?.email ?? 'Tech';
    setText('');
    await addNote(jobId, trimmed, author, selectedTrip);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {trips.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabs}
            contentContainerStyle={styles.tabsContent}
          >
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tab, t.tripNumber === selectedTrip && styles.tabActive]}
                onPress={() => setSelectedTrip(t.tripNumber)}
              >
                <Text style={[styles.tabText, t.tripNumber === selectedTrip && styles.tabTextActive]}>
                  TRIP {t.tripNumber} ({formatTripDate(t.scheduledAt)})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <FlatList
          ref={listRef}
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
          renderItem={({ item }) => <NoteCard note={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notes for this trip yet.</Text>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a note..."
            placeholderTextColor={Colors.gray}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.screenBg },
  tabs: { backgroundColor: Colors.primary, maxHeight: 48 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  tabTextActive: { color: Colors.primary },
  notesList: { padding: 16, paddingBottom: 8 },
  noteCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteAuthor: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  noteText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  noteTime: { fontSize: 11, color: Colors.gray, marginTop: 6, textAlign: 'right' },
  emptyText: { textAlign: 'center', color: Colors.gray, marginTop: 40, fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
});
