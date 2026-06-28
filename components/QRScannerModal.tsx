import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

// QR payload format the app produces: `desire-pair:CODE` where CODE is the
// 8-char invite code. The scanner accepts both the prefixed form AND raw
// 8-char codes (in case someone shares a QR generated externally).
const PREFIX = 'desire-pair:';

function extractCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.startsWith(PREFIX.toUpperCase())) {
    const code = trimmed.slice(PREFIX.length);
    return /^[A-Z0-9]{8}$/.test(code) ? code : null;
  }
  return /^[A-Z0-9]{8}$/.test(trimmed) ? trimmed : null;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
};

export function QRScannerModal({ visible, onClose, onCode }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState('');
  const scannedRef = useRef(false); // guard against double-fire on same QR

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      setError('');
    }
  }, [visible]);

  const handleScan = (result: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    const code = extractCode(result.data);
    if (!code) {
      setError("That doesn't look like a Desire invite code.");
      return;
    }
    scannedRef.current = true;
    onCode(code);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Close scanner">
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scan partner's code</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.body}>
          {!permission ? (
            <ActivityIndicator color={Colors.cream} />
          ) : !permission.granted ? (
            <View style={styles.permission}>
              <Text style={styles.permTitle}>Camera access needed</Text>
              <Text style={styles.permBody}>
                Allow Love Desire to use the camera so you can scan your partner's QR code instead of typing it.
              </Text>
              <TouchableOpacity style={styles.permBtn} onPress={requestPermission} accessibilityRole="button">
                <Text style={styles.permBtnText}>Grant access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleScan}
              />
              <View style={styles.reticle} pointerEvents="none" />
              <Text style={styles.hint}>Point at your partner's QR code</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Re-exported so screens building QR payloads use the same prefix without duplicating it.
export function buildQRPayload(code: string): string {
  return `${PREFIX}${code}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  close: { width: 60 },
  closeText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.cream },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.cream },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  camera: { ...StyleSheet.absoluteFillObject },
  reticle: {
    width: 240, height: 240,
    borderColor: Colors.rose, borderWidth: 3, borderRadius: Radius.lg,
  },
  hint: {
    position: 'absolute', bottom: 120,
    fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.cream,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
  },
  error: {
    position: 'absolute', bottom: 60,
    fontFamily: Fonts.bodyBold, fontSize: 14, color: '#fff',
    backgroundColor: Colors.error, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },

  permission: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  permTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.cream, textAlign: 'center' },
  permBody: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.cream, textAlign: 'center', lineHeight: 22, opacity: 0.8 },
  permBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full, marginTop: Spacing.md },
  permBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
