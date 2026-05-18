import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '../hooks/useJobs';
import { Colors } from '../utils/colors';

const DOT_COLORS = {
  scheduled: '#6B7280',
  en_route: '#F59E0B',
  checked_in: Colors.accent,
  checked_out: Colors.accent,
  completed: Colors.completed,
  for_return: Colors.danger,
  pending_approval: '#F59E0B',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  en_route: 'En Route',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  completed: 'Completed',
  for_return: 'For Return',
  pending_approval: 'Pend. Approval',
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(currentMonth) {
  const first = startOfMonth(currentMonth);
  const startDay = new Date(first);
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const days = [];
  const cursor = new Date(startDay);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function TripRow({ trip, job, onPress }) {
  const color = DOT_COLORS[trip.status] ?? Colors.gray;
  const label = STATUS_LABELS[trip.status] ?? trip.status;
  return (
    <TouchableOpacity style={styles.tripRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.statusPill, { backgroundColor: color + '22', borderColor: color }]}>
        <Text style={[styles.statusPillText, { color }]}>{label}</Text>
      </View>
      <View style={styles.tripRowMeta}>
        <Text style={styles.tripJobNumber}>{job.jobNumber}</Text>
        <Text style={styles.tripClientName} numberOfLines={1}>{job.client?.name ?? '—'}</Text>
      </View>
      <Text style={styles.tripNumber}>Trip {trip.tripNumber}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
    </TouchableOpacity>
  );
}

export default function CalendarScreen({ navigation }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const [refreshing, setRefreshing] = useState(false);

  const { jobs, loading, refresh } = useJobs({ isAdmin: true, userId: null, channelId: 'calendar' });

  const tripMap = useMemo(() => {
    const map = new Map();
    for (const job of jobs) {
      for (const trip of job.trips ?? []) {
        const key = toDateKey(trip.scheduledAt);
        if (!key) continue;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ trip, job });
      }
    }
    return map;
  }, [jobs]);

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const selectedKey = toDateKey(selectedDay);
  const selectedEntries = tripMap.get(selectedKey) ?? [];

  const onRefresh = () => {
    setRefreshing(true);
    Promise.resolve(refresh()).finally(() => setRefreshing(false));
  };

  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CALENDAR</Text>
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
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-back" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
              <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.dayHeaderRow}>
              {DAY_HEADERS.map((d) => (
                <View key={d} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={styles.gridContainer}>
              {calendarDays.map((day, idx) => {
                const key = toDateKey(day);
                const entries = tripMap.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const dots = entries.slice(0, 3);
                const overflow = entries.length > 3 ? entries.length - 3 : 0;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dayCell}
                    onPress={() => setSelectedDay(new Date(day))}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.dayNumberWrap,
                      isToday && styles.todayCircle,
                      isSelected && !isToday && styles.selectedCircle,
                    ]}>
                      <Text style={[
                        styles.dayNumber,
                        !isCurrentMonth && styles.dayNumberFaded,
                        isToday && styles.dayNumberToday,
                        isSelected && !isToday && styles.dayNumberSelected,
                      ]}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View style={styles.dotsRow}>
                      {dots.map((e, di) => (
                        <View
                          key={di}
                          style={[styles.dot, { backgroundColor: DOT_COLORS[e.trip.status] ?? Colors.gray }]}
                        />
                      ))}
                      {overflow > 0 && (
                        <Text style={styles.dotOverflow}>+{overflow}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailHeader}>
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>

            {selectedEntries.length === 0 ? (
              <View style={styles.noTrips}>
                <Ionicons name="calendar-outline" size={32} color={Colors.lightGray} />
                <Text style={styles.noTripsText}>No trips scheduled</Text>
              </View>
            ) : (
              selectedEntries.map(({ trip, job }, idx) => (
                <TripRow
                  key={`${job.id}-${trip.id ?? idx}`}
                  trip={trip}
                  job={job}
                  onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                />
              ))
            )}
          </View>
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
  loader: { flex: 1, marginTop: 60 },
  scrollContent: { paddingBottom: 40 },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  calendarCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    paddingBottom: 8,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 52,
  },
  dayNumberWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: Colors.accent,
  },
  selectedCircle: {
    backgroundColor: Colors.primary + '18',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  dayNumberFaded: {
    color: Colors.lightGray,
  },
  dayNumberToday: {
    color: Colors.white,
    fontWeight: '800',
  },
  dayNumberSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
    height: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotOverflow: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textLight,
  },

  detailCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  detailHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    marginBottom: 4,
  },
  noTrips: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  noTripsText: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tripRowMeta: {
    flex: 1,
    gap: 1,
  },
  tripJobNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  tripClientName: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tripNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray,
  },
});
