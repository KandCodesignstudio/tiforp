import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import DateTimePickerField from '../components/DateTimePicker';
import { Colors } from '../utils/colors';

export default function CreateJobScreen({ navigation }) {
  const [jobNumber, setJobNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [storeNumber, setStoreNumber] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [scheduledAt, setScheduledAt] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [saving, setSaving] = useState(false);

  const addField = () =>
    setCustomFields((prev) => [...prev, { id: `cf_${Date.now()}`, label: '', value: '' }]);

  const updateField = (id, key, text) =>
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: text } : f)));

  const removeField = (id) =>
    setCustomFields((prev) => prev.filter((f) => f.id !== id));

  const handleSave = async () => {
    if (!jobNumber.trim() || !clientName.trim() || !address.trim() || !description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Job Number, Client Name, Address, and Description.');
      return;
    }

    const trip = {
      id: `trip_${Date.now()}`,
      tripNumber: 1,
      scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
      status: 'scheduled',
      scopeOfWork: scopeOfWork.trim(),
    };

    const filledFields = customFields.filter((f) => f.label.trim());

    const job = {
      job_number: jobNumber.trim(),
      status: 'in_progress',
      technician_id: null,
      metadata: { customFields: filledFields.map(({ label, value }) => ({ label: label.trim(), value: value.trim() })) },
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
      Alert.alert('Job Created', `Job ${jobNumber} created.`, [
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
        <DateTimePickerField
          value={scheduledAt}
          onChange={setScheduledAt}
          placeholder="Tap to select date & time"
        />

        <Text style={styles.label}>Scope of Work</Text>
        <TextInput style={[styles.input, styles.multiline]} value={scopeOfWork} onChangeText={setScopeOfWork} placeholder="List tasks, one per line" placeholderTextColor={Colors.gray} multiline numberOfLines={4} />

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Custom Fields</Text>
        </View>

        {customFields.map((field) => (
          <View key={field.id} style={styles.fieldRow}>
            <TextInput
              style={[styles.input, styles.fieldLabel]}
              value={field.label}
              onChangeText={(t) => updateField(field.id, 'label', t)}
              placeholder="Field name"
              placeholderTextColor={Colors.gray}
            />
            <TextInput
              style={[styles.input, styles.fieldValue]}
              value={field.value}
              onChangeText={(t) => updateField(field.id, 'value', t)}
              placeholder="Value"
              placeholderTextColor={Colors.gray}
            />
            <TouchableOpacity style={styles.fieldDelete} onPress={() => removeField(field.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addFieldBtn} onPress={addField}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
          <Text style={styles.addFieldText}>Add Field</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Create Job</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 20, paddingBottom: 48 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
    flex: 1,
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

  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  fieldLabel: { flex: 2, marginBottom: 10 },
  fieldValue: { flex: 3, marginBottom: 10 },
  fieldDelete: { paddingTop: 12 },

  addFieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, marginBottom: 4,
  },
  addFieldText: { fontSize: 14, fontWeight: '600', color: Colors.accent },

  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
