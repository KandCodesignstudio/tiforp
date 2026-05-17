import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../config/supabase';
import { Colors } from '../utils/colors';

export default function EditJobScreen({ route, navigation }) {
  const { job } = route.params;

  const [jobNumber, setJobNumber] = useState(job.jobNumber ?? '');
  const [description, setDescription] = useState(job.description ?? '');
  const [clientName, setClientName] = useState(job.client?.name ?? '');
  const [storeNumber, setStoreNumber] = useState(job.client?.storeNumber ?? '');
  const [address, setAddress] = useState(job.client?.address ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!jobNumber.trim() || !clientName.trim() || !address.trim() || !description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Job Number, Client Name, Address, and Description.');
      return;
    }

    const payload = {
      job_number: jobNumber.trim(),
      description: description.trim(),
      client: {
        name: clientName.trim().toUpperCase(),
        storeNumber: storeNumber.trim(),
        address: address.trim(),
      },
    };

    try {
      setSaving(true);
      const { error } = await supabase.from('jobs').update(payload).eq('id', job.id);
      if (error) throw error;
      navigation.goBack();
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

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
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
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
