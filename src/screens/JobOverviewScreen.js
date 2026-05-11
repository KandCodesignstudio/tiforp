import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/colors';

function InfoRow({ icon, text, onPress }) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={18} color={Colors.accent} style={styles.infoIcon} />
      <Text style={[styles.infoText, onPress && styles.infoLink]}>{text}</Text>
    </TouchableOpacity>
  );
}

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
  const { job } = route.params;
  const { client, jobNumber, status, description, trips } = job;

  const statusColor = status === 'in_progress' ? Colors.inProgress : Colors.completed;
  const statusLabel = status === 'in_progress' ? 'IN PROGRESS' : 'COMPLETED';
  const currentTrip = trips?.[0];

  const callPhone = (phone) => Linking.openURL(`tel:${phone}`);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {currentTrip && (
        <View style={styles.tripChip}>
          <Text style={styles.tripChipText}>
            Trip {currentTrip.tripNumber} ({formatTripDate(currentTrip.scheduledAt)})
          </Text>
        </View>
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
        <Ionicons
          name="navigate-circle"
          size={20}
          color={Colors.accent}
          style={styles.navIcon}
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
              styles.tripStatus,
              { backgroundColor: trip.status === 'completed' ? Colors.completed + '20' : Colors.warning + '20' }
            ]}>
              <Text style={[
                styles.tripStatusText,
                { color: trip.status === 'completed' ? Colors.completed : Colors.warning }
              ]}>
                {trip.status === 'completed' ? 'DONE' : 'SCHEDULED'}
              </Text>
            </View>
          </View>
        ))}
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
  tripChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  tripChipText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
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
    position: 'relative',
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
  clientName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  storeNumber: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.lightGray, marginVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  infoIcon: { marginRight: 8, marginTop: 1 },
  infoText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },
  infoLink: { color: Colors.accent },
  navIcon: { alignSelf: 'flex-end', marginTop: -20 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  jobNumber: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  description: { fontSize: 14, color: Colors.darkGray, lineHeight: 21 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textLight, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
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
