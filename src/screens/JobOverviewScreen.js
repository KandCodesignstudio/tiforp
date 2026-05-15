import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, Switch, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';
import { useNotes } from '../hooks/useNotes';
import { getTripStatus, getJobStatus, TRIP_STATUSES } from '../utils/status';
import { TabActions } from '@react-navigation/native';

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

export default function JobOverviewScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { user, isAdmin, profile } = useAuth();
  const { jobs, updateTripStatus, updatePayments, addTrip, updateTrip, deleteTrip, refresh } = useJobs({ isAdmin, userId: user?.id, channelId: 'detail', userProfile: profile });
  const { notes } = useNotes(jobId);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripDate, setNewTripDate] = useState('');
  const [newTripScope, setNewTripScope] = useState('');
  const [savingTrip, setSavingTrip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editScope, setEditScope] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  const openEditTrip = (trip) => {
    const d = trip.scheduledAt instanceof Date ? trip.scheduledAt : trip.scheduledAt ? new Date(trip.scheduledAt) : null;
    const formatted = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : '';
    setEditingTrip(trip);
    setEditDate(formatted);
    setEditScope(trip.scopeOfWork ?? '');
  };

  const handleEditSave = async () => {
    if (!editDate.trim()) { Alert.alert('Date required', 'Please enter a scheduled date.'); return; }
    setSavingEdit(true);
    try {
      await updateTrip(job.id, editingTrip.id, { scheduledAt: editDate, scopeOfWork: editScope });
      setEditingTrip(null);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTripPress = (trip) => {
    Alert.alert(
      `Trip ${trip.tripNumber}`,
      formatTripDate(trip.scheduledAt) || 'No date set',
      [
        {
          text: 'View Notes',
          onPress: () => navigation.dispatch(TabActions.jumpTo('Notes', { initialTripNumber: trip.tripNumber })),
        },
        {
          text: 'View Attachments',
          onPress: () => navigation.dispatch(TabActions.jumpTo('Attachments', { initialTripNumber: trip.tripNumber })),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteTrip = (trip) => {
    Alert.alert(
      `Delete Trip ${trip.tripNumber}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => deleteTrip(job.id, trip.id),
        },
      ]
    );
  };

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
  const activeTrip = [...(trips ?? [])].reverse().find((t) => t.status !== 'completed' && t.status !== 'for_return')
    ?? trips?.[trips.length - 1];
  const pendingTrips = trips?.filter((t) => t.status === 'pending_approval') ?? [];

  const callPhone = (phone) => Linking.openURL(`tel:${phone}`);

  const handleAdvanceStatus = (trip) => {
    const info = getTripStatus(trip.status);
    if (!info.next) return;

    // Admin approves pending_approval → completed
    if (trip.status === 'pending_approval' && isAdmin) {
      Alert.alert(
        'Approve Completion',
        `Confirm Trip ${trip.tripNumber} is complete? You have reviewed the notes and photos.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: () => updateTripStatus(job.id, trip.id, 'completed') },
        ]
      );
      return;
    }

    // Tech at checked_out → submit for approval or for return
    if (trip.status === 'checked_out' && !isAdmin) {
      const tripNotes = notes.filter((n) => n.tripNumber === trip.tripNumber);
      const tripAttachments = (job.attachments ?? []).filter((a) => (a.tripNumber ?? 1) === trip.tripNumber);
      const hasNotes = tripNotes.length > 0;
      const hasAttachments = tripAttachments.length > 0;

      if (!hasNotes || !hasAttachments) {
        const missing = [
          !hasNotes && 'notes',
          !hasAttachments && 'photos/files',
        ].filter(Boolean).join(' and ');
        Alert.alert(
          'Not Ready Yet',
          `Please add ${missing} for this trip before submitting for approval.`,
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        'Finish Trip',
        'How is this trip ending?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'For Return', onPress: () => updateTripStatus(job.id, trip.id, 'for_return') },
          { text: 'Submit for Approval', onPress: () => updateTripStatus(job.id, trip.id, 'pending_approval') },
        ]
      );
      return;
    }

    updateTripStatus(job.id, trip.id, info.next);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
    >

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

      {/* Pending approval banner — admin only */}
      {isAdmin && pendingTrips.length > 0 && pendingTrips.map((trip) => (
        <View key={trip.id} style={styles.approvalBanner}>
          <View style={styles.approvalBannerLeft}>
            <Ionicons name="time-outline" size={20} color="#92400e" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.approvalBannerTitle}>Trip {trip.tripNumber} — Awaiting Your Approval</Text>
              <Text style={styles.approvalBannerSub}>Review notes and photos before approving.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.approvalBtn}
            onPress={() => handleAdvanceStatus(trip)}
          >
            <Text style={styles.approvalBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Active trip status control */}
      {activeTrip && activeTrip.status !== 'pending_approval' && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Current Trip — #{activeTrip.tripNumber}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusPill, { backgroundColor: getTripStatus(activeTrip.status).color + '20' }]}>
              <Text style={[styles.statusPillText, { color: getTripStatus(activeTrip.status).color }]}>
                {getTripStatus(activeTrip.status).label}
              </Text>
            </View>
          </View>

          {getTripStatus(activeTrip.status).next && !isAdmin && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.accent }]}
              onPress={() => handleAdvanceStatus(activeTrip)}
            >
              <Text style={styles.actionBtnText}>{getTripStatus(activeTrip.status).nextLabel}</Text>
            </TouchableOpacity>
          )}

          {/* Quick status options for active trips beyond scheduled */}
          {!isAdmin && activeTrip.status !== 'scheduled' && activeTrip.status !== 'completed' && activeTrip.status !== 'for_return' && activeTrip.status !== 'pending_approval' && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => updateTripStatus(job.id, activeTrip.id, 'for_return')}
            >
              <Text style={styles.linkBtnText}>Mark as For Return instead</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Admin: schedule a follow-up trip when job needs return */}
      {isAdmin && status === 'needs_followup' && (
        <TouchableOpacity
          style={styles.addTripBtn}
          onPress={() => setShowAddTrip(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
          <Text style={styles.addTripBtnText}>Add Next Trip</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showAddTrip}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddTrip(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schedule Next Trip</Text>
            <Text style={styles.modalSubtitle}>Trip #{(trips?.length ?? 0) + 1}</Text>

            <Text style={styles.modalLabel}>Scheduled Date & Time</Text>
            <TextInput
              style={styles.modalInput}
              value={newTripDate}
              onChangeText={setNewTripDate}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={Colors.gray}
            />

            <Text style={styles.modalLabel}>Scope of Work</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 70, textAlignVertical: 'top' }]}
              value={newTripScope}
              onChangeText={setNewTripScope}
              placeholder="What needs to be done on this trip?"
              placeholderTextColor={Colors.gray}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowAddTrip(false);
                  setNewTripDate('');
                  setNewTripScope('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                disabled={savingTrip}
                onPress={async () => {
                  if (!newTripDate.trim()) {
                    Alert.alert('Date required', 'Please enter a scheduled date.');
                    return;
                  }
                  setSavingTrip(true);
                  try {
                    await addTrip(job.id, { scheduledAt: newTripDate, scopeOfWork: newTripScope });
                    setShowAddTrip(false);
                    setNewTripDate('');
                    setNewTripScope('');
                  } catch (err) {
                    Alert.alert('Error', err.message);
                  } finally {
                    setSavingTrip(false);
                  }
                }}
              >
                {savingTrip ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Add Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
            <TouchableOpacity
              key={trip.id ?? `trip-${idx}`}
              style={[styles.tripRow, idx < trips.length - 1 && styles.tripBorder]}
              onPress={() => handleTripPress(trip)}
              activeOpacity={0.7}
            >
              <View style={styles.tripLeft}>
                <Text style={styles.tripLabel}>Trip {trip.tripNumber}</Text>
                <Text style={styles.tripDate}>{formatTripDate(trip.scheduledAt)}</Text>
                {!!trip.scopeOfWork && (
                  <Text style={styles.tripScope} numberOfLines={2}>{trip.scopeOfWork}</Text>
                )}
              </View>
              <View style={styles.tripRight}>
                <View style={[styles.tripStatus, { backgroundColor: tInfo.color + '20' }]}>
                  <Text style={[styles.tripStatusText, { color: tInfo.color }]}>{tInfo.label}</Text>
                </View>
                {isAdmin && (
                  <View style={styles.tripActions}>
                    <TouchableOpacity onPress={() => openEditTrip(trip)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteTrip(trip)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger ?? '#e53935'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Edit trip modal */}
      <Modal visible={!!editingTrip} transparent animationType="fade" onRequestClose={() => setEditingTrip(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Trip {editingTrip?.tripNumber}</Text>

            <Text style={styles.modalLabel}>Scheduled Date & Time</Text>
            <TextInput
              style={styles.modalInput}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={Colors.gray}
            />

            <Text style={styles.modalLabel}>Scope of Work</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 70, textAlignVertical: 'top' }]}
              value={editScope}
              onChangeText={setEditScope}
              placeholder="What needs to be done on this trip?"
              placeholderTextColor={Colors.gray}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingTrip(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} disabled={savingEdit} onPress={handleEditSave}>
                {savingEdit
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.modalSaveText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
  tripBorder: { borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  tripLeft: { flex: 1, paddingRight: 12 },
  tripLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  tripDate: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  tripScope: { fontSize: 12, color: Colors.darkGray, marginTop: 4, lineHeight: 16 },
  tripRight: { alignItems: 'flex-end', gap: 8 },
  tripStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tripStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  tripActions: { flexDirection: 'row', gap: 12 },
  approvalBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  approvalBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  approvalBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  approvalBannerSub: { fontSize: 11, color: '#b45309', marginTop: 2 },
  approvalBtn: {
    backgroundColor: Colors.completed,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 10,
  },
  approvalBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  addTripBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 13,
    marginBottom: 12, gap: 6,
  },
  addTripBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 20, width: '100%',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  modalSubtitle: { fontSize: 12, color: Colors.textLight, marginTop: 2, marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: Colors.darkGray, marginBottom: 6, letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: Colors.screenBg, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, color: Colors.text, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.lightGray,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: Colors.lightGray, alignItems: 'center',
  },
  modalCancelText: { color: Colors.darkGray, fontWeight: '700' },
  modalSaveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: Colors.accent, alignItems: 'center',
  },
  modalSaveText: { color: Colors.white, fontWeight: '700' },
});
