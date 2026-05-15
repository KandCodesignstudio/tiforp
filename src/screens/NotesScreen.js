import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Alert,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';
import { useNotes } from '../hooks/useNotes';
import { notifyAdmins } from '../utils/notifications';
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

function NoteCard({ note, isOwner, onEdit, onDelete }) {
  return (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteAuthor}>{note.author}</Text>
        {isOwner && (
          <View style={styles.noteActions}>
            <TouchableOpacity onPress={() => onEdit(note)} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(note)} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={15} color={Colors.danger ?? '#e53935'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Text style={styles.noteText}>{note.text}</Text>
      <Text style={styles.noteTime}>{timeAgo(note.createdAt)}</Text>
    </View>
  );
}

export default function NotesScreen({ route }) {
  const { jobId, initialTripNumber } = route.params;
  const { user, profile, isAdmin } = useAuth();
  const { jobs, refresh: refreshJobs } = useJobs({ isAdmin, userId: user?.id, channelId: 'notes' });
  const job = jobs.find((j) => j.id === jobId) ?? route.params.job;
  const { notes, addNote, updateNote, deleteNote, refresh: refreshNotes } = useNotes(jobId);
  const [text, setText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef(null);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([Promise.resolve(refreshJobs()), Promise.resolve(refreshNotes())])
      .finally(() => setRefreshing(false));
  };

  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState('');

  const trips = job?.trips ?? [];
  const [selectedTrip, setSelectedTrip] = useState(
    () => initialTripNumber
      ?? trips.find((t) => t.status !== 'completed' && t.status !== 'for_return')?.tripNumber
      ?? trips[0]?.tripNumber
      ?? 1
  );

  useFocusEffect(
    useCallback(() => {
      const n = route.params?.initialTripNumber;
      if (n) setSelectedTrip(n);
    }, [route.params?.initialTripNumber])
  );
  const filteredNotes = notes.filter((n) => n.tripNumber === selectedTrip);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const author = profile?.full_name?.trim() || user?.email || 'Tech';
    setText('');
    await addNote(jobId, trimmed, author, selectedTrip, user?.id);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    if (!isAdmin) {
      const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
      notifyAdmins(
        'New Note',
        `${author} on Trip ${selectedTrip} of job ${job?.jobNumber ?? jobId}: "${preview}"`,
        { jobId }
      ).catch(() => {});
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setEditText(note.text);
  };

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    await updateNote(editingNote.id, editText);
    setEditingNote(null);
  };

  const handleDelete = (note) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  };

  const isNoteOwner = (note) => {
    if (note.userId) return note.userId === user?.id;
    const myName = profile?.full_name?.trim() || user?.email || 'Tech';
    return note.author === myName;
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {trips.length > 0 && (
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
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              isOwner={isNoteOwner(item)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
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

      {/* Edit modal */}
      <Modal visible={!!editingNote} transparent animationType="fade" onRequestClose={() => setEditingNote(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>Edit Note</Text>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              maxLength={1000}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingNote(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleEditSave}>
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  noteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  noteAuthor: { fontSize: 13, fontWeight: '700', color: Colors.primary, flex: 1 },
  noteActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 2 },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', paddingHorizontal: 24,
  },
  editModal: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 20,
  },
  editTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  editInput: {
    backgroundColor: Colors.offWhite ?? '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  editActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  editCancelBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.lightGray ?? '#e0e0e0',
  },
  editCancelText: { fontSize: 14, color: Colors.gray },
  editSaveBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 8, backgroundColor: Colors.primary,
  },
  editSaveText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
