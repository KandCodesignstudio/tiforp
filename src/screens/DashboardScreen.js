import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '../hooks/useJobs';
import { Colors } from '../utils/colors';

function isThisMonth(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function StatCard({ label, value, color, iconName }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={styles.statCardInner}>
        <View>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
        <View style={[styles.statIconCircle, { backgroundColor: color + '18' }]}>
          <Ionicons name={iconName} size={20} color={color} />
        </View>
      </View>
    </View>
  );
}

function TechRow({ name, count, index }) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  return (
    <View style={styles.techRow}>
      <View style={styles.techAvatar}>
        <Text style={styles.techInitial}>{initial}</Text>
      </View>
      <Text style={styles.techName} numberOfLines={1}>{name}</Text>
      <View style={styles.techCountBadge}>
        <Text style={styles.techCountText}>{count}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { jobs, loading, refresh } = useJobs({ isAdmin: true, userId: null, channelId: 'dashboard' });
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => j.status === 'in_progress' || j.status === 'needs_followup').length;
    const pendingApproval = jobs.filter((j) => j.status === 'pending_approval').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const closed = jobs.filter((j) => j.status === 'closed').length;
    const unpaid = jobs.filter((j) => j.status === 'completed' && (!j.clientPaid || !j.techPaid)).length;
    const thisMonth = jobs.filter((j) => isThisMonth(j.createdAt)).length;
    return { total, active, pendingApproval, completed, closed, unpaid, thisMonth };
  }, [jobs]);

  const topTechs = useMemo(() => {
    const counts = {};
    for (const job of jobs) {
      const name = job.technicianName?.trim() || null;
      if (!name) continue;
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [jobs]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DASHBOARD</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.accent} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Section label */}
          <Text style={styles.sectionLabel}>OVERVIEW</Text>

          {/* Stat cards — 2-column grid */}
          <View style={styles.statsGrid}>
            <StatCard label="Total Jobs" value={stats.total} color={Colors.accent} iconName="briefcase-outline" />
            <StatCard label="Active" value={stats.active} color="#F97316" iconName="flash-outline" />
            <StatCard label="Pending Approval" value={stats.pendingApproval} color={Colors.warning} iconName="hourglass-outline" />
            <StatCard label="Completed" value={stats.completed} color={Colors.completed} iconName="checkmark-circle-outline" />
            <StatCard label="Closed" value={stats.closed} color={Colors.gray} iconName="lock-closed-outline" />
            <StatCard label="Unpaid" value={stats.unpaid} color={Colors.danger} iconName="card-outline" />
            <StatCard label="This Month" value={stats.thisMonth} color="#8B5CF6" iconName="calendar-outline" />
          </View>

          {/* Top Technicians */}
          <Text style={styles.sectionLabel}>TOP TECHNICIANS</Text>
          <View style={styles.techCard}>
            {topTechs.length === 0 ? (
              <Text style={styles.emptyText}>No technician data available.</Text>
            ) : (
              topTechs.map(([name, count], index) => (
                <React.Fragment key={name}>
                  <TechRow name={name} count={count} index={index} />
                  {index < topTechs.length - 1 && <View style={styles.techDivider} />}
                </React.Fragment>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },

  /* Header */
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
  },

  loader: {
    flex: 1,
    marginTop: 60,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* Section labels */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 12,
  },

  /* Stats grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statCardInner: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Technicians card */
  techCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  techAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  techInitial: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  techName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  techCountBadge: {
    backgroundColor: Colors.accent + '18',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: 'center',
  },
  techCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  techDivider: {
    height: 1,
    backgroundColor: Colors.lightGray,
  },

  emptyText: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: 14,
    paddingVertical: 20,
  },
});
