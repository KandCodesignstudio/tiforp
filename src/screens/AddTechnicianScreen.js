import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { STATIC_TECHNICIANS } from '../data/technicians';
import { Colors } from '../utils/colors';

export default function AddTechnicianScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    const q = fullName.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return STATIC_TECHNICIANS.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
  }, [fullName]);

  const pickSuggestion = (name) => {
    setFullName(name);
    setShowSuggestions(false);
  };

  const handleInvite = async () => {
    const name = fullName.trim();
    const emailLower = email.trim().toLowerCase();

    if (!name) {
      Alert.alert('Missing Name', 'Please enter the technician\'s full name.');
      return;
    }
    if (!emailLower || !emailLower.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!supabaseAdmin) {
      Alert.alert(
        'Not Configured',
        'Add EXPO_PUBLIC_SUPABASE_SERVICE_KEY to your .env file to enable technician invites.',
      );
      return;
    }

    try {
      setSaving(true);

      // Create the auth account and send the invite email
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        emailLower,
        { data: { full_name: name } },
      );
      if (inviteError) throw inviteError;

      const userId = data?.user?.id;
      if (!userId) throw new Error('No user ID returned from invite.');

      // Insert the profile row so the app recognizes them as a technician
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, full_name: name, role: 'technician' }, { onConflict: 'id' });
      if (profileError) throw profileError;

      Alert.alert(
        'Invite Sent!',
        `An invitation email was sent to ${emailLower}.\n\n${name} will tap the link in the email, set a password, and can then log in to the app.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.accent} style={{ marginTop: 1 }} />
          <Text style={styles.infoText}>
            The technician will receive an email with a link to set their password and log in to the app.
          </Text>
        </View>

        <Text style={styles.label}>Full Name *</Text>
        <View style={{ position: 'relative', zIndex: 10 }}>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={(v) => { setFullName(v); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="e.g. Ali Gholinasab"
            placeholderTextColor={Colors.gray}
            autoCorrect={false}
          />
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.dropdown}>
              {suggestions.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.dropdownItem}
                  onPress={() => pickSuggestion(name)}
                >
                  <Text style={styles.dropdownText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          onFocus={() => setShowSuggestions(false)}
          placeholder="technician@email.com"
          placeholderTextColor={Colors.gray}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="mail-outline" size={18} color={Colors.white} />
              <Text style={styles.inviteBtnText}>Send Invite</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What happens next</Text>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Technician receives an email from Supabase with a "Accept the invite" link.</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>They tap the link, set their password, and the account is activated.</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>They open the app, sign in with their email and new password.</Text>
          </View>
          <View style={[styles.step, { borderBottomWidth: 0 }]}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>4</Text></View>
            <Text style={styles.stepText}>Their name appears in the technician list when creating jobs.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: 20, paddingBottom: 48 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.accent + '15',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 19 },
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
  dropdown: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 100,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  dropdownText: { fontSize: 15, color: Colors.text },
  inviteBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  inviteBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  stepsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: Colors.textLight, lineHeight: 19 },
});
