import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TodoCategory } from '../services/todoService';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/fonts';
import { Radius, Spacing } from '../constants/spacing';

const CATEGORY_CONFIG: Record<TodoCategory, { label: string; emoji: string; color: string }> = {
  daily:    { label: 'Daily Life',  emoji: '🏠', color: '#FFF3E0' },
  dates:    { label: 'Date Ideas',  emoji: '💑', color: '#FCE4EC' },
  intimacy: { label: 'Intimacy',    emoji: '🔥', color: '#FCE4EC' },
  fantasy:  { label: 'Fantasy',     emoji: '💋', color: '#F3E5F5' },
  goals:    { label: 'Goals',       emoji: '🌟', color: '#FFF9C4' },
};

interface CategoryBadgeProps {
  category: TodoCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={styles.label}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    gap: 4,
    alignSelf: 'flex-start',
  },
  emoji: {
    fontSize: 12,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 0.3,
  },
});
