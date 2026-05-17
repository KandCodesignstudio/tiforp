import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Alert, Switch, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';
import SignaturePad from '../components/SignaturePad';
import { Colors } from '../utils/colors';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';
import { useNotes } from '../hooks/useNotes';
import { getTripStatus, getJobStatus, TRIP_STATUSES } from '../utils/status';
import { TabActions, useFocusEffect } from '@react-navigation/native';
import { generateWorkOrderHTML } from '../utils/generateWorkOrder';
import { supabase } from '../config/supabase';
import DateTimePickerField from '../components/DateTimePicker';
import { submitReview } from '../hooks/useTechReviews';
import { useJobEvents } from '../hooks/useJobEvents';
import { useProfiles } from '../hooks/useProfiles';

function formatDuration(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const from = fromDate instanceof Date ? fromDate : new Date(fromDate);
  const to = toDate instanceof Date ? toDate : new Date(toDate);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;
  const mins = Math.round((to - from) / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTime(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function StarDisplay({ rating, size = 16 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color={i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'} />
      ))}
    </View>
  );
}

function MapWithPin({ address }) {
  const [coords, setCoords] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;

  useEffect(() => {
    if (!address) return;
    setCoords(null);
    setImgFailed(false);
    setGeocodeFailed(false);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'ITforPApp/1.0' } }
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.[0]) {
          setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        } else {
          setGeocodeFailed(true);
        }
      })
      .catch(() => setGeocodeFailed(true));
  }, [address]);

  const openMaps = () => Linking.openURL(mapsUrl);

  if (geocodeFailed || (coords && imgFailed)) {
    return (
      <TouchableOpacity style={styles.mapFallback} onPress={openMaps} activeOpacity={0.8}>
        <Ionicons name="map-outline" size={32} color={Colors.accent} />
        <Text style={styles.mapFallbackText}>Tap to open in Maps</Text>
        <Text style={styles.mapFallbackAddr} numberOfLines={1}>{address}</Text>
      </TouchableOpacity>
    );
  }

  if (!coords) {
    return (
      <View style={styles.mapLoading}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const staticUrl =
    `https://maps.geoapify.com/v1/staticmap?style=osm-bright-smooth` +
    `&width=600&height=300&center=lonlat:${coords.lon},${coords.lat}&zoom=15` +
    `&marker=lonlat:${coords.lon},${coords.lat};type:awesome;color:%230f2a55;size:large` +
    `&apiKey=b0ccd3dce6304ef194e03e9e81d2c64d`;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={openMaps} style={styles.mapContainer}>
      <Image
        source={{ uri: staticUrl }}
        style={styles.map}
        resizeMode="cover"
        onError={() => setImgFailed(true)}
      />
      <View style={styles.mapOpenBtn}>
        <Ionicons name="navigate-outline" size={13} color={Colors.white} />
        <Text style={styles.mapOpenBtnText}>Open in Maps</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function JobOverviewScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { user, isAdmin, profile } = useAuth();
  const { jobs, updateTripStatus, updatePayments, addTrip, updateTrip, deleteTrip, updateAttachments, closeJob, reassignTech, refresh } = useJobs({ isAdmin, userId: user?.id, channelId: 'detail', userProfile: profile });
  const { technicians } = useProfiles();
  const { events: jobEvents } = useJobEvents(job?.id);
  const { notes, refresh: refreshNotes } = useNotes(jobId);
  const [jobReview, setJobReview] = useState(null);
  const [focusTick, setFocusTick] = useState(0);

  useFocusEffect(useCallback(() => { setFocusTick((t) => t + 1); }, []));

  useEffect(() => {
    if (focusTick === 0) return;
    refresh();
    refreshNotes();
  }, [focusTick]);

  useEffect(() => {
    supabase.from('tech_reviews').select('*').eq('job_id', jobId).maybeSingle()
      .then(({ data }) => { if (data) setJobReview(data); });
  }, [jobId]);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignSearch, setReassignSearch] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [showEventHistory, setShowEventHistory] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [newTripDate, setNewTripDate] = useState(null);
  const [newTripScope, setNewTripScope] = useState('');
  const [savingTrip, setSavingTrip] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editDate, setEditDate] = useState(null);
  const [editScope, setEditScope] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [pendingApprovalTrip, setPendingApprovalTrip] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  const openEditTrip = (trip) => {
    const d = trip.scheduledAt instanceof Date ? trip.scheduledAt : trip.scheduledAt ? new Date(trip.scheduledAt) : null;
    setEditingTrip(trip);
    setEditDate(d);
    setEditScope(trip.scopeOfWork ?? '');
  };

  const handleEditSave = async () => {
    if (!editDate) { Alert.alert('Date required', 'Please select a scheduled date.'); return; }
    setSavingEdit(true);
    try {
      await updateTrip(job.id, editingTrip.id, { scheduledAt: editDate instanceof Date ? editDate.toISOString() : editDate, scopeOfWork: editScope });
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

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      let logoBase64 = null;
      try {
        const asset = Asset.fromModule(require('../../assets/logo.png'));
        await asset.downloadAsync();
        logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (_) {
        // logo not available — PDF will render without it
      }
      const html = generateWorkOrderHTML(job, notes, logoBase64);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Work Order ${job.jobNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setExportingPdf(false);
    }
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
  const lastTripCompleted = trips?.length > 0 && trips[trips.length - 1].status === 'completed';

  // Deliverable readiness for Submit for Approval button
  const activeTripNum = activeTrip?.tripNumber;
  const tripNotes = notes.filter((n) => n.tripNumber === activeTripNum);
  const tripAttachments = (job.attachments ?? []).filter(
    (a) => (a.tripNumber ?? 1) === activeTripNum && a.type !== 'signature'
  );
  const tripSignature = (job.attachments ?? []).find(
    (a) => a.tripNumber === activeTripNum && a.type === 'signature'
  );
  const hasNotes = tripNotes.length > 0;
  const hasAttachments = tripAttachments.length > 0;
  const hasSignature = !!tripSignature;
  const readyToSubmit = hasNotes && hasAttachments && hasSignature;

  const callPhone = (phone) => Linking.openURL(`tel:${phone}`);

  function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const doCheckIn = (trip) => updateTripStatus(job.id, trip.id, 'checked_in');

  const handleCheckInWithGPS = async (trip) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { doCheckIn(trip); return; }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const address = job.client?.address;
      if (!address) { doCheckIn(trip); return; }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      let results;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
        );
        results = await res.json();
      } finally {
        clearTimeout(timeoutId);
      }

      if (!results || !results.length) {
        Alert.alert(
          'Location Verification Unavailable',
          'Could not verify your distance from the job site. Check in anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Check In Anyway', onPress: () => doCheckIn(trip) },
          ]
        );
        return;
      }

      const dist = Math.round(
        haversineMeters(pos.coords.latitude, pos.coords.longitude,
          parseFloat(results[0].lat), parseFloat(results[0].lon))
      );

      if (dist > 500) {
        Alert.alert(
          'You seem far from the job site',
          `You are approximately ${dist >= 1000 ? (dist / 1000).toFixed(1) + ' km' : dist + ' m'} away from the job address. Check in anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Check In Anyway', onPress: () => doCheckIn(trip) },
          ]
        );
      } else {
        doCheckIn(trip);
      }
    } catch (err) {
      const isAbort = err?.name === 'AbortError';
      Alert.alert(
        isAbort ? 'Location Verification Timed Out' : 'Location Error',
        'Could not verify your distance from the job site. Check in anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Check In Anyway', onPress: () => doCheckIn(trip) },
        ]
      );
    }
  };

  const handleSignatureConfirm = async (svgPathData, canvasW, canvasH) => {
    setShowSignature(false);
    const trip = pendingApprovalTrip;
    setPendingApprovalTrip(null);
    if (!trip) return;

    const sigAttachment = {
      id: `sig_${Date.now()}`,
      type: 'signature',
      tripNumber: trip.tripNumber,
      svgPath: svgPathData,
      canvasW: canvasW ?? 300,
      canvasH: canvasH ?? 180,
      name: 'Client Signature',
      createdAt: new Date().toISOString(),
    };
    const updatedAttachments = [...(job.attachments ?? []), sigAttachment];
    updateAttachments(job.id, updatedAttachments);
    await supabase.from('jobs').update({ attachments: updatedAttachments }).eq('id', job.id);
  };

  const handleAdvanceStatus = async (trip) => {
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

    // Tech at checked_out → live DB check then submit
    if (trip.status === 'checked_out' && !isAdmin) {
      const { data: freshNotes } = await supabase
        .from('notes').select('id').eq('job_id', jobId).eq('trip_number', trip.tripNumber);
      const tripAttachments = (job.attachments ?? []).filter(
        (a) => (a.tripNumber ?? 1) === trip.tripNumber && a.type !== 'signature'
      );
      const hasNotes = (freshNotes ?? []).length > 0;
      const hasAttachments = tripAttachments.length > 0;

      // Sync the local notes state so the checklist updates immediately
      refreshNotes();

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

      updateTripStatus(job.id, trip.id, 'pending_approval');
      return;
    }

    // GPS verification for check-in
    if (info.next === 'checked_in' && !isAdmin) {
      handleCheckInWithGPS(trip);
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

      {isAdmin && (
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={() => navigation.navigate('EditJob', { job })}
        >
          <Ionicons name="create-outline" size={18} color={Colors.accent} />
          <Text style={styles.exportBtnText}>Edit Job</Text>
        </TouchableOpacity>
      )}

      <MapWithPin address={client?.address} />

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
        {job.technicianName && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={Colors.accent} style={styles.infoIcon} />
              <Text style={styles.infoText}>{job.technicianName}</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Pending approval — tech view with undo option */}
      {!isAdmin && pendingTrips.length > 0 && pendingTrips.map((trip) => (
        <View key={trip.id} style={styles.approvalBanner}>
          <View style={styles.approvalBannerLeft}>
            <Ionicons name="time-outline" size={20} color="#92400e" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.approvalBannerTitle}>Trip {trip.tripNumber} — Awaiting Admin Approval</Text>
              <Text style={styles.approvalBannerSub}>Submitted. An admin will review and approve.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.approvalBtn, { backgroundColor: Colors.gray }]}
            onPress={() => Alert.alert(
              'Undo Submission',
              'Take this trip back to "Checked Out"? You can make changes and resubmit.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Undo', onPress: () => updateTripStatus(job.id, trip.id, 'checked_out') },
              ]
            )}
          >
            <Text style={styles.approvalBtnText}>Undo</Text>
          </TouchableOpacity>
        </View>
      ))}

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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.sendBackBtn}
              onPress={() =>
                Alert.alert(
                  'Send Back to Tech',
                  `Send Trip ${trip.tripNumber} back to the technician for corrections?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Send Back', style: 'destructive', onPress: () => updateTripStatus(job.id, trip.id, 'checked_out') },
                  ]
                )
              }
            >
              <Text style={styles.sendBackBtnText}>Send Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.approvalBtn}
              onPress={() => handleAdvanceStatus(trip)}
            >
              <Text style={styles.approvalBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
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
          {!!activeTrip.checkedInAt && (
            <View style={styles.tripTimeBanner}>
              <Ionicons name="time-outline" size={14} color={Colors.textLight} />
              <Text style={styles.tripTimeBannerText}>
                Checked in: {formatTime(activeTrip.checkedInAt)}
                {activeTrip.checkedOutAt ? `  ·  Out: ${formatTime(activeTrip.checkedOutAt)}` : ''}
                {activeTrip.checkedInAt && activeTrip.checkedOutAt ? `  ·  ${formatDuration(activeTrip.checkedInAt, activeTrip.checkedOutAt)} onsite` : ''}
              </Text>
            </View>
          )}

          {/* Client signature button — shown at checked_out */}
          {!isAdmin && activeTrip.status === 'checked_out' && (
            <TouchableOpacity
              style={[styles.sigBtn, hasSignature && styles.sigBtnDone]}
              onPress={() => { setPendingApprovalTrip(activeTrip); setShowSignature(true); }}
            >
              <Ionicons
                name={hasSignature ? 'checkmark-circle' : 'pencil-outline'}
                size={16}
                color={hasSignature ? Colors.completed : Colors.primary}
              />
              <Text style={[styles.sigBtnText, hasSignature && { color: Colors.completed }]}>
                {hasSignature ? 'Signature Collected' : 'Get Client Signature'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Submit for Approval — greyed out until all deliverables met */}
          {getTripStatus(activeTrip.status).next && !isAdmin && activeTrip.status === 'checked_out' && (
            <>
              {!readyToSubmit && (
                <View style={styles.checklistBox}>
                  <Text style={styles.checklistTitle}>Required before submitting:</Text>
                  <Text style={[styles.checklistItem, hasNotes && styles.checklistDone]}>
                    {hasNotes ? '✓' : '○'} Trip notes
                  </Text>
                  <Text style={[styles.checklistItem, hasAttachments && styles.checklistDone]}>
                    {hasAttachments ? '✓' : '○'} Photos / files
                  </Text>
                  <Text style={[styles.checklistItem, hasSignature && styles.checklistDone]}>
                    {hasSignature ? '✓' : '○'} Client signature
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: readyToSubmit ? Colors.accent : Colors.lightGray }]}
                onPress={() => readyToSubmit && handleAdvanceStatus(activeTrip)}
                disabled={!readyToSubmit}
              >
                <Text style={[styles.actionBtnText, !readyToSubmit && { color: Colors.gray }]}>
                  {getTripStatus(activeTrip.status).nextLabel}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Advance button for non-checked_out statuses */}
          {getTripStatus(activeTrip.status).next && !isAdmin && activeTrip.status !== 'checked_out' && (
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

          {/* Undo last status — tech only, when a previous status exists */}
          {!isAdmin && getTripStatus(activeTrip.status).prev && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => {
                const prevStatus = getTripStatus(activeTrip.status).prev;
                const prevLabel = getTripStatus(prevStatus).label;
                Alert.alert(
                  'Undo Status',
                  `Revert this trip back to "${prevLabel}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Undo', onPress: () => updateTripStatus(job.id, activeTrip.id, prevStatus) },
                  ]
                );
              }}
            >
              <Text style={styles.linkBtnText}>↩ Undo — go back to previous status</Text>
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
            <DateTimePickerField
              value={newTripDate}
              onChange={setNewTripDate}
              placeholder="Tap to select date & time"
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
                  setNewTripDate(null);
                  setNewTripScope('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                disabled={savingTrip}
                onPress={async () => {
                  if (!newTripDate) {
                    Alert.alert('Date required', 'Please select a scheduled date.');
                    return;
                  }
                  setSavingTrip(true);
                  try {
                    await addTrip(job.id, { scheduledAt: newTripDate.toISOString(), scopeOfWork: newTripScope });
                    setShowAddTrip(false);
                    setNewTripDate(null);
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
              <Text style={styles.toggleSub}>
                {lastTripCompleted ? 'Technician paid for this job' : 'Available once last trip is completed'}
              </Text>
            </View>
            <View pointerEvents={lastTripCompleted ? 'auto' : 'none'} style={{ opacity: lastTripCompleted ? 1 : 0.35 }}>
              <Switch
                value={!!techPaid}
                onValueChange={(v) => updatePayments(job.id, { techPaid: v })}
                trackColor={{ false: Colors.lightGray, true: Colors.completed }}
              />
            </View>
          </View>
        </View>
      )}

      {/* Reassign Technician — admin only */}
      {isAdmin && status !== 'closed' && (
        <TouchableOpacity
          style={styles.reassignBtn}
          onPress={() => { setReassignSearch(''); setShowReassign(true); }}
        >
          <Ionicons name="person-outline" size={18} color={Colors.primary} />
          <Text style={styles.reassignBtnText}>Reassign Technician</Text>
        </TouchableOpacity>
      )}

      {/* Event History — admin only */}
      {isAdmin && jobEvents.length > 0 && (
        <View style={styles.card}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            onPress={() => setShowEventHistory((v) => !v)}
          >
            <Text style={styles.sectionLabel}>Event History ({jobEvents.length})</Text>
            <Ionicons name={showEventHistory ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textLight} />
          </TouchableOpacity>
          {showEventHistory && jobEvents.map((ev) => (
            <View key={ev.id} style={styles.eventRow}>
              <View style={styles.eventDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eventDesc}>{ev.description}</Text>
                <Text style={styles.eventMeta}>
                  {ev.actor_name ? `${ev.actor_name}  ·  ` : ''}
                  {ev.created_at ? new Date(ev.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Reassign modal */}
      <Modal visible={showReassign} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReassign(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reassign Technician</Text>
            <TouchableOpacity onPress={() => setShowReassign(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>Currently assigned: <Text style={{ fontWeight: '700' }}>{job?.technicianName ?? 'None'}</Text></Text>
          <View style={styles.searchRow2}>
            <Ionicons name="search" size={16} color={Colors.gray} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput2}
              value={reassignSearch}
              onChangeText={setReassignSearch}
              placeholder="Search technicians…"
              placeholderTextColor={Colors.gray}
              autoCorrect={false}
              autoFocus
            />
          </View>
          <ScrollView>
            {(reassignSearch.trim()
              ? technicians.filter((t) => (t.full_name ?? '').toLowerCase().includes(reassignSearch.trim().toLowerCase()))
              : technicians
            ).map((tech) => (
              <TouchableOpacity
                key={tech.id ?? tech.full_name}
                style={styles.techPickRow}
                disabled={reassigning}
                onPress={() => {
                  Alert.alert(
                    'Reassign Technician',
                    `Replace ${job?.technicianName ?? 'current tech'} with ${tech.full_name}? The active trip will be reset to Scheduled.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reassign',
                        style: 'destructive',
                        onPress: async () => {
                          setReassigning(true);
                          try {
                            await reassignTech(job.id, tech, profile?.full_name ?? 'Admin');
                            setShowReassign(false);
                          } catch (e) {
                            Alert.alert('Error', e.message);
                          } finally {
                            setReassigning(false);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <View style={styles.techPickAvatar}>
                  <Text style={styles.techPickAvatarText}>{(tech.full_name || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.techPickName}>{tech.full_name}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          {reassigning && <ActivityIndicator color={Colors.accent} style={{ margin: 16 }} />}
        </View>
      </Modal>

      {isAdmin && (
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={handleExportPdf}
          disabled={exportingPdf}
        >
          {exportingPdf ? (
            <ActivityIndicator color={Colors.accent} size="small" />
          ) : (
            <>
              <Ionicons name="document-outline" size={18} color={Colors.accent} />
              <Text style={styles.exportBtnText}>Export Work Order PDF</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {isAdmin && status !== 'closed' && (
        <TouchableOpacity
          style={styles.closeJobBtn}
          onPress={() => {
            Alert.alert(
              'Close Job',
              `Mark Job ${jobNumber} as closed? This means all work is complete and no return visit is needed.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Close Job',
                  style: 'destructive',
                  onPress: async () => {
                    await closeJob(job.id);
                    if (job.technicianId || job.technicianName) {
                      setReviewRating(0);
                      setReviewComment('');
                      setShowReview(true);
                    }
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
          <Text style={styles.closeJobBtnText}>Close Job</Text>
        </TouchableOpacity>
      )}

      {status === 'closed' && (
        <View style={styles.closedBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.completed} />
            <Text style={styles.closedBannerText}>This job has been closed</Text>
          </View>
          {!isAdmin && jobReview && (
            <View style={styles.reviewRow}>
              <StarDisplay rating={jobReview.rating} size={15} />
              {!!jobReview.comment && (
                <Text style={styles.reviewCommentText} numberOfLines={2}>{jobReview.comment}</Text>
              )}
            </View>
          )}
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
                {!!trip.checkedInAt && (
                  <Text style={styles.tripTimeText}>In: {formatTime(trip.checkedInAt)}{trip.checkedOutAt ? `  Out: ${formatTime(trip.checkedOutAt)}` : ''}</Text>
                )}
                {!!(trip.checkedInAt && trip.checkedOutAt) && (
                  <Text style={styles.tripDurationText}>⏱ {formatDuration(trip.checkedInAt, trip.checkedOutAt)} onsite</Text>
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
            <DateTimePickerField
              value={editDate}
              onChange={setEditDate}
              placeholder="Tap to select date & time"
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

      {/* Signature modal */}
      <Modal visible={showSignature} animationType="fade" transparent onRequestClose={() => { setShowSignature(false); setPendingApprovalTrip(null); }}>
        <View style={styles.sigOverlay}>
          <View style={styles.sigSheet}>
            <SignaturePad
              onConfirm={handleSignatureConfirm}
              onCancel={() => { setShowSignature(false); setPendingApprovalTrip(null); }}
            />
          </View>
        </View>
      </Modal>

      {/* Tech review modal */}
      <Modal visible={showReview} animationType="fade" transparent onRequestClose={() => setShowReview(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.reviewModal}>
            <Text style={styles.reviewModalTitle}>Rate Technician</Text>
            <Text style={styles.reviewModalSub}>
              {job.technicianName ?? 'the technician'} · Job {jobNumber}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= reviewRating ? '#F59E0B' : Colors.lightGray}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Add a comment (optional)…"
              placeholderTextColor={Colors.gray}
              multiline
              maxLength={500}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowReview(false)}>
                <Text style={styles.modalCancelText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, reviewRating === 0 && { opacity: 0.4 }]}
                disabled={reviewRating === 0 || savingReview}
                onPress={async () => {
                  if (reviewRating === 0) return;
                  setSavingReview(true);
                  try {
                    await submitReview({
                      jobId: job.id,
                      technicianId: job.technicianId ?? null,
                      technicianName: job.technicianName ?? null,
                      rating: reviewRating,
                      comment: reviewComment,
                      reviewerName: profile?.full_name ?? user?.email ?? 'Admin',
                      reviewerId: user?.id ?? null,
                    });
                    setShowReview(false);
                  } catch (err) {
                    Alert.alert('Error', err.message);
                  } finally {
                    setSavingReview(false);
                  }
                }}
              >
                {savingReview
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.modalSaveText}>Submit Review</Text>
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
  mapContainer: { height: 180, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  map: { width: '100%', height: 180 },
  mapOpenBtn: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  mapOpenBtnText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  mapLoading: {
    height: 180, borderRadius: 12, marginBottom: 12,
    backgroundColor: Colors.lightGray, alignItems: 'center', justifyContent: 'center',
  },
  mapFallback: {
    height: 180, borderRadius: 12, marginBottom: 12,
    backgroundColor: Colors.lightGray, alignItems: 'center', justifyContent: 'center',
  },
  mapFallbackText: { fontSize: 13, color: Colors.accent, fontWeight: '600', marginTop: 8 },
  mapFallbackAddr: { fontSize: 11, color: Colors.textLight, marginTop: 4, paddingHorizontal: 20 },
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    paddingVertical: 13,
    marginBottom: 12,
  },
  exportBtnText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  sigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12,
    marginTop: 8,
  },
  sigBtnDone: { borderColor: Colors.completed, backgroundColor: Colors.completed + '10' },
  sigBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  checklistBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 12,
    marginTop: 10,
  },
  checklistTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  checklistItem: { fontSize: 13, color: Colors.gray, marginBottom: 3 },
  checklistDone: { color: Colors.completed },
  closeJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.completed,
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 12,
  },
  closeJobBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  reassignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 10, paddingVertical: 13, marginBottom: 12,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  reassignBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  modalSub: { fontSize: 13, color: Colors.textLight, marginHorizontal: 20, marginBottom: 12 },
  searchRow2: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.screenBg,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 20, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.lightGray,
  },
  searchInput2: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  techPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  techPickAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  techPickAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  techPickName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, marginTop: 4 },
  eventDesc: { fontSize: 13, fontWeight: '600', color: Colors.text },
  eventMeta: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  closedBanner: {
    backgroundColor: Colors.completed + '15',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.completed,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  closedBannerText: { fontSize: 14, fontWeight: '700', color: Colors.completed },
  reviewRow: { marginTop: 10, gap: 4 },
  reviewCommentText: { fontSize: 12, color: Colors.darkGray, fontStyle: 'italic', lineHeight: 17 },
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
  tripTimeText: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
  tripDurationText: { fontSize: 11, color: Colors.accent, fontWeight: '600', marginTop: 2 },
  tripTimeBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, padding: 8, backgroundColor: Colors.screenBg, borderRadius: 8 },
  tripTimeBannerText: { fontSize: 12, color: Colors.textLight, flexShrink: 1 },
  tripRight: { alignItems: 'flex-end', gap: 8 },
  tripStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tripStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  tripActions: { flexDirection: 'row', gap: 12 },
  sigOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sigSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
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
  },
  approvalBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  sendBackBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendBackBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
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
  reviewModal: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 24, width: '100%',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  reviewModalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  reviewModalSub: { fontSize: 13, color: Colors.textLight, marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  reviewInput: {
    width: '100%', backgroundColor: Colors.screenBg, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text,
    minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.lightGray,
    marginBottom: 20,
  },
});
