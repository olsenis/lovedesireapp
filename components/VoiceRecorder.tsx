import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import { VoicePlayer } from './VoicePlayer';

interface Props {
  // Called with the local file:// URI when recording stops. Parent uploads to storage.
  onRecorded: (uri: string) => void;
  // Called if the user clears the recording (parent should drop the URI).
  onCleared: () => void;
  // Current recorded URI, if any (parent-controlled so re-mounting doesn't lose state).
  currentUri: string | null;
  // Optional cap on recording duration in seconds. Default 120s (2 min).
  maxSeconds?: number;
}

/**
 * Reusable voice recording widget: start/stop button, playback preview, discard.
 * Handles microphone permission prompt and duration cap.
 *
 * States rendered:
 * - Idle:      "Tap to record" button
 * - Recording: "Recording XX:XX / Tap to stop" pulsing button + elapsed timer
 * - Recorded:  VoicePlayer for preview + "Discard" button + "Re-record" option
 *
 * Extracted from the recording UI in app/flashes.tsx so Love Notes voice-mode
 * composer can reuse the same widget. Same expo-audio recorder pattern, same
 * permission flow, same file:// output — only the parent's handling of the
 * finished URI differs (Flashes uploads immediately on Send, Notes buffers
 * until user hits Send).
 */
export function VoiceRecorder({ onRecorded, onCleared, currentUri, maxSeconds = 120 }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [starting, setStarting] = useState(false);

  // Auto-stop when maxSeconds reached — prevents users leaving the recorder
  // running for hours by accident. Uses recorderState.durationMillis which
  // ticks live from the recorder hook.
  useEffect(() => {
    if (!recorderState.isRecording) return;
    if (recorderState.durationMillis >= maxSeconds * 1000) {
      void stopRecording();
    }
  }, [recorderState.isRecording, recorderState.durationMillis, maxSeconds]);

  const startRecording = async () => {
    setStarting(true);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone access needed', 'Please allow microphone access in Settings.');
        setStarting(false);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      console.warn('Recording failed', e);
      Alert.alert('Could not start recording', 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) onRecorded(uri);
    } catch (e) {
      console.warn('Stop recording failed', e);
    }
  };

  const discard = () => {
    onCleared();
  };

  const formatDuration = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Recorded — show preview + clear
  if (currentUri) {
    return (
      <View style={styles.container}>
        <VoicePlayer uri={currentUri} size="large" />
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={discard} style={styles.secondaryBtn} accessibilityRole="button" accessibilityLabel="Discard recording">
            <Text style={styles.secondaryBtnText}>✕ Discard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Recording — pulsing stop button + timer
  if (recorderState.isRecording) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={stopRecording} style={styles.recordingPill} activeOpacity={0.85} accessibilityRole="button">
          <View style={styles.recordingDot} />
          <Text style={styles.recordingLabel}>Recording {formatDuration(recorderState.durationMillis)}</Text>
        </TouchableOpacity>
        <Text style={styles.recordingHint}>Tap to stop</Text>
      </View>
    );
  }

  // Idle
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={startRecording}
        disabled={starting}
        style={styles.recordBtn}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Start recording voice message"
      >
        <Text style={styles.recordBtnIcon}>🎤</Text>
        <Text style={styles.recordBtnText}>Tap to record</Text>
      </TouchableOpacity>
      <Text style={styles.recordHint}>Max {Math.floor(maxSeconds / 60)} min</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, alignItems: 'center' },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: Colors.burgundy,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  recordBtnIcon: { fontSize: 20 },
  recordBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  recordHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted },
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: '#C62828',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.cream,
  },
  recordingLabel: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  recordingHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: '#C62828' },
  actionRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  secondaryBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
});
