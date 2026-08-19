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
  // 'date' (default) shows date only. 'datetime' also collects a time — iOS
  // uses a combined spinner; Android chains a date picker then a time picker;
  // web uses <input type="datetime-local">. 'time' shows time only — used by
  // Flirt Reminders where date doesn't matter, just HH:MM.
  mode?: 'date' | 'datetime' | 'time';
};

export function BrandDatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  maximumDate,
  minimumDate,
  hideYear = false,
  mode = 'date',
}: Props) {
  const [show, setShow] = useState(false);
  // Android needs two sequential dialogs for datetime — track which step and
  // hold the intermediate date so the time step can be merged onto it.
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');
  const [androidDate, setAndroidDate] = useState<Date | null>(null);

  const format = (d: Date) => {
    if (mode === 'time') {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (hideYear) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' });
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (mode === 'datetime') {
      const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${dateStr}, ${timeStr}`;
    }
    return dateStr;
  };

  // Web fallback uses native HTML5 input; the community picker is mobile-only
  if (Platform.OS === 'web') {
    const inputType = mode === 'datetime' ? 'datetime-local' : mode === 'time' ? 'time' : 'date';
    // <input type="time"> takes HH:MM strings; datetime + date use ISO slices.
    const webValue = mode === 'time' && value
      ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
      : value
        ? value.toISOString().slice(0, mode === 'datetime' ? 16 : 10)
        : '';
    const max = mode !== 'time' && maximumDate ? maximumDate.toISOString().slice(0, mode === 'datetime' ? 16 : 10) : undefined;
    const min = mode !== 'time' && minimumDate ? minimumDate.toISOString().slice(0, mode === 'datetime' ? 16 : 10) : undefined;
    return (
      // <input type="date"> is a web DOM element rendered fine via react-native-web; cast lets us pass DOM-only props.
      // @ts-ignore
      <input
        type={inputType}
        value={webValue}
        max={max}
        min={min}
        onChange={(e: any) => {
          const v = e.target.value;
          if (!v) return;
          if (mode === 'time') {
            // <input type="time"> emits HH:MM — merge onto today's date so
            // the caller receives a full Date object (their choice how to
            // extract HH:MM).
            const [hh, mm] = v.split(':').map(Number);
            const d = new Date();
            d.setHours(hh, mm, 0, 0);
            onChange(d);
          } else {
            onChange(new Date(v));
          }
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

  const openPicker = () => {
    setAndroidStep('date');
    setAndroidDate(null);
    setShow(true);
  };

  const closePicker = () => {
    setShow(false);
    setAndroidStep('date');
    setAndroidDate(null);
  };

  const handleIOSChange = (_event: { type: string }, date?: Date) => {
    if (date && _event.type !== 'dismissed') onChange(date);
  };

  const handleAndroidChange = (event: { type: string }, date?: Date) => {
    if (event.type === 'dismissed') {
      closePicker();
      return;
    }
    if (!date) {
      closePicker();
      return;
    }
    // For datetime, first dialog collects date; keep the picker open and swap
    // to time mode so the user immediately picks time. For date-only, we're done.
    if (mode === 'datetime' && androidStep === 'date') {
      setAndroidDate(date);
      setAndroidStep('time');
      return;
    }
    // datetime + time step: merge the picked time onto the stored date
    if (mode === 'datetime' && androidStep === 'time' && androidDate) {
      const merged = new Date(androidDate);
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
      onChange(merged);
    } else {
      onChange(date);
    }
    closePicker();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={openPicker}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={value ? format(value) : placeholder}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? format(value) : placeholder}
        </Text>
        <Text style={styles.icon}>{mode === 'time' ? '🕐' : '📅'}</Text>
      </TouchableOpacity>

      {show && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <DateTimePicker
                value={value ?? new Date()}
                mode={mode}
                display="spinner"
                onChange={handleIOSChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                themeVariant="light"
              />
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={closePicker}
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
          value={androidDate ?? value ?? new Date()}
          mode={mode === 'datetime' && androidStep === 'time' ? 'time' : 'date'}
          display="default"
          onChange={handleAndroidChange}
          maximumDate={androidStep === 'date' ? maximumDate : undefined}
          minimumDate={androidStep === 'date' ? minimumDate : undefined}
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
