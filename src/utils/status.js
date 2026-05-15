import { Colors } from './colors';

export const TRIP_STATUSES = {
  scheduled:   { label: 'SCHEDULED',   color: Colors.gray,       next: 'en_route',    nextLabel: 'On My Way' },
  en_route:    { label: 'EN ROUTE',    color: Colors.warning,    next: 'checked_in',  nextLabel: 'Check In' },
  checked_in:  { label: 'CHECKED IN',  color: Colors.accent,     next: 'checked_out', nextLabel: 'Check Out' },
  checked_out: { label: 'CHECKED OUT', color: Colors.primary,    next: 'completed',   nextLabel: 'Mark Complete' },
  completed:   { label: 'COMPLETED',   color: Colors.completed,  next: null,          nextLabel: null },
  for_return:  { label: 'FOR RETURN',  color: Colors.danger,     next: null,          nextLabel: null },
};

export const JOB_STATUSES = {
  in_progress:    { label: 'IN PROGRESS',    color: Colors.inProgress },
  completed:      { label: 'COMPLETED',      color: Colors.completed },
  needs_followup: { label: 'NEEDS FOLLOWUP', color: Colors.danger },
};

export function getTripStatus(status) {
  return TRIP_STATUSES[status] ?? TRIP_STATUSES.scheduled;
}

export function getJobStatus(status) {
  return JOB_STATUSES[status] ?? JOB_STATUSES.in_progress;
}

export function rollupJobStatus(trips = []) {
  if (trips.length === 0) return 'in_progress';
  if (trips.some((t) => t.status === 'for_return')) return 'needs_followup';
  if (trips.every((t) => t.status === 'completed')) return 'completed';
  return 'in_progress';
}
