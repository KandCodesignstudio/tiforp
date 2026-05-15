import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../utils/colors';
import { supabase } from '../config/supabase';
import { notifyAdmins } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';

const FILE_ICONS = {
  pdf: 'document-text',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  doc: 'document',
  docx: 'document',
  xls: 'grid',
  xlsx: 'grid',
  default: 'attach',
};

function getExt(name = '') {
  return name.split('.').pop()?.toLowerCase() ?? 'default';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({ item, onDelete }) {
  const ext = getExt(item.name);
  const icon = FILE_ICONS[ext] ?? FILE_ICONS.default;

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={Colors.accent} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.fileMeta}>
          {ext.toUpperCase()}{item.size ? ` · ${formatSize(item.size)}` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

export default function AttachmentsScreen({ route }) {
  const { job } = route.params;
  const { profile, isAdmin } = useAuth();
  const [attachments, setAttachments] = useState(job.attachments ?? []);
  const [uploading, setUploading] = useState(false);

  const addAttachment = async (file) => {
    const newAttachment = { id: Date.now().toString(), name: file.name, size: file.size, uri: file.uri };
    setAttachments((prev) => [...prev, newAttachment]);

    const updatedAttachments = [...attachments, newAttachment];
    await supabase.from('jobs').update({ attachments: updatedAttachments }).eq('id', job.id);

    if (!isAdmin) {
      const techName = profile?.full_name ?? 'Technician';
      notifyAdmins(
        'New Attachment Uploaded',
        `${techName} uploaded "${file.name}" on job ${job.jobNumber ?? job.id}`,
        { jobId: job.id }
      ).catch(() => {});
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        setUploading(true);
        await addAttachment(result.assets[0]);
        setUploading(false);
      }
    } catch {
      Alert.alert('Error', 'Could not pick document.');
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setUploading(true);
        const asset = result.assets[0];
        const name = asset.uri.split('/').pop() ?? `photo_${Date.now()}.jpg`;
        await addAttachment({ name, size: asset.fileSize, uri: asset.uri });
        setUploading(false);
      }
    } catch {
      Alert.alert('Error', 'Could not pick photo.');
      setUploading(false);
    }
  };

  const deleteAttachment = (id) => {
    Alert.alert('Remove Attachment', 'Remove this file?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setAttachments((p) => p.filter((a) => a.id !== id)) },
    ]);
  };

  const showAddOptions = () => {
    Alert.alert('Add Attachment', 'Choose source', [
      { text: 'Document / File', onPress: pickDocument },
      { text: 'Photo Library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={attachments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AttachmentRow item={item} onDelete={deleteAttachment} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cloud-upload-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>No attachments yet</Text>
            <Text style={styles.emptySubText}>Tap + to add files or photos</Text>
          </View>
        }
      />

      {uploading && (
        <View style={styles.uploadOverlay}>
          <ActivityIndicator size="small" color={Colors.white} />
          <Text style={styles.uploadText}>Uploading...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={showAddOptions}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  list: { padding: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
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
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  uploadText: { color: Colors.white, fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
