import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, RefreshControl, StatusBar, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../hooks/useJobs';
import { useNotificationInbox } from '../hooks/useNotificationInbox';
import { supabase } from '../config/supabase';
import { Colors } from '../utils/colors';
import { getJobStatus } from '../utils/status';
import { getRandomMessage } from '../utils/motivationalMessages';

function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function StarRow({ rating }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= Math.round(rating) ? 'star' : 'star-outline'} size={13} color={i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'} />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function JobCard({ job, onPress, showPayment, rating }) {
  const statusInfo = getJobStatus(job.status);
  const tripCount = job.trips?.length ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{job.client?.name}</Text>
        <Text style={styles.jobNumber}>{job.jobNumber}</Text>
      </View>
      <Text style={styles.address}>{job.client?.address}</Text>
      {/* Admin: show assigned tech name + rating inline */}
      {showPayment && job.technicianName && (
        <View style={styles.techNameRow}>
          <Ionicons name="person-outline" size={12} color={Colors.textLight} />
          <Text style={styles.techNameText}>{job.technicianName}</Text>
          {rating != null && <StarRow rating={rating} />}
        </View>
      )}
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
          {/* Tech: show admin rating below trip info for closed jobs */}
          {!showPayment && rating != null && <StarRow rating={rating} />}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>
      {showPayment && (
        <View style={styles.paymentRow}>
          <View style={[styles.payChip, { backgroundColor: (job.clientPaid ? Colors.completed : Colors.warning) + '15' }]}>
            <Ionicons name={job.clientPaid ? 'checkmark-circle' : 'time-outline'} size={12} color={job.clientPaid ? Colors.completed : Colors.warning} />
            <Text style={[styles.payChipText, { color: job.clientPaid ? Colors.completed : Colors.warning }]}>
              CLIENT {job.clientPaid ? 'PAID' : 'UNPAID'}
            </Text>
          </View>
          <View style={[styles.payChip, { backgroundColor: (job.techPaid ? Colors.completed : Colors.warning) + '15' }]}>
            <Ionicons name={job.techPaid ? 'checkmark-circle' : 'time-outline'} size={12} color={job.techPaid ? Colors.completed : Colors.warning} />
            <Text style={[styles.payChipText, { color: job.techPaid ? Colors.completed : Colors.warning }]}>
              TECH {job.techPaid ? 'PAID' : 'UNPAID'}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'needs_followup', label: 'For Return' },
  { key: 'pending_approval', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Closed', adminOnly: true },
  { key: 'unpaid', label: 'Unpaid', adminOnly: true },
];

export default function JobsScreen({ navigation }) {
  const { logout, user, profile, isAdmin } = useAuth();
  const { jobs, loading, refresh } = useJobs({ isAdmin, userId: user?.id, channelId: 'list' });
  const { unreadCount } = useNotificationInbox(user?.id, 'badge');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const firstName = (profile?.full_name?.trim().split(/\s+/)[0]) || (user?.email?.split('@')[0]) || 'there';
  const [motivationalMessage, setMotivationalMessage] = useState(() => getRandomMessage());
  const [reviewMap, setReviewMap] = useState({});

  useEffect(() => {
    supabase.from('tech_reviews').select('job_id, rating').then(({ data }) => {
      if (!data) return;
      const map = {};
      for (const r of data) map[r.job_id] = r.rating;
      setReviewMap(map);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh?.();
    }, [refresh])
  );

  const visibleFilters = FILTERS.filter((f) => !f.adminOnly || isAdmin);

  const filteredJobs = jobs.filter((j) => {
    const matchesFilter = (() => {
      if (filter === 'all') return true;
      if (filter === 'unpaid') return !j.clientPaid || !j.techPaid;
      return j.status === filter;
    })();
    if (!matchesFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        (j.jobNumber ?? '').toLowerCase().includes(q) ||
        (j.client?.name ?? '').toLowerCase().includes(q) ||
        (j.client?.address ?? '').toLowerCase().includes(q) ||
        (j.technicianName ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inProgress = filteredJobs.filter((j) => j.status === 'in_progress' || j.status === 'needs_followup');
  const pendingApproval = filteredJobs.filter((j) => j.status === 'pending_approval');
  const completed = filteredJobs.filter((j) => j.status === 'completed');
  const closed = filteredJobs.filter((j) => j.status === 'closed');
  const other = filteredJobs.filter((j) =>
    !['in_progress', 'needs_followup', 'pending_approval', 'completed', 'closed'].includes(j.status)
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  const sections = [
    ...(inProgress.length > 0 ? [{ type: 'section-header', label: 'Active', key: 'h_inprogress' }] : []),
    ...inProgress.map((j) => ({ type: 'job', ...j, key: j.id })),
    ...(pendingApproval.length > 0 ? [{ type: 'section-header', label: 'Pending Approval', key: 'h_pending' }] : []),
    ...pendingApproval.map((j) => ({ type: 'job', ...j, key: j.id })),
    ...(other.length > 0 ? [{ type: 'section-header', label: 'Scheduled', key: 'h_other' }] : []),
    ...other.map((j) => ({ type: 'job', ...j, key: j.id })),
    ...(completed.length > 0 ? [{ type: 'section-header', label: 'Completed', key: 'h_completed' }] : []),
    ...completed.map((j) => ({ type: 'job', ...j, key: j.id })),
    ...(closed.length > 0 ? [{ type: 'section-header', label: 'Closed', key: 'h_closed' }] : []),
    ...closed.map((j) => ({ type: 'job', ...j, key: j.id })),
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
        showPayment={isAdmin}
        rating={reviewMap[item.id] ?? null}
        onPress={() => navigation.navigate('JobDetail', {
          jobId: item.id,
          job: {
            ...item,
            nextTrip: item.nextTrip?.toISOString?.() ?? null,
            createdAt: item.createdAt?.toISOString?.() ?? null,
            trips: item.trips?.map(t => ({
              ...t,
              scheduledAt: t.scheduledAt?.toISOString?.() ?? null,
            })) ?? [],
          },
        })}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>JOBS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdmin && (
            <>
              <TouchableOpacity
                onPress={() => Alert.alert('Admin', null, [
                  { text: 'Dashboard', onPress: () => navigation.navigate('Dashboard') },
                  { text: 'Bug Reports', onPress: () => navigation.navigate('BugReports') },
                  { text: 'Add Technician', onPress: () => navigation.navigate('AddTechnician') },
                  { text: 'Import Jobs (CSV)', onPress: () => navigation.navigate('ImportJobs') },
                  { text: 'Report a Bug', onPress: () => navigation.navigate('ReportBug') },
                  { text: 'Cancel', style: 'cancel' },
                ])}
                style={styles.logoutBtn}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Calendar')} style={styles.logoutBtn}>
                <Ionicons name="calendar-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('CreateJob')} style={styles.logoutBtn}>
                <Ionicons name="add-circle-outline" size={26} color={Colors.white} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={() => {
              if (showSearch) setSearchQuery('');
              setShowSearch((v) => !v);
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name={showSearch ? 'close-outline' : 'search-outline'} size={24} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.logoutBtn}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.logoutBtn}>
            <Ionicons name="person-circle-outline" size={26} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {!isAdmin && (
        <View style={styles.greetingCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingHi}>Hi, {firstName}!</Text>
            <Text style={styles.greetingMsg}>{motivationalMessage}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('ReportBug')}
            style={styles.bugBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="bug-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.gray} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by job #, client, or address…"
            placeholderTextColor={Colors.textLight}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {visibleFilters.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>


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
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No jobs match your search.' : 'No jobs match this filter.'}
            </Text>
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
  logoutBtn: { padding: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: Colors.danger ?? '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '800' },
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
  address: { fontSize: 13, color: Colors.textLight, marginBottom: 6 },
  techNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  techNameText: { fontSize: 12, color: Colors.textLight, flex: 1 },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#F59E0B', marginLeft: 3 },
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
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.darkGray },
  filterTextActive: { color: Colors.white },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  payChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  greetingCard: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingHi: { fontSize: 17, fontWeight: '800', color: Colors.primary, marginBottom: 2 },
  greetingMsg: { fontSize: 14, color: Colors.text, fontStyle: 'italic' },
  bugBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.danger + '12',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    margin: 0,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
});
