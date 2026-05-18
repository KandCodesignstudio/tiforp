import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../utils/colors';

export default function ProfileScreen() {
  const { user, profile, logout } = useAuth();

  const displayName = profile?.full_name?.trim() || user?.email || '?';
  const initial = displayName[0].toUpperCase();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const role = profile?.role === 'admin' ? 'Administrator' : 'Field Technician';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        {profile?.full_name ? (
          <Text style={styles.name}>{profile.full_name}</Text>
        ) : null}
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>{role}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.row}>
          <Ionicons name="mail-outline" size={18} color={Colors.accent} style={styles.rowIcon} />
          <Text style={styles.rowText}>{user?.email}</Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} style={styles.rowIcon} />
          <Text style={styles.rowText}>Status</Text>
          <Text style={styles.rowValue}>Active</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.row}>
          <Ionicons name="phone-portrait-outline" size={18} color={Colors.accent} style={styles.rowIcon} />
          <Text style={styles.rowText}>ITforP Core</Text>
          <Text style={styles.rowValue}>v{appVersion}</Text>
        </View>
        <View style={[styles.row, styles.rowLast]}>
          <Ionicons name="construct-outline" size={18} color={Colors.accent} style={styles.rowIcon} />
          <Text style={styles.rowText}>Platform</Text>
          <Text style={styles.rowValue}>Field Operations</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.white },
  name: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  email: { fontSize: 14, color: Colors.textLight, marginBottom: 4 },
  role: { fontSize: 13, color: Colors.textLight, letterSpacing: 0.3 },
  card: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textLight,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { marginRight: 12 },
  rowText: { flex: 1, fontSize: 14, color: Colors.text },
  rowValue: { fontSize: 13, color: Colors.textLight },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.white, borderRadius: 12, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.danger },
});
