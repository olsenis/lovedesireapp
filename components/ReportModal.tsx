import { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';
import type { ReportContentRef } from '../hooks/useReport';
import {
  submitReport,
  reportCategoryLabel,
  shouldPrecheckDisconnect,
  offersDisconnect,
  type ReportCategory,
} from '../services/reportService';

interface Props {
  contentRef: ReportContentRef | null;
  onClose: () => void;
  onSubmitted?: (result: { disconnected: boolean }) => void;
}

const CATEGORIES: ReportCategory[] = ['csam', 'ncii', 'harassment', 'other'];

export function ReportModal({ contentRef, onClose, onSubmitted }: Props) {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [detail, setDetail] = useState('');
  const [disconnect, setDisconnect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = !!contentRef;

  // Reset state when modal opens fresh
  useEffect(() => {
    if (visible) {
      setCategory(null);
      setDetail('');
      setDisconnect(false);
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  // When category is picked, pre-check disconnect for CSAM/NCII
  useEffect(() => {
    if (category) {
      setDisconnect(shouldPrecheckDisconnect(category));
    }
  }, [category]);

  const handleSubmit = async () => {
    if (!category || !contentRef) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitReport({
        ...contentRef,
        category,
        detail: detail.trim() || undefined,
        disconnect,
      });
      onSubmitted?.({ disconnected: result.disconnected });
      onClose();
    } catch (e: any) {
      const code = e?.code ?? 'internal';
      if (code === 'functions/resource-exhausted') {
        setError("You've submitted a lot of reports today. Try again tomorrow.");
      } else if (code === 'functions/invalid-argument') {
        setError('Something about this report is invalid. Please try again.');
      } else {
        setError("Couldn't submit the report. Please try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
            <Text style={styles.emoji}>🛡</Text>
            <Text style={styles.title}>Report content</Text>
            <Text style={styles.body}>
              This report goes to the Love Desire moderation team. We review reports within 24 hours and take proportionate action.
            </Text>

            <Text style={styles.section}>What kind of content?</Text>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.categoryRow, category === c && styles.categoryRowActive]}
                onPress={() => setCategory(c)}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityState={{ selected: category === c }}
              >
                <View style={[styles.radio, category === c && styles.radioActive]}>
                  {category === c && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>
                  {reportCategoryLabel(c)}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.section}>What happened? (optional)</Text>
            <TextInput
              style={styles.detailInput}
              value={detail}
              onChangeText={setDetail}
              placeholder="Anything the moderation team should know"
              placeholderTextColor={Colors.muted}
              multiline
              maxLength={1000}
              accessibilityLabel="Report detail (optional)"
            />

            {category && offersDisconnect(category) && (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDisconnect(!disconnect)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: disconnect }}
              >
                <View style={[styles.checkbox, disconnect && styles.checkboxActive]}>
                  {disconnect && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <View style={styles.checkboxTextWrap}>
                  <Text style={styles.checkboxLabel}>
                    {shouldPrecheckDisconnect(category)
                      ? 'Disconnect from your partner now'
                      : 'Also disconnect from your partner'}
                  </Text>
                  {shouldPrecheckDisconnect(category) && (
                    <Text style={styles.checkboxHint}>
                      We strongly recommend disconnecting immediately for content in this category.
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, (!category || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!category || submitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Submit report"
            >
              {submitting
                ? <ActivityIndicator color={Colors.cream} />
                : <Text style={styles.submitBtnText}>Submit report</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, width: '100%', maxWidth: 460, maxHeight: '90%', borderWidth: 1, borderColor: Colors.border },
  scrollContent: { padding: Spacing.xl, gap: Spacing.md },
  emoji: { fontSize: 40, textAlign: 'center' },
  title: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy, textAlign: 'center' },
  body: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 21, textAlign: 'center' },
  section: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.burgundy, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  categoryRowActive: { borderColor: Colors.burgundy, backgroundColor: Colors.blush },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.burgundy },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.burgundy },
  categoryText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, flex: 1 },
  categoryTextActive: { fontFamily: Fonts.bodyBold, color: Colors.burgundy },
  detailInput: {
    fontFamily: Fonts.body, fontSize: 14, color: Colors.text,
    padding: Spacing.md, minHeight: 80, textAlignVertical: 'top',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.cream,
  },
  checkboxRow: {
    flexDirection: 'row', gap: Spacing.md,
    paddingVertical: Spacing.md, alignItems: 'flex-start',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.sm,
    borderWidth: 2, borderColor: Colors.muted,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: { backgroundColor: Colors.burgundy, borderColor: Colors.burgundy },
  checkboxTick: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.cream },
  checkboxTextWrap: { flex: 1 },
  checkboxLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.text, lineHeight: 20 },
  checkboxHint: { fontFamily: Fonts.bodyItalic, fontSize: 12, color: Colors.muted, marginTop: 4, lineHeight: 18 },
  error: { fontFamily: Fonts.body, fontSize: 13, color: '#C62828', textAlign: 'center', padding: Spacing.sm, backgroundColor: '#FFEBEE', borderRadius: Radius.sm },
  submitBtn: {
    backgroundColor: Colors.burgundy, paddingVertical: Spacing.md,
    borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm,
  },
  submitBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  cancelBtnText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
});
