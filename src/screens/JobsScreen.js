import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '../hooks/useJobs';
import { Colors } from '../utils/colors';

function formatDateTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function JobCard({ job, onPress }) {
  const isInProgress = job.status === 'in_progress';
  const statusColor = isInProgress ? Colors.inProgress : Colors.completed;
  const statusLabel = isInProgress ? 'IN PROGRESS' : 'COMPLETED';
  const tripCount = job.trips?.length ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{job.client?.name}</Text>
        <Text style={styles.jobNumber}>{job.jobNumber}</Text>
      </View>
      <Text style={styles.address}>{job.client?.address}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.tripInfo}>
          <Text style={styles.tripCount}>
            {tripCount} {tripCount === 1 ? 'TRIP' : 'TRIPS'} SCHEDULED
          </Text>
          {job.nextTrip && (
            <Text style={styles.nextTrip}>
              NEXT {formatDateTime(job.nextTrip).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function JobsScreen({ navigation }) {
  const { jobs, loading } = useJobs();
  const [refreshing, setRefreshing] = useState(false);

  const inProgress = jobs.filter((j) => j.status === 'in_progress');
  const completed = jobs.filter((j) => j.status === 'completed');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const sections = [
    { type: 'section-header', label: 'In Progress', key: 'h_inprogress' },
    ...inProgress.map((j) => ({ type: 'job', ...j, key: j.id })),
    { type: 'section-header', label: 'Completed', key: 'h_completed' },
    ...completed.map((j) => ({ type: 'job', ...j, key: j.id })),
  ];

  const renderItem = ({ item }) => {
    if (item.type === 'section-header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.label}</Text>
        </View>
      );
    }
    return (
      <JobCard
        job={item}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id, clientName: item.client?.name })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>JOBS</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
          <Ionicons name="person-circle-outline" size={28} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.accent} />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No jobs assigned yet.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
  },
  profileBtn: { padding: 2 },
  loader: { flex: 1, marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  jobNumber: { fontSize: 13, fontWeight: '600', color: Colors.darkGray, marginLeft: 8 },
  address: { fontSize: 13, color: Colors.textLight, marginBottom: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  tripInfo: { flex: 1 },
  tripCount: { fontSize: 10, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.5 },
  nextTrip: { fontSize: 10, color: Colors.textLight, marginTop: 2, letterSpacing: 0.3 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  emptyText: { textAlign: 'center', color: Colors.gray, marginTop: 40, fontSize: 15 },
});
