import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DOMAINS, Domain, getDomainColor } from '@/types/domains';

type Props = {
  selected: Domain;
  onSelect: (domain: Domain) => void;
};

export default function DomainSelect({ selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {DOMAINS.map(domain => (
        <TouchableOpacity
          key={domain}
          style={[
            styles.chip,
            { borderColor: getDomainColor(domain) },
            selected === domain && styles.chipSelected
          ]}
          onPress={() => onSelect(domain)}
        >
          <Text style={[
            styles.chipText,
            { color: getDomainColor(domain) },
            selected === domain && styles.chipTextSelected
          ]}>
            {domain.charAt(0).toUpperCase() + domain.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginBottom: 16,
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