import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { submitBugReport } from '../hooks/useBugReports';
import { Colors } from '../utils/colors';

const CATEGORIES = [
  { key: 'crash', label: 'App Crash / Freeze' },
  { key: 'wrong_data', label: 'Wrong or Missing Data' },
  { key: 'ui', label: 'Display / Layout Issue' },
  { key: 'feature', label: 'Feature Not Working' },
  { key: 'other', label: 'Other' },
];

export default function ReportBugScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Description required', 'Please describe what went wrong.');
      return;
    }
    const fullDescription = category
      ? `[${CATEGORIES.find((c) => c.key === category)?.label}]\n\n${description.trim()}`
      : description.trim();

    try {
      setSubmitting(true);
      await submitBugReport({
        userId: user?.id ?? null,
        reporterName: profile?.full_name ?? user?.email ?? 'Unknown',
        reporterEmail: user?.email ?? null,
        description: fullDescription,
      });
      Alert.alert(
        'Report Submitted',
        'Thank you! Your report has been sent to the admin.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.iconWrap}>
          <Ionicons name="bug-outline" size={40} color={Colors.danger} />
        </View>
        <Text style={styles.title}>Report a Bug</Text>
        <Text style={styles.subtitle}>Describe the issue and we'll look into it right away.</Text>

        <Text style={styles.label}>What type of issue is it?</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.categoryChip, category === c.key && styles.categoryChipActive]}
              onPress={() => setCategory(category === c.key ? null : c.key)}
            >
              <Text style={[styles.categoryText, category === c.key && styles.categoryTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Describe what happened *</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. I tapped Save on the Edit Job screen and got an error message that said..."
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/2000</Text>

        <View style={styles.reporterBox}>
          <Ionicons name="person-circle-outline" size={18} color={Colors.textLight} />
          <Text style={styles.reporterText}>
            Submitted as {profile?.full_name ?? user?.email ?? 'Unknown'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={Colors.white} />
            : (
              <>
                <Ionicons name="send-outline" size={18} color={Colors.white} />
                <Text style={styles.submitText}>Submit Report</Text>
              </>
            )
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 20, paddingBottom: 48 },

  iconWrap: { alignItems: 'center', marginTop: 8, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: '700', color: Colors.darkGray, marginBottom: 10 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.lightGray,
  },
  categoryChipActive: { borderColor: Colors.danger, backgroundColor: Colors.danger + '12' },
  categoryText: { fontSize: 13, fontWeight: '600', color: Colors.darkGray },
  categoryTextActive: { color: Colors.danger },

  input: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    fontSize: 14, color: Colors.text, minHeight: 140,
    borderWidth: 1, borderColor: Colors.lightGray, marginBottom: 6,
  },
  charCount: { fontSize: 11, color: Colors.gray, textAlign: 'right', marginBottom: 20 },

  reporterBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.lightGray, marginBottom: 24,
  },
  reporterText: { fontSize: 13, color: Colors.textLight, flex: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.danger, borderRadius: 12, paddingVertical: 15,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
