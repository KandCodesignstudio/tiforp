import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Platform, Pressable,
} from 'react-native';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/colors';

function formatDisplay(date) {
  if (!date) return null;
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function DateTimePickerField({
  value,
  onChange,
  placeholder = 'Select date & time',
  minimumDate,
  style,
}) {
  const [show, setShow] = useState(false);
  const [androidMode, setAndroidMode] = useState('date');
  const [tempDate, setTempDate] = useState(null);

  const currentValue = value instanceof Date ? value : value ? new Date(value) : null;

  const handlePress = () => {
    if (Platform.OS === 'android') {
      setAndroidMode('date');
      setTempDate(null);
    }
    setShow(true);
  };

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (event.type === 'dismissed') { setTempDate(null); return; }
      if (androidMode === 'date') {
        const picked = selected ?? currentValue ?? new Date();
        setTempDate(picked);
        setAndroidMode('time');
        setShow(true);
      } else {
        const base = tempDate ?? currentValue ?? new Date();
        const t = selected ?? base;
        const combined = new Date(base);
        combined.setHours(t.getHours(), t.getMinutes(), 0, 0);
        onChange(combined);
        setTempDate(null);
      }
    } else {
      if (selected) onChange(selected);
    }
  };

  // Android uses native dialog — no modal needed
  if (Platform.OS === 'android') {
    return (
      <View style={style}>
        <TouchableOpacity style={styles.field} onPress={handlePress}>
          <Text style={currentValue ? styles.value : styles.placeholder}>
            {currentValue ? formatDisplay(currentValue) : placeholder}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={Colors.gray} />
        </TouchableOpacity>
        {show && (
          <RNDateTimePicker
            value={tempDate ?? currentValue ?? new Date()}
            mode={androidMode}
            display="default"
            onChange={handleChange}
            minimumDate={minimumDate}
          />
        )}
      </View>
    );
  }

  // iOS — bottom sheet modal with inline picker
  return (
    <View style={style}>
      <TouchableOpacity style={styles.field} onPress={handlePress}>
        <Text style={currentValue ? styles.value : styles.placeholder}>
          {currentValue ? formatDisplay(currentValue) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={Colors.gray} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShow(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Date & Time</Text>
            <TouchableOpacity onPress={() => setShow(false)} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
          <RNDateTimePicker
            value={currentValue ?? new Date()}
            mode="datetime"
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            style={{ width: '100%', height: 216, backgroundColor: Colors.white }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: 14,
  },
  value: { fontSize: 15, color: Colors.text },
  placeholder: { fontSize: 15, color: Colors.gray },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  doneBtn: { paddingHorizontal: 4 },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: Colors.accent },
});
