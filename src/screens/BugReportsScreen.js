import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBugReports } from '../hooks/useBugReports';
import { Colors } from '../utils/colors';

function timeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ReportCard({ report, onResolve, onReopen }) {
  const isOpen = report.status === 'open';
  return (
    <View style={[styles.card, !isOpen && styles.cardResolved]}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: isOpen ? Colors.danger + '18' : Colors.success + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: isOpen ? Colors.danger : Colors.success }]} />
          <Text style={[styles.statusText, { color: isOpen ? Colors.danger : Colors.success }]}>
            {isOpen ? 'Open' : 'Resolved'}
          </Text>
        </View>
        <Text style={styles.timeText}>{timeAgo(report.createdAt)}</Text>
      </View>

      <Text style={styles.reporterName}>{report.reporterName}</Text>
      {!!report.reporterEmail && (
        <Text style={styles.reporterEmail}>{report.reporterEmail}</Text>
      )}

      <Text style={styles.description}>{report.description}</Text>

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: isOpen ? Colors.success : Colors.gray }]}
        onPress={() => isOpen ? onResolve(report) : onReopen(report)}
      >
        <Ionicons name={isOpen ? 'checkmark-circle-outline' : 'refresh-outline'} size={15} color={Colors.white} />
        <Text style={styles.actionBtnText}>{isOpen ? 'Mark Resolved' : 'Reopen'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BugReportsScreen({ navigation }) {
  const { reports, loading, markResolved, markOpen, refresh } = useBugReports();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('open');

  const filtered = reports.filter((r) => filter === 'all' || r.status === filter);
  const openCount = reports.filter((r) => r.status === 'open').length;

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  const handleResolve = (report) => {
    Alert.alert('Mark as Resolved', `Mark this report from ${report.reporterName} as resolved?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', onPress: () => markResolved(report.id) },
    ]);
  };

  const handleReopen = (report) => markOpen(report.id);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>BUG REPORTS</Text>
          {openCount > 0 && (
            <Text style={styles.headerSub}>{openCount} open {openCount === 1 ? 'issue' : 'issues'}</Text>
          )}
        </View>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.filterRow}>
        {['open', 'resolved', 'all'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.accent} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReportCard report={item} onResolve={handleResolve} onReopen={handleReopen} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.lightGray} />
              <Text style={styles.emptyText}>
                {filter === 'open' ? 'No open bug reports!' : 'No reports here.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  header: {
    backgroundColor: Colors.primary, paddingTop: 50, paddingBottom: 16,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: 2, textAlign: 'center' },
  headerSub: { fontSize: 12, color: Colors.danger + 'cc', textAlign: 'center', fontWeight: '600', marginTop: 2 },

  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16,
    backgroundColor: Colors.screenBg, borderWidth: 1.5, borderColor: Colors.lightGray,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  filterTextActive: { color: Colors.primary },

  loader: { flex: 1, marginTop: 60 },
  list: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 3, borderLeftWidth: 4, borderLeftColor: Colors.danger,
  },
  cardResolved: { borderLeftColor: Colors.success, opacity: 0.75 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  timeText: { fontSize: 11, color: Colors.gray },

  reporterName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  reporterEmail: { fontSize: 12, color: Colors.textLight, marginBottom: 10 },
  description: { fontSize: 14, color: Colors.darkGray, lineHeight: 20, marginBottom: 14 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 8, paddingVertical: 9,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.gray, fontWeight: '500' },
});
