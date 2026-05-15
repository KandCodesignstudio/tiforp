import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Linking, Image, Modal, SafeAreaView, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../utils/colors';
import { supabase } from '../config/supabase';
import { notifyAdmins } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';

const BUCKET = 'attachments';
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'heic', 'gif', 'webp']);

function getExt(name = '') {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isImage(name) {
  return IMAGE_EXTS.has(getExt(name));
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTripDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getFullYear()}`;
}

const FILE_ICONS = {
  pdf: 'document-text', doc: 'document', docx: 'document',
  xls: 'grid', xlsx: 'grid', default: 'attach',
};

function AttachmentRow({ item, onDelete, onOpen }) {
  const ext = getExt(item.name);
  const photo = isImage(item.name);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onOpen(item)} activeOpacity={0.75}>
      {photo && item.url ? (
        <Image source={{ uri: item.url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={styles.iconWrap}>
          <Ionicons name={FILE_ICONS[ext] ?? FILE_ICONS.default} size={22} color={Colors.accent} />
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.fileMeta}>
          {ext.toUpperCase()}{item.size ? ` · ${formatSize(item.size)}` : ''}
          {photo ? '  · Tap to view' : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToArrayBuffer(b64) {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  let pad = 0;
  if (clean[len - 1] === '=') pad++;
  if (clean[len - 2] === '=') pad++;
  const bufferLength = (len * 3) / 4 - pad;
  const buf = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(buf);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = BASE64_CHARS.indexOf(clean[i]);
    const e2 = BASE64_CHARS.indexOf(clean[i + 1]);
    const e3 = BASE64_CHARS.indexOf(clean[i + 2]);
    const e4 = BASE64_CHARS.indexOf(clean[i + 3]);
    if (p < bufferLength) bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return buf;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function AttachmentsScreen({ route }) {
  const { jobId } = route.params;
  const { user, profile, isAdmin } = useAuth();
  const { jobs, refresh } = useJobs({ isAdmin, userId: user?.id, channelId: 'attachments' });
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState(null);

  const job = jobs.find((j) => j.id === jobId) ?? route.params.job;
  const trips = job?.trips ?? [];
  const attachments = job?.attachments ?? [];

  const [selectedTrip, setSelectedTrip] = useState(
    () => trips.find((t) => t.status !== 'completed' && t.status !== 'for_return')?.tripNumber
      ?? trips[0]?.tripNumber
      ?? 1
  );

  const filteredAttachments = attachments.filter(
    (a) => (a.tripNumber ?? 1) === selectedTrip
  );

  const addAttachment = async (file) => {
    const safeName = (file.name ?? `file_${Date.now()}`).replace(/[^\w.\-]/g, '_');
    const path = `${jobId}/trip${selectedTrip}_${Date.now()}_${safeName}`;

    const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
    const arrayBuffer = base64ToArrayBuffer(base64);

    const ext = getExt(file.name);
    const contentType = file.mimeType
      ?? (ext === 'png' ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'heic' ? 'image/heic'
        : ext === 'pdf' ? 'application/pdf'
        : 'application/octet-stream');

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const newAttachment = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      path,
      url: pub.publicUrl,
      tripNumber: selectedTrip,
    };

    const updatedAttachments = [...attachments, newAttachment];
    const { error: updErr } = await supabase
      .from('jobs')
      .update({ attachments: updatedAttachments })
      .eq('id', jobId);
    if (updErr) throw updErr;

    refresh();

    if (!isAdmin) {
      const techName = profile?.full_name ?? 'Technician';
      notifyAdmins(
        'New Attachment Uploaded',
        `${techName} uploaded "${file.name}" on Trip ${selectedTrip} of job ${job?.jobNumber ?? jobId}`,
        { jobId }
      ).catch(() => {});
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        setUploading(true);
        await addAttachment(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Upload Error', err.message ?? 'Could not upload file.');
    } finally {
      setUploading(false);
    }
  };

  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Allow photo library access to attach photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        setUploading(true);
        const asset = result.assets[0];
        const name = asset.uri.split('/').pop() ?? `photo_${Date.now()}.jpg`;
        await addAttachment({ name, size: asset.fileSize, uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
      }
    } catch (err) {
      Alert.alert('Upload Error', err.message ?? 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = (item) => {
    if (isImage(item.name) && item.url) setViewer(item);
    else if (item.url) Linking.openURL(item.url);
    else Alert.alert('Unavailable', 'This attachment has no remote URL.');
  };

  const deleteAttachment = (id) => {
    const target = attachments.find((a) => a.id === id);
    Alert.alert('Remove Attachment', 'Remove this file?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            if (target?.path) await supabase.storage.from(BUCKET).remove([target.path]);
            const updated = attachments.filter((a) => a.id !== id);
            await supabase.from('jobs').update({ attachments: updated }).eq('id', jobId);
            refresh();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
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
              key={t.id ?? t.tripNumber}
              style={[styles.tab, t.tripNumber === selectedTrip && styles.tabActive]}
              onPress={() => setSelectedTrip(t.tripNumber)}
            >
              <Text style={[styles.tabText, t.tripNumber === selectedTrip && styles.tabTextActive]}>
                TRIP {t.tripNumber}{t.scheduledAt ? ` (${formatTripDate(t.scheduledAt)})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filteredAttachments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AttachmentRow item={item} onDelete={deleteAttachment} onOpen={openAttachment} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cloud-upload-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>No attachments for Trip {selectedTrip}</Text>
            <Text style={styles.emptySubText}>Tap + to add files or photos</Text>
          </View>
        }
      />

      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.uploadText}>Uploading to Trip {selectedTrip}...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => Alert.alert('Add Attachment', `Upload to Trip ${selectedTrip}`, [
        { text: 'Document / File', onPress: pickDocument },
        { text: 'Photo Library', onPress: pickPhoto },
        { text: 'Cancel', style: 'cancel' },
      ])}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <SafeAreaView style={styles.viewerBg}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewer(null)}>
            <Ionicons name="close-circle" size={36} color={Colors.white} />
          </TouchableOpacity>
          {viewer && <Image source={{ uri: viewer.url }} style={styles.viewerImage} resizeMode="contain" />}
          {viewer && <Text style={styles.viewerName} numberOfLines={1}>{viewer.name}</Text>}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  tabs: { backgroundColor: Colors.primary, maxHeight: 48 },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  tabActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  tabTextActive: { color: Colors.primary },
  list: { padding: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 10, padding: 10, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, marginRight: 12, backgroundColor: Colors.lightGray },
  iconWrap: {
    width: 56, height: 56, borderRadius: 8,
    backgroundColor: Colors.lightGray, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  rowInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  fileMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  deleteBtn: { padding: 6 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: Colors.gray, marginTop: 16, fontWeight: '600' },
  emptySubText: { fontSize: 13, color: Colors.lightGray, marginTop: 4 },
  uploadOverlay: {
    position: 'absolute', bottom: 90, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  uploadText: { color: Colors.white, fontSize: 13 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  viewerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 16, zIndex: 10 },
  viewerImage: { width: SCREEN_W, height: SCREEN_H * 0.75 },
  viewerName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 16, paddingHorizontal: 24, textAlign: 'center' },
});
