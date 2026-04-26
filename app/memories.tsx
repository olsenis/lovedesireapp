import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { Memory, subscribeMemories, addMemory, deleteMemory } from '../services/memoryService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

export default function MemoriesScreen() {
  const { user, profile } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [photoURI, setPhotoURI] = useState<string | null>(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (!profile?.coupleId) return;
    return subscribeMemories(profile.coupleId, setMemories);
  }, [profile?.coupleId]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPhotoURI(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!photoURI || !profile?.coupleId || !user) return;
    await addMemory(profile.coupleId, photoURI, caption.trim(), user.uid);
    setPhotoURI(null); setCaption(''); setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete memory', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => profile?.coupleId && deleteMemory(profile.coupleId, id) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memories</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtn}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {memories.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>No memories yet</Text>
            <Text style={styles.emptyText}>Add photos from your favourite moments together</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.emptyBtnText}>Add first memory</Text>
            </TouchableOpacity>
          </View>
        )}

        {memories.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.card}
            onLongPress={() => handleDelete(m.id)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: m.photoURL }} style={styles.photo} contentFit="cover" />
            {m.caption ? (
              <View style={styles.captionRow}>
                <Text style={styles.captionText}>{m.caption}</Text>
              </View>
            ) : null}
            <Text style={styles.dateText}>
              {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a Memory</Text>

            <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
              {photoURI ? (
                <Image source={{ uri: photoURI }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoHint}>Tap to choose photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption... (optional)"
              placeholderTextColor={Colors.muted}
              value={caption}
              onChangeText={setCaption}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAdd(false); setPhotoURI(null); setCaption(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, !photoURI && styles.saveDisabled]} onPress={handleSave} disabled={!photoURI}>
                <Text style={styles.saveBtnText}>Save 📸</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  grid: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full },
  emptyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  photo: { width: '100%', height: 260 },
  captionRow: { padding: Spacing.md, paddingBottom: 0 },
  captionText: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text },
  dateText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  photoPicker: { borderRadius: Radius.lg, overflow: 'hidden', height: 200 },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, backgroundColor: Colors.blush, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg },
  photoIcon: { fontSize: 40 },
  photoHint: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted },
  captionInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
