import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useProfiles } from '../hooks/useProfiles';
import { Colors } from '../utils/colors';

export default function EditJobScreen({ route, navigation }) {
  const { job } = route.params;
  const { technicians, loading: loadingTechs } = useProfiles();

  const [jobNumber, setJobNumber] = useState(job.jobNumber ?? '');
  const [description, setDescription] = useState(job.description ?? '');
  const [clientName, setClientName] = useState(job.client?.name ?? '');
  const [storeNumber, setStoreNumber] = useState(job.client?.storeNumber ?? '');
  const [address, setAddress] = useState(job.client?.address ?? '');
  const [selectedTech, setSelectedTech] = useState(() => {
    if (job.technicianId) {
      return { id: job.technicianId, full_name: job.technicianName ?? '', isStatic: false };
    }
    if (job.technicianName) {
      return { id: null, full_name: job.technicianName, isStatic: true };
    }
    return null;
  });
  const [techSearch, setTechSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredTechs = useMemo(() => {
    const q = techSearch.trim().toLowerCase();
    if (!q) return [];
    return technicians.filter((t) => (t.full_name ?? '').toLowerCase().includes(q));
  }, [technicians, techSearch]);

  const handleSave = async () => {
    if (!jobNumber.trim() || !clientName.trim() || !address.trim() || !description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Job Number, Client Name, Address, and Description.');
      return;
    }
    if (!selectedTech) {
      Alert.alert('No Technician', 'Please select a technician to assign this job to.');
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
      technician_id: selectedTech.isStatic ? null : selectedTech.id,
      metadata: { ...(job.metadata ?? {}), technicianName: selectedTech.full_name ?? null },
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

        <Text style={styles.section}>Assign Technician</Text>

        {selectedTech && (
          <View style={styles.selectedBanner}>
            <View style={styles.techAvatar}>
              <Text style={styles.techAvatarText}>{selectedTech.full_name[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.selectedName}>{selectedTech.full_name}</Text>
            <TouchableOpacity onPress={() => setSelectedTech(null)}>
              <Ionicons name="close-circle" size={20} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.gray} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={techSearch}
            onChangeText={setTechSearch}
            placeholder="Search technicians…"
            placeholderTextColor={Colors.gray}
            autoCorrect={false}
          />
          {techSearch.length > 0 && (
            <TouchableOpacity onPress={() => setTechSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        {loadingTechs ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} />
        ) : techSearch.trim().length === 0 ? null : filteredTechs.length === 0 ? (
          <Text style={styles.noTechs}>No technicians match "{techSearch}".</Text>
        ) : (
          filteredTechs.map((tech) => {
            const key = tech.id ?? tech.full_name;
            const isSelected = selectedTech
              ? (tech.id ? selectedTech.id === tech.id : selectedTech.full_name === tech.full_name)
              : false;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.techRow, isSelected && styles.techRowSelected]}
                onPress={() => { setSelectedTech(tech); setTechSearch(''); }}
              >
                <View style={styles.techAvatar}>
                  <Text style={styles.techAvatarText}>
                    {(tech.full_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.techName}>{tech.full_name || '(No name)'}</Text>
                  {tech.isStatic && <Text style={styles.techBadge}>Field tech</Text>}
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })
        )}

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
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    gap: 10,
  },
  selectedName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    gap: 12,
  },
  techRowSelected: { borderColor: Colors.accent, backgroundColor: '#EFF6FF' },
  techAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techAvatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  techName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  techBadge: { fontSize: 11, color: Colors.gray, marginTop: 1 },
  checkmark: { fontSize: 18, color: Colors.accent, fontWeight: '700' },
  noTechs: { fontSize: 13, color: Colors.gray, fontStyle: 'italic', marginBottom: 16 },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
