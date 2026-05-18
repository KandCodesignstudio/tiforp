import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { supabase } from '../config/supabase';
import { useProfiles } from '../hooks/useProfiles';
import { Colors } from '../utils/colors';

const KNOWN_COLUMNS = new Set([
  'job_number', 'client_name', 'store_number', 'address', 'description',
  'scheduled_at', 'scope_of_work', 'technician_email',
]);

function buildJob(row, techByEmail) {
  const metadata = {};
  for (const key of Object.keys(row)) {
    if (!KNOWN_COLUMNS.has(key) && row[key] != null && row[key] !== '') {
      metadata[key] = row[key];
    }
  }

  const trip = {
    id: `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tripNumber: 1,
    status: 'scheduled',
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
    scopeOfWork: (row.scope_of_work ?? '').trim(),
  };

  const techEmail = (row.technician_email ?? '').trim().toLowerCase();
  const tech = techEmail ? techByEmail[techEmail] : null;

  return {
    job: {
      job_number: (row.job_number ?? '').trim(),
      status: 'in_progress',
      technician_id: tech?.id ?? null,
      client: {
        name: (row.client_name ?? '').trim().toUpperCase(),
        storeNumber: (row.store_number ?? '').trim(),
        address: (row.address ?? '').trim(),
      },
      description: (row.description ?? '').trim(),
      trips: [trip],
      attachments: [],
      next_trip: trip.scheduledAt,
      metadata,
    },
    techEmail,
    techMatched: !!tech,
  };
}

export default function ImportJobsScreen({ navigation }) {
  const { technicians, loading: loadingTechs } = useProfiles();
  const [rows, setRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const techByEmail = Object.fromEntries(
    (technicians ?? []).map((t) => [(t.email ?? '').toLowerCase(), t])
  );

  const pickAndParse = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setParsing(true);
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parsed = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      });

      if (parsed.errors?.length) {
        Alert.alert('Parse Warning', parsed.errors[0].message);
      }

      const built = parsed.data
        .map((r) => buildJob(r, techByEmail))
        .filter((b) => b.job.job_number);

      setRows(built);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => r.job.job_number && r.techMatched);
    if (!valid.length) {
      Alert.alert('Nothing to Import', 'No valid rows. Each row needs a job_number and a technician_email matching an existing technician.');
      return;
    }

    setImporting(true);
    try {
      const { error } = await supabase.from('jobs').insert(valid.map((v) => v.job));
      if (error) throw error;
      Alert.alert('Import Complete', `${valid.length} job${valid.length === 1 ? '' : 's'} created.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Import Failed', err.message);
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.filter((r) => r.techMatched && r.job.job_number).length;
  const invalidCount = rows.length - validCount;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>CSV Format</Text>
        <Text style={styles.helpText}>Required header row with these columns:</Text>
        <Text style={styles.code}>
          job_number, client_name, store_number, address, description, scheduled_at, scope_of_work, technician_email
        </Text>
        <Text style={styles.helpText}>
          Any extra columns you add will be saved automatically into the job's metadata — no code changes required.
        </Text>
        <Text style={styles.helpText}>
          • <Text style={styles.bold}>scheduled_at</Text> format: YYYY-MM-DD HH:MM (e.g. 2026-06-15 09:00){'\n'}
          • <Text style={styles.bold}>technician_email</Text> must match an existing technician account
        </Text>
      </View>

      <TouchableOpacity style={styles.pickBtn} onPress={pickAndParse} disabled={parsing || loadingTechs}>
        {parsing ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} />
            <Text style={styles.pickBtnText}>Choose CSV File</Text>
          </>
        )}
      </TouchableOpacity>

      {rows.length > 0 && (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              <Text style={styles.bold}>{validCount}</Text> valid
              {invalidCount > 0 && (
                <Text style={{ color: Colors.danger }}>  •  {invalidCount} skipped</Text>
              )}
            </Text>
          </View>

          {rows.map((r, idx) => (
            <View key={idx} style={[styles.row, !r.techMatched && styles.rowBad]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowJob}>{r.job.job_number || '(no job number)'}</Text>
                <Text style={styles.rowClient}>{r.job.client.name}</Text>
                <Text style={styles.rowMeta}>
                  {r.techMatched ? `→ ${r.techEmail}` : `⚠ tech not found: ${r.techEmail || '(empty)'}`}
                </Text>
                {Object.keys(r.job.metadata).length > 0 && (
                  <Text style={styles.rowExtras}>
                    +{Object.keys(r.job.metadata).length} extra field{Object.keys(r.job.metadata).length === 1 ? '' : 's'}
                  </Text>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.importBtn, validCount === 0 && styles.importBtnDisabled]}
            onPress={handleImport}
            disabled={importing || validCount === 0}
          >
            {importing ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.importBtnText}>Import {validCount} Job{validCount === 1 ? '' : 's'}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 20, paddingBottom: 48 },
  helpCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 20,
    borderLeftWidth: 4, borderLeftColor: Colors.accent,
  },
  helpTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  helpText: { fontSize: 13, color: Colors.darkGray, marginBottom: 8, lineHeight: 18 },
  code: {
    fontSize: 11, color: Colors.primary, backgroundColor: Colors.lightGray,
    padding: 8, borderRadius: 6, marginBottom: 8,
  },
  bold: { fontWeight: '700', color: Colors.text },
  pickBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  pickBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  summaryRow: { marginTop: 20, marginBottom: 8 },
  summaryText: { fontSize: 13, color: Colors.darkGray },
  row: {
    backgroundColor: Colors.white, borderRadius: 8, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: Colors.completed,
  },
  rowBad: { borderLeftColor: Colors.danger, opacity: 0.7 },
  rowJob: { fontSize: 14, fontWeight: '700', color: Colors.text },
  rowClient: { fontSize: 12, color: Colors.darkGray, marginTop: 2 },
  rowMeta: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
  rowExtras: { fontSize: 11, color: Colors.accent, marginTop: 2, fontStyle: 'italic' },
  importBtn: {
    backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  importBtnDisabled: { backgroundColor: Colors.gray },
  importBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
