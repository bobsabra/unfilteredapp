import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { usePriorities } from '@/context/PrioritiesContext';
import { getDomainColor } from '@/types/domains';

type Props = {
  selectedId?: string;
  onSelect: (priorityId: string | undefined) => void;
};

export default function PrioritySelect({ selectedId, onSelect }: Props) {
  const { priorities } = usePriorities();
  const activePriorities = priorities.filter(p => p.status === 'active');

  if (activePriorities.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Link to Priority</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <TouchableOpacity
          style={[styles.chip, !selectedId && styles.chipSelected]}
          onPress={() => onSelect(undefined)}
        >
          <Text style={[styles.chipText, !selectedId && styles.chipTextSelected]}>None</Text>
        </TouchableOpacity>
        
        {activePriorities.map(priority => (
          <TouchableOpacity
            key={priority.id}
            style={[
              styles.chip,
              { borderColor: getDomainColor(priority.domain) },
              selectedId === priority.id && styles.chipSelected
            ]}
            onPress={() => onSelect(priority.id)}
          >
            <Text style={[
              styles.chipText,
              { color: getDomainColor(priority.domain) },
              selectedId === priority.id && styles.chipTextSelected
            ]}>
              {priority.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  scrollView: {
    flexGrow: 0,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
});