import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '../context/JobsContext';
import { Colors } from '../utils/colors';

function formatTripDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getFullYear()}`;
}

function formatTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(start, end) {
  const mins = Math.floor((new Date(end) - new Date(start)) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function InfoRow({ icon, text, onPress }) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={18} color={Colors.accent} style={styles.infoIcon} />
      <Text style={[styles.infoText, onPress && styles.infoLink]}>{text}</Text>
    </TouchableOpacity>
  );
}

function MapPlaceholder({ address }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
  return (
    <TouchableOpacity
      style={styles.mapPlaceholder}
      onPress={() => Linking.openURL(mapsUrl)}
      activeOpacity={0.8}
    >
      <View style={styles.mapIconContainer}>
        <Ionicons name="map" size={40} color={Colors.accent} />
      </View>
      <Text style={styles.mapLabel}>Tap to open in Maps</Text>
      <Text style={styles.mapAddress} numberOfLines={2}>{address}</Text>
    </TouchableOpacity>
  );
}

function TripActionsCard({ job, trip, onCheckIn, onCheckOut, onComplete }) {
  const isCompleted = trip.status === 'completed';

  return (
    <View style={styles.card}>
      <View style={styles.tripActionsHeader}>
        <Text style={styles.sectionLabel}>Active Trip</Text>
        <View style={[
          styles.tripStatusBadge,
          {
            backgroundColor: isCompleted
              ? Colors.completed + '20'
              : trip.checkedInAt ? Colors.inProgress + '20' : Colors.warning + '20',
          },
        ]}>
          <Text style={[
            styles.tripStatusText,
            {
              color: isCompleted
                ? Colors.completed
                : trip.checkedInAt ? Colors.inProgress : Colors.warning,
            },
          ]}>
            {isCompleted ? 'COMPLETED' : trip.checkedInAt ? 'ACTIVE' : 'SCHEDULED'}
          </Text>
        </View>
      </View>

      <Text style={styles.tripActionsSubtitle}>
        Trip {trip.tripNumber} · {formatTripDate(trip.scheduledAt)}
      </Text>

      {!isCompleted && (
        <>
          <View style={styles.divider} />

          <View style={styles.checkRow}>
            <View>
              <Text style={styles.checkLabel}>ARRIVED</Text>
              <Text style={[styles.checkTime, !trip.checkedInAt && styles.checkTimePending]}>
                {trip.checkedInAt ? formatTime(trip.checkedInAt) : '—'}
              </Text>
            </View>
            {!trip.checkedInAt && (
              <TouchableOpacity style={styles.checkBtn} onPress={onCheckIn}>
                <Ionicons name="enter-outline" size={16} color={Colors.white} />
                <Text style={styles.checkBtnText}>CHECK IN</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.checkRow, styles.checkRowLast]}>
            <View>
              <Text style={styles.checkLabel}>DEPARTED</Text>
              <Text style={[styles.checkTime, !trip.checkedOutAt && styles.checkTimePending]}>
                {trip.checkedOutAt ? formatTime(trip.checkedOutAt) : '—'}
              </Text>
              {trip.checkedInAt && trip.checkedOutAt && (
                <Text style={styles.checkDuration}>
                  {formatDuration(trip.checkedInAt, trip.checkedOutAt)} on site
                </Text>
              )}
            </View>
            {trip.checkedInAt && !trip.checkedOutAt && (
              <TouchableOpacity style={styles.checkBtn} onPress={onCheckOut}>
                <Ionicons name="exit-outline" size={16} color={Colors.white} />
                <Text style={styles.checkBtnText}>CHECK OUT</Text>
              </TouchableOpacity>
            )}
          </View>

          {trip.checkedOutAt && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.completeBtn} onPress={onComplete}>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.completeBtnText}>Mark Trip Complete</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {isCompleted && (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.completed} />
          <Text style={styles.completedBannerText}>Trip completed successfully</Text>
        </View>
      )}
    </View>
  );
}

export default function JobOverviewScreen({ route }) {
  const { jobId } = route.params;
  const { getJobById, checkIn, checkOut, markTripComplete } = useJobs();
  const job = getJobById(jobId);

  if (!job) return null;

  const { client, jobNumber, status, description, trips } = job;
  const statusColor = status === 'in_progress' ? Colors.inProgress : Colors.completed;
  const statusLabel = status === 'in_progress' ? 'IN PROGRESS' : 'COMPLETED';
  const activeTrip = trips?.find((t) => t.status !== 'completed') ?? null;

  const callPhone = (phone) => Linking.openURL(`tel:${phone}`);

  const handleMarkComplete = (tripId) => {
    Alert.alert('Mark Trip Complete', 'Confirm this trip is fully complete?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => markTripComplete(job.id, tripId) },
    ]);
  };

  const tripStatusLabel = (trip) => {
    if (trip.status === 'completed') return 'DONE';
    if (trip.checkedOutAt) return 'CHECKED OUT';
    if (trip.checkedInAt) return 'CHECKED IN';
    return 'SCHEDULED';
  };

  const tripStatusColor = (trip) => {
    if (trip.status === 'completed') return Colors.completed;
    if (trip.checkedInAt) return Colors.inProgress;
    return Colors.warning;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeTrip && (
        <TripActionsCard
          job={job}
          trip={activeTrip}
          onCheckIn={() => checkIn(job.id, activeTrip.id)}
          onCheckOut={() => checkOut(job.id, activeTrip.id)}
          onComplete={() => handleMarkComplete(activeTrip.id)}
        />
      )}

      <MapPlaceholder address={client?.address} />

      <View style={styles.card}>
        <Text style={styles.clientName}>{client?.name}</Text>
        {client?.storeNumber && (
          <Text style={styles.storeNumber}>{client.storeNumber}</Text>
        )}
        <View style={styles.divider} />
        <InfoRow
          icon="location-outline"
          text={client?.address}
          onPress={() => {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client?.address)}`;
            Linking.openURL(url);
          }}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobNumber}>{jobNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>

      {client?.contacts?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Contacts</Text>
          {client.contacts.map((contact, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.contactRow}
              onPress={() => callPhone(contact.phone)}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.avatarText}>{contact.name[0]}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactRole}>{contact.role}</Text>
              </View>
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={16} color={Colors.accent} />
                <Text style={styles.phone}>{contact.phone}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Trips ({trips?.length ?? 0})</Text>
        {trips?.map((trip, idx) => (
          <View key={trip.id} style={[styles.tripRow, idx < trips.length - 1 && styles.tripBorder]}>
            <View style={styles.tripLeft}>
              <Text style={styles.tripLabel}>Trip {trip.tripNumber}</Text>
              <Text style={styles.tripDate}>{formatTripDate(trip.scheduledAt)}</Text>
            </View>
            <View style={[
              styles.tripStatusBadge,
              { backgroundColor: tripStatusColor(trip) + '20' },
            ]}>
              <Text style={[styles.tripStatusText, { color: tripStatusColor(trip) }]}>
                {tripStatusLabel(trip)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  // Trip Actions Card
  tripActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tripActionsSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  checkRowLast: { borderBottomWidth: 0 },
  checkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  checkTime: { fontSize: 18, fontWeight: '700', color: Colors.text },
  checkTimePending: { color: Colors.lightGray },
  checkDuration: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  checkBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 4,
    gap: 8,
  },
  completeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  completedBannerText: { fontSize: 14, color: Colors.completed, fontWeight: '600' },
  // Map
  mapPlaceholder: {
    height: 160,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapIconContainer: {
    width: 72,
    height: 72,
    backgroundColor: Colors.white,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  mapLabel: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  mapAddress: { fontSize: 11, color: Colors.textLight, marginTop: 4, paddingHorizontal: 20, textAlign: 'center' },
  // Client card
  clientName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  storeNumber: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.lightGray, marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  infoIcon: { marginRight: 8, marginTop: 1 },
  infoText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },
  infoLink: { color: Colors.accent },
  // Job card
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  jobNumber: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  description: { fontSize: 14, color: Colors.darkGray, lineHeight: 21 },
  // Contacts
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textLight,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contactAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  contactRole: { fontSize: 12, color: Colors.textLight },
  phoneContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phone: { fontSize: 13, color: Colors.accent },
  // Trips list
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  tripBorder: { borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  tripLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  tripDate: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  tripStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tripStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
