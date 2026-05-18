import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '../hooks/useJobs';
import { useTechReviews } from '../hooks/useTechReviews';
import { Colors } from '../utils/colors';

function StarRow({ rating, size = 18 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={i <= Math.round(rating) ? '#F59E0B' : Colors.lightGray}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }) {
  const dateStr = review.createdAt
    ? review.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <StarRow rating={review.rating} size={14} />
        <Text style={styles.reviewDate}>{dateStr}</Text>
      </View>
      {!!review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}
      {!!review.reviewerName && (
        <Text style={styles.reviewerName}>— {review.reviewerName}</Text>
      )}
    </View>
  );
}

export default function TechProfileScreen({ route, navigation }) {
  const { technicianId, technicianName } = route.params;

  const { jobs, loading: loadingJobs } = useJobs({ isAdmin: true, userId: null, channelId: 'techprofile' });
  const { reviews, loading: loadingReviews, avgRating } = useTechReviews(technicianId);

  const techJobs = useMemo(() => {
    if (!technicianId) return jobs.filter((j) => j.technicianName?.trim() === technicianName?.trim());
    return jobs.filter((j) => j.technicianId === technicianId || j.technicianName?.trim() === technicianName?.trim());
  }, [jobs, technicianId, technicianName]);

  const stats = useMemo(() => {
    const total = techJobs.length;
    const completed = techJobs.filter((j) => j.status === 'completed' || j.status === 'closed').length;
    const active = techJobs.filter((j) => j.status === 'in_progress' || j.status === 'needs_followup').length;
    const pending = techJobs.filter((j) => j.status === 'pending_approval').length;
    return { total, completed, active, pending };
  }, [techJobs]);

  const initial = (technicianName ?? '?').charAt(0).toUpperCase();
  const loading = loadingJobs || loadingReviews;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TECHNICIAN</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={Colors.accent} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile hero */}
          <View style={styles.heroCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.heroName}>{technicianName ?? '—'}</Text>
            {avgRating !== null ? (
              <View style={styles.ratingRow}>
                <StarRow rating={avgRating} size={20} />
                <Text style={styles.ratingValue}>{avgRating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</Text>
              </View>
            ) : (
              <Text style={styles.noRating}>No reviews yet</Text>
            )}
          </View>

          {/* Stats */}
          <Text style={styles.sectionLabel}>JOB STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.accent }]}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#F97316' }]}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.warning }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.success }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
          </View>

          {/* Reviews */}
          <Text style={styles.sectionLabel}>REVIEWS</Text>
          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Ionicons name="star-outline" size={36} color={Colors.lightGray} />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map((r) => <ReviewCard key={r.id} review={r} />)
          )}

        </ScrollView>
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
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: 2 },

  loader: { flex: 1, marginTop: 60 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },

  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: Colors.white },
  heroName: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  ratingCount: { fontSize: 13, color: Colors.textLight },
  noRating: { fontSize: 14, color: Colors.gray, fontStyle: 'italic' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 12,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: Colors.lightGray,
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.textLight, marginTop: 2 },

  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  reviewDate: { fontSize: 11, color: Colors.gray },
  reviewComment: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 6 },
  reviewerName: { fontSize: 12, color: Colors.textLight, fontStyle: 'italic' },

  emptyReviews: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.gray },
});
