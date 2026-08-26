import { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Spacing, Radius } from '../constants/spacing';

interface Props {
  uri: string;
  // 'compact' = pill-style row (list/inline), 'large' = card-style with big play button (viewer/modal)
  size?: 'compact' | 'large';
  // Override display label when idle. Defaults to 'Voice note' / 'Tap to play'.
  idleLabel?: string;
}

/**
 * Reusable voice playback widget. Uses its own useAudioPlayer instance so
 * multiple players on the same screen don't collide. Handles playbackStatusUpdate
 * for the auto-reset-when-finished UX.
 *
 * Extracted from the FlashVoice widget in app/flashes.tsx so the same pattern
 * can be reused by Love Notes voice-mode reveal and any future voice surface.
 */
export function VoicePlayer({ uri, size = 'compact', idleLabel }: Props) {
  const player = useAudioPlayer(uri);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) setIsPlaying(false);
    });
    return () => sub.remove();
  }, [player]);

  const toggle = () => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      return;
    }
    // iOS defaults playsInSilentMode:false, so voice notes are silent
    // when the physical silent switch is engaged. Set it right before
    // playback (not at app startup — that triggers a "NONE" enum-freeze
    // crash in expo-audio 55). Fire-and-forget; no need to await
    // before firing play().
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player.seekTo(0);
    player.play();
    setIsPlaying(true);
  };

  const isLarge = size === 'large';
  const label = isPlaying
    ? isLarge ? 'Playing...' : 'Playing...'
    : idleLabel ?? (isLarge ? 'Tap to play' : 'Voice note');

  return (
    <TouchableOpacity
      onPress={toggle}
      style={[styles.player, isLarge && styles.playerLarge]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause voice message' : 'Play voice message'}
    >
      <View style={[styles.iconWrap, isLarge && styles.iconWrapLarge]}>
        <Text style={[styles.icon, isLarge && styles.iconLarge]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </View>
      <Text style={[styles.label, isLarge && styles.labelLarge]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.blush,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.rose,
    alignSelf: 'flex-start',
  },
  playerLarge: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  icon: {
    fontSize: 12,
    color: Colors.cream,
  },
  iconLarge: {
    fontSize: 20,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.burgundy,
  },
  labelLarge: {
    fontSize: 15,
  },
});
