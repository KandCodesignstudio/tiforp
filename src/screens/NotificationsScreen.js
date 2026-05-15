import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNotificationInbox } from '../hooks/useNotificationInbox';
import { Colors } from '../utils/colors';

function timeAgo(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationRow({ item, onPress, onDelete }) {
  const unread = !item.readAt;
  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.dotCol}>
        {unread && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.title, unread && styles.titleUnread]}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onDelete(item.id)}
        style={styles.deleteBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color={Colors.gray} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, remove, refresh } =
    useNotificationInbox(user?.id);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  const handlePress = async (item) => {
    if (!item.readAt) await markRead(item.id);
    if (item.data?.jobId) {
      navigation.navigate('JobDetail', { jobId: item.data.jobId });
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete notification?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </Text>
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.bannerAction}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={handlePress} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.primary + '10',
  },
  bannerText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  bannerAction: { fontSize: 13, color: Colors.accent, fontWeight: '700' },
  list: { padding: 12, paddingBottom: 24 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: Colors.accent },
  dotCol: { width: 14, alignItems: 'center', paddingTop: 6 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
  },
  rowBody: { flex: 1, paddingHorizontal: 6 },
  title: { fontSize: 14, color: Colors.text, marginBottom: 2 },
  titleUnread: { fontWeight: '700' },
  body: { fontSize: 13, color: Colors.darkGray, lineHeight: 18 },
  time: { fontSize: 11, color: Colors.gray, marginTop: 6 },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15, color: Colors.gray, marginTop: 12 },
});
