import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';
import { getTripStatus, getJobStatus, TRIP_STATUSES } from '../utils/status';

function MapPlaceholder({ address }) {
  const encodedAddress = encodeURIComponent(address || '');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

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

export default function JobOverviewScreen({ route }) {
  const { jobId } = route.params;
  const { user, isAdmin } = useAuth();
  const { jobs, updateTripStatus, updatePayments } = useJobs({ isAdmin, userId: user?.id, channelId: 'detail' });

  const job = jobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const { client, jobNumber, status, description, trips, clientPaid, techPaid } = job;

  const jobStatusInfo = getJobStatus(status);
  const activeTrip = trips?.find((t) => t.status !== 'completed' && t.status !== 'for_return') ?? trips?.[0];

  const callPhone = (phone) => Linking.openURL(`tel:${phone}`);

  const handleAdvanceStatus = (trip) => {
    const info = getTripStatus(trip.status);
    if (!info.next) return;

    if (info.next === 'completed') {
      // Give option to mark as For Return instead
      Alert.alert(
        'Finish Trip',
        'How is this trip ending?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'For Return', onPress: () => updateTripStatus(job.id, trip.id, 'for_return') },
          { text: 'Complete', onPress: () => updateTripStatus(job.id, trip.id, 'completed') },
        ]
      );
    } else {
      updateTripStatus(job.id, trip.id, info.next);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={[styles.jobStatusBanner, { backgroundColor: jobStatusInfo.color + '15', borderColor: jobStatusInfo.color }]}>
        <Text style={styles.jobNumberBanner}>{jobNumber}</Text>
        <Text style={[styles.jobStatusBannerText, { color: jobStatusInfo.color }]}>{jobStatusInfo.label}</Text>
      </View>

      <MapPlaceholder address={client?.address} />

      <View style={styles.card}>
        <Text style={styles.clientName}>{client?.name}</Text>
        {client?.storeNumber && (
          <Text style={styles.storeNumber}>{client.storeNumber}</Text>
        )}
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client?.address)}`;
            Linking.openURL(url);
          }}
        >
          <Ionicons name="location-outline" size={18} color={Colors.accent} style={styles.infoIcon} />
          <Text style={[styles.infoText, styles.infoLink]}>{client?.address}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Active trip status control */}
      {activeTrip && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Current Trip — #{activeTrip.tripNumber}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: getTripStatus(activeTrip.status).color + '20' }]}>
              <Text style={[styles.statusPillText, { color: getTripStatus(activeTrip.status).color }]}>
                {getTripStatus(activeTrip.status).label}
              </Text>
            </View>
          </View>

          {getTripStatus(activeTrip.status).next && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
              onPress={() => handleAdvanceStatus(activeTrip)}
            >
              <Text style={styles.actionBtnText}>{getTripStatus(activeTrip.status).nextLabel}</Text>
            </TouchableOpacity>
          )}

          {/* Quick status options for active trips beyond scheduled */}
          {activeTrip.status !== 'scheduled' && activeTrip.status !== 'completed' && activeTrip.status !== 'for_return' && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => updateTripStatus(job.id, activeTrip.id, 'for_return')}
            >
              <Text style={styles.linkBtnText}>Mark as For Return instead</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Admin payment controls */}
      {isAdmin && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Payment</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Client Paid</Text>
              <Text style={styles.toggleSub}>Customer invoice settled</Text>
            </View>
            <Switch
              value={!!clientPaid}
              onValueChange={(v) => updatePayments(job.id, { clientPaid: v })}
              trackColor={{ false: Colors.lightGray, true: Colors.completed }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Tech Paid</Text>
              <Text style={styles.toggleSub}>Technician paid for this job</Text>
            </View>
            <Switch
              value={!!techPaid}
              onValueChange={(v) => updatePayments(job.id, { techPaid: v })}
              trackColor={{ false: Colors.lightGray, true: Colors.completed }}
            />
          </View>
        </View>
      )}

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
        <Text style={styles.sectionLabel}>All Trips ({trips?.length ?? 0})</Text>
        {trips?.map((trip, idx) => {
          const tInfo = getTripStatus(trip.status);
          return (
            <View key={trip.id} style={[styles.tripRow, idx < trips.length - 1 && styles.tripBorder]}>
              <View style={styles.tripLeft}>
                <Text style={styles.tripLabel}>Trip {trip.tripNumber}</Text>
                <Text style={styles.tripDate}>{formatTripDate(trip.scheduledAt)}</Text>
              </View>
              <View style={[styles.tripStatus, { backgroundColor: tInfo.color + '20' }]}>
                <Text style={[styles.tripStatusText, { color: tInfo.color }]}>{tInfo.label}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function formatTripDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getFullYear()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 16, paddingBottom: 32 },
  jobStatusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  jobNumberBanner: { fontSize: 14, fontWeight: '700', color: Colors.text },
  jobStatusBannerText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  mapPlaceholder: {
    height: 160,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    overflow: 'hidden',
  },
  mapIconContainer: {
    width: 72, height: 72, backgroundColor: Colors.white, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3, marginBottom: 8,
  },
  mapLabel: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  mapAddress: { fontSize: 11, color: Colors.textLight, marginTop: 4, paddingHorizontal: 20, textAlign: 'center' },
  card: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  clientName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  storeNumber: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.lightGray, marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoIcon: { marginRight: 8, marginTop: 1 },
  infoText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },
  infoLink: { color: Colors.accent },
  description: { fontSize: 14, color: Colors.darkGray, lineHeight: 21 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  statusRow: { flexDirection: 'row', marginBottom: 14 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  actionBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  linkBtn: { paddingVertical: 10, alignItems: 'center' },
  linkBtnText: { color: Colors.danger, fontSize: 13, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  toggleSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
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
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  tripBorder: { borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  tripLeft: {},
  tripLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  tripDate: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  tripStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tripStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
