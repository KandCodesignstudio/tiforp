import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useJobs } from '../context/JobsContext';
import { Colors } from '../utils/colors';

function formatDateTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatTripDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getFullYear()}`;
}

export default function InstructionsScreen({ route }) {
  const { jobId } = route.params;
  const { getJobById } = useJobs();
  const job = getJobById(jobId);

  const trips = job?.trips ?? [];
  const [selectedTrip, setSelectedTrip] = useState(trips[0]?.id ?? null);

  if (!job) return null;

  const trip = trips.find((t) => t.id === selectedTrip) ?? trips[0];

  const tripStatusLabel = (t) => {
    if (t.status === 'completed') return 'DONE';
    if (t.checkedInAt) return 'ACTIVE';
    return 'SCHED';
  };

  const tripStatusColor = (t) => {
    if (t.status === 'completed') return Colors.completed;
    if (t.checkedInAt) return Colors.inProgress;
    return Colors.warning;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {trip && (
        <View style={styles.tripChip}>
          <Text style={styles.tripChipText}>
            Trip {trip.tripNumber} ({formatTripDate(trip.scheduledAt)})
          </Text>
        </View>
      )}

      {trips.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tripTabs}>
          {trips.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, t.id === selectedTrip && styles.tabActive]}
              onPress={() => setSelectedTrip(t.id)}
            >
              <Text style={[styles.tabText, t.id === selectedTrip && styles.tabTextActive]}>
                Trip {t.tripNumber}
              </Text>
              <View style={[
                styles.tabBadge,
                { backgroundColor: tripStatusColor(t) + (t.id === selectedTrip ? 'FF' : '33') },
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: t.id === selectedTrip ? Colors.white : tripStatusColor(t) },
                ]}>
                  {tripStatusLabel(t)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {trip && (
        <View style={styles.card}>
          <View style={styles.tripHeader}>
            <Text style={styles.tripTitle}>Trip {trip.tripNumber}</Text>
            <Text style={styles.tripDate}>{formatDateTime(trip.scheduledAt)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Instructions</Text>

          <View style={styles.scopeCard}>
            <Text style={styles.scopeTitle}>SCOPE OF WORK</Text>
            {trip.scopeOfWork?.split('\n').map((line, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{line.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {trips.length === 0 && (
        <Text style={styles.empty}>No trips scheduled yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 16, paddingBottom: 32 },
  tripChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  tripChipText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  tripTabs: { marginBottom: 12 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    marginRight: 8,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.darkGray, fontWeight: '600' },
  tabTextActive: { color: Colors.white },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tabBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  tripDate: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.lightGray, marginVertical: 14 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  scopeCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    padding: 14,
  },
  scopeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.accent, marginTop: 7, marginRight: 10, flexShrink: 0,
  },
  bulletText: { fontSize: 14, color: Colors.darkGray, lineHeight: 22, flex: 1 },
  empty: { textAlign: 'center', color: Colors.gray, marginTop: 40, fontSize: 15 },
});
