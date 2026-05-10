import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/useAuth';
import { Memory, subscribeMemories, addMemory, updateMemory, reactToMemory, deleteMemory } from '../services/memoryService';
import { uploadMemoryPhoto } from '../services/storageService';
import { useHelp } from '../hooks/useHelp';
import { HelpModal } from '../components/HelpModal';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

export default function MemoriesScreen() {
  const { user, profile } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const help = useHelp('memories');
  const [photoURI, setPhotoURI] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [memoryDate, setMemoryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<Memory | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [editDate, setEditDate] = useState('');
  const uid = user?.uid ?? '';

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

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Camera access needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPhotoURI(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!photoURI || !profile?.coupleId || !user) return;
    setUploading(true);
    try {
      const downloadURL = await uploadMemoryPhoto(profile.coupleId, user.uid, photoURI);
      await addMemory(profile.coupleId, downloadURL, caption.trim(), user.uid, memoryDate.trim() || undefined);
      setPhotoURI(null); setCaption(''); setMemoryDate(''); setShowAdd(false);
    } catch (e) {
      Alert.alert('Upload failed', 'Could not save the photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!profile?.coupleId || !viewing) return;
    await updateMemory(profile.coupleId, viewing.id, {
      caption: editCaption,
      memoryDate: editDate || undefined,
    });
    setViewing({ ...viewing, caption: editCaption, memoryDate: editDate || undefined });
    setEditingCaption(false);
  };

  const handleReact = async () => {
    if (!profile?.coupleId || !viewing) return;
    const hasReacted = viewing.reactions?.[uid] === '❤️';
    if (!hasReacted) {
      await reactToMemory(profile.coupleId, viewing.id, uid, '❤️');
      setViewing({ ...viewing, reactions: { ...(viewing.reactions ?? {}), [uid]: '❤️' } });
    }
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this memory?')) {
        profile?.coupleId && deleteMemory(profile.coupleId, id);
      }
    } else {
      Alert.alert('Delete memory', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => profile?.coupleId && deleteMemory(profile.coupleId, id) },
      ]);
    }
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
          <View key={m.id} style={styles.card}>
            <TouchableOpacity onPress={() => setViewing(m)} activeOpacity={0.9}>
              <Image source={{ uri: m.photoURL }} style={styles.photo} contentFit="cover" />
            </TouchableOpacity>
            <View style={styles.cardFooter}>
              <View style={styles.cardFooterRow}>
                {m.caption ? (
                  <Text style={[styles.captionText, { flex: 1 }]}>{m.caption}</Text>
                ) : (
                  <Text style={[styles.dateText, { flex: 1 }]}>
                    {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                )}
                <TouchableOpacity onPress={() => handleDelete(m.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.deleteTxt}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.dateText}>
                {m.memoryDate ?? new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a Memory</Text>

            {photoURI ? (
              <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
                <Image source={{ uri: photoURI }} style={styles.photoPreview} contentFit="cover" />
              </TouchableOpacity>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoOptionBtn} onPress={takePhoto}>
                  <Text style={styles.photoOptionEmoji}>📷</Text>
                  <Text style={styles.photoOptionText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoOptionBtn} onPress={pickPhoto}>
                  <Text style={styles.photoOptionEmoji}>🖼️</Text>
                  <Text style={styles.photoOptionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption... (optional)"
              placeholderTextColor={Colors.muted}
              value={caption}
              onChangeText={setCaption}
            />
            <TextInput
              style={styles.captionInput}
              placeholder="When was this? e.g. Summer 2023 (optional)"
              placeholderTextColor={Colors.muted}
              value={memoryDate}
              onChangeText={setMemoryDate}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAdd(false); setPhotoURI(null); setCaption(''); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, (!photoURI || uploading) && styles.saveDisabled]} onPress={handleSave} disabled={!photoURI || uploading}>
                <Text style={styles.saveBtnText}>{uploading ? 'Uploading…' : 'Save 📸'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen view */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => { setViewing(null); setEditingCaption(false); }}>
        <View style={styles.fullScreen}>
          <TouchableOpacity style={styles.fullScreenClose} onPress={() => { setViewing(null); setEditingCaption(false); }}>
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          {viewing && (
            <>
              <Image source={{ uri: viewing.photoURL }} style={styles.fullScreenImage} contentFit="contain" />
              <View style={styles.fullScreenFooter}>
                {editingCaption ? (
                  <>
                    <TextInput style={styles.fullScreenEditInput} value={editCaption} onChangeText={setEditCaption} placeholder="Caption..." placeholderTextColor="rgba(255,255,255,0.4)" multiline autoFocus />
                    <TextInput style={styles.fullScreenEditInput} value={editDate} onChangeText={setEditDate} placeholder="When was this?" placeholderTextColor="rgba(255,255,255,0.4)" />
                    <View style={styles.fullScreenEditBtns}>
                      <TouchableOpacity onPress={() => setEditingCaption(false)} style={styles.fullScreenCancelBtn}>
                        <Text style={styles.fullScreenCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleSaveEdit} style={styles.fullScreenSaveBtn}>
                        <Text style={styles.fullScreenSaveText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {viewing.caption ? <Text style={styles.fullScreenCaption}>{viewing.caption}</Text> : null}
                    <Text style={styles.fullScreenDate}>
                      {viewing.memoryDate ?? new Date(viewing.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.fullScreenActions}>
                      <TouchableOpacity onPress={handleReact} style={styles.fullScreenActionBtn}>
                        <Text style={styles.fullScreenActionText}>
                          {viewing.reactions?.[uid] ? '❤️' : '🤍'} {Object.keys(viewing.reactions ?? {}).length || ''}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setEditCaption(viewing.caption); setEditDate(viewing.memoryDate ?? ''); setEditingCaption(true); }} style={styles.fullScreenActionBtn}>
                        <Text style={styles.fullScreenActionText}>✏️ Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      <HelpModal
        visible={help.visible}
        title="Memories"
        description="A private shared photo album, only the two of you can see it."
        tips={[
          'Tap + Add to add a photo with an optional caption',
          'Tap ✕ to delete a memory',
          'Photos are private, not visible to anyone else',
        ]}
        onDismiss={help.dismiss}
        onDismissAll={help.dismissAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { width: 60 },
  backText: { fontFamily: Fonts.body, fontSize: 16, color: Colors.burgundy },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.burgundy },
  addBtn: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.burgundy },

  grid: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, paddingTop: Spacing.md },

  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontFamily: Fonts.heading, fontSize: 24, color: Colors.text },
  emptyText: { fontFamily: Fonts.bodyItalic, fontSize: 14, color: Colors.muted, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.burgundy, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.full },
  emptyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.burgundy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  photo: { width: '100%', height: 280 },
  cardFooter: { padding: Spacing.md, gap: 4 },
  captionText: { fontFamily: Fonts.bodyItalic, fontSize: 15, color: Colors.text },
  dateText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  deleteBtn: { padding: 2 },
  deleteTxt: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },

  fullScreen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  fullScreenClose: { position: 'absolute', top: 56, right: Spacing.lg, zIndex: 10, padding: Spacing.sm },
  fullScreenCloseText: { color: Colors.white, fontSize: 22, fontFamily: Fonts.body },
  fullScreenImage: { width: '100%', height: '75%' },
  fullScreenFooter: { padding: Spacing.lg, gap: 4 },
  fullScreenCaption: { fontFamily: Fonts.bodyItalic, fontSize: 16, color: Colors.white, textAlign: 'center' },
  fullScreenDate: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  fullScreenActions: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.sm },
  fullScreenActionBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  fullScreenActionText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
  fullScreenEditInput: { fontFamily: Fonts.body, fontSize: 15, color: Colors.white, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingVertical: Spacing.sm, textAlign: 'center' },
  fullScreenEditBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  fullScreenCancelBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  fullScreenCancelText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  fullScreenSaveBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  fullScreenSaveText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.cream, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalTitle: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.burgundy },
  photoPicker: { borderRadius: Radius.lg, overflow: 'hidden', height: 200 },
  photoPreview: { width: '100%', height: '100%' },
  photoButtons: { flexDirection: 'row', gap: Spacing.md, height: 120 },
  photoOptionBtn: { flex: 1, backgroundColor: Colors.blush, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  photoOptionEmoji: { fontSize: 36 },
  photoOptionText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.burgundy },
  captionInput: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  modalBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.muted },
  saveBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full, backgroundColor: Colors.burgundy },
  saveDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.cream },
});
