import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../config/supabase';
import { useProfiles } from '../hooks/useProfiles';
import { Colors } from '../utils/colors';

export default function CreateJobScreen({ navigation }) {
  const { technicians, loading: loadingTechs } = useProfiles();

  const [jobNumber, setJobNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [storeNumber, setStoreNumber] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedTech, setSelectedTech] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!jobNumber.trim() || !clientName.trim() || !address.trim() || !description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Job Number, Client Name, Address, and Description.');
      return;
    }
    if (!selectedTech) {
      Alert.alert('No Technician', 'Please select a technician to assign this job to.');
      return;
    }

    const trip = {
      id: `trip_${Date.now()}`,
      tripNumber: 1,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: 'scheduled',
      scopeOfWork: scopeOfWork.trim(),
    };

    const job = {
      job_number: jobNumber.trim(),
      status: 'in_progress',
      technician_id: selectedTech.id,
      client: {
        name: clientName.trim().toUpperCase(),
        storeNumber: storeNumber.trim(),
        address: address.trim(),
      },
      description: description.trim(),
      trips: [trip],
      attachments: [],
      next_trip: trip.scheduledAt,
    };

    try {
      setSaving(true);
      const { error } = await supabase.from('jobs').insert(job);
      if (error) throw error;
      Alert.alert('Job Created', `Job ${jobNumber} assigned to ${selectedTech.full_name || selectedTech.email}.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.section}>Job Details</Text>

        <Text style={styles.label}>Job Number *</Text>
        <TextInput style={styles.input} value={jobNumber} onChangeText={setJobNumber} placeholder="e.g. 25S00113" placeholderTextColor={Colors.gray} />

        <Text style={styles.label}>Description *</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Describe the work to be done" placeholderTextColor={Colors.gray} multiline numberOfLines={3} />

        <Text style={styles.section}>Client Info</Text>

        <Text style={styles.label}>Client Name *</Text>
        <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="e.g. METRO RETAIL GROUP" placeholderTextColor={Colors.gray} />

        <Text style={styles.label}>Store / Unit Number</Text>
        <TextInput style={styles.input} value={storeNumber} onChangeText={setStoreNumber} placeholder="e.g. STORE #0089" placeholderTextColor={Colors.gray} />

        <Text style={styles.label}>Address *</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="123 Main St, City, TX 75001" placeholderTextColor={Colors.gray} />

        <Text style={styles.section}>Trip 1</Text>

        <Text style={styles.label}>Scheduled Date & Time</Text>
        <TextInput style={styles.input} value={scheduledAt} onChangeText={setScheduledAt} placeholder="YYYY-MM-DD HH:MM (e.g. 2026-06-15 09:00)" placeholderTextColor={Colors.gray} />

        <Text style={styles.label}>Scope of Work</Text>
        <TextInput style={[styles.input, styles.multiline]} value={scopeOfWork} onChangeText={setScopeOfWork} placeholder="List tasks, one per line" placeholderTextColor={Colors.gray} multiline numberOfLines={4} />

        <Text style={styles.section}>Assign Technician</Text>

        {loadingTechs ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} />
        ) : technicians.length === 0 ? (
          <Text style={styles.noTechs}>No technicians found. Make sure technician accounts have role = 'technician' in the profiles table.</Text>
        ) : (
          technicians.map((tech) => (
            <TouchableOpacity
              key={tech.id}
              style={[styles.techRow, selectedTech?.id === tech.id && styles.techRowSelected]}
              onPress={() => setSelectedTech(tech)}
            >
              <View style={styles.techAvatar}>
                <Text style={styles.techAvatarText}>
                  {(tech.full_name || tech.email || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.techName}>{tech.full_name || '(No name)'}</Text>
                <Text style={styles.techEmail}>{tech.email}</Text>
              </View>
              {selectedTech?.id === tech.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Create & Assign Job</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 20, paddingBottom: 48 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingBottom: 6,
  },
  label: { fontSize: 13, fontWeight: '600', color: Colors.darkGray, marginBottom: 4 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    gap: 12,
  },
  techRowSelected: { borderColor: Colors.accent, backgroundColor: '#EFF6FF' },
  techAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  techName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  techEmail: { fontSize: 12, color: Colors.textLight, marginTop: 1 },
  checkmark: { fontSize: 18, color: Colors.accent, fontWeight: '700' },
  noTechs: { fontSize: 13, color: Colors.textLight, fontStyle: 'italic', marginBottom: 16 },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
