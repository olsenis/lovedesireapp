import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  // Show day + month only (used for birthday where year is irrelevant)
  hideYear?: boolean;
};

export function BrandDatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  maximumDate,
  minimumDate,
  hideYear = false,
}: Props) {
  const [show, setShow] = useState(false);

  const format = (d: Date) =>
    hideYear
      ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Web fallback uses native HTML5 date input; the community picker is mobile-only
  if (Platform.OS === 'web') {
    const iso = value ? value.toISOString().slice(0, 10) : '';
    const max = maximumDate ? maximumDate.toISOString().slice(0, 10) : undefined;
    const min = minimumDate ? minimumDate.toISOString().slice(0, 10) : undefined;
    return (
      // <input type="date"> is a web DOM element rendered fine via react-native-web; cast lets us pass DOM-only props.
      // @ts-ignore
      <input
        type="date"
        value={iso}
        max={max}
        min={min}
        onChange={(e: any) => {
          const v = e.target.value;
          if (v) onChange(new Date(v));
        }}
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 14,
          fontSize: 16,
          color: '#2A1820',
          border: '1px solid #F0D5DC',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  const handleChange = (_event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    // Android also fires onChange with type 'dismissed' when user cancels — guard for it
    if (date && _event.type !== 'dismissed') onChange(date);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => setShow(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={value ? format(value) : placeholder}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? format(value) : placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {show && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <DateTimePicker
                value={value ?? new Date()}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                themeVariant="light"
              />
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setShow(false)}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  value: { flex: 1, fontFamily: Fonts.body, fontSize: 16, color: Colors.text },
  placeholder: { flex: 1, fontFamily: Fonts.body, fontSize: 16, color: Colors.muted },
  icon: { fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  doneBtn: {
    backgroundColor: Colors.burgundy,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  doneBtnText: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.cream },
});
