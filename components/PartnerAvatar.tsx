import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';

interface PartnerAvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
  style?: ViewStyle;
}

export function PartnerAvatar({ name, photoURL, size = 56, style }: PartnerAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: Colors.rose,
  },
  fallback: {
    backgroundColor: Colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  initials: {
    fontFamily: Fonts.heading,
    color: Colors.burgundy,
  },
});
