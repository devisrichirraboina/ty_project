import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

// Module M2: Daily Mood Check using emoji-based self-reporting[cite: 1]
const MOODS = [
  { label: 'Happy', emoji: '😊' },
  { label: 'Calm', emoji: '😌' },
  { label: 'Sad', emoji: '😢' },
  { label: 'Anxious', emoji: '😰' },
  { label: 'Angry', emoji: '😠' },
];

export const MoodSelector = ({ onSelectMood }) => {
  const [selected, setSelected] = useState(0);

  const handleSelect = (idx, mood) => {
    setSelected(idx);
    if (onSelectMood) onSelectMood(mood);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Mood Check-in</Text>
      <View style={styles.moodRow}>
        {MOODS.map((item, idx) => {
          const isSelected = selected === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.moodCard, isSelected && styles.selectedCard]}
              onPress={() => handleSelect(idx, item)}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={[styles.label, isSelected && styles.selectedLabel]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, marginBottom: 10 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodCard: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#FFF',
    width: '18%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedCard: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  emoji: { fontSize: 24 },
  label: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  selectedLabel: { color: COLORS.primary, fontWeight: '700' },
});