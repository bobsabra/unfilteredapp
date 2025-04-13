import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Priority, PriorityDomain } from '@/types/priorities';
import {
  Briefcase,
  Heart,
  User,
  Wallet,
  Dumbbell,
  Church,
  X,
} from 'lucide-react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (priority: Omit<Priority, 'id' | 'createdAt'>) => void;
  initialValues?: Partial<Priority>;
};

const DOMAINS: { value: PriorityDomain; label: string; icon: React.ReactNode }[] = [
  { value: 'career', label: 'Career', icon: <Briefcase size={24} color="#4CAF50" /> },
  { value: 'relationships', label: 'Relationships', icon: <Heart size={24} color="#E91E63" /> },
  { value: 'personal', label: 'Personal', icon: <User size={24} color="#2196F3" /> },
  { value: 'finance', label: 'Finance', icon: <Wallet size={24} color="#FFC107" /> },
  { value: 'health', label: 'Health', icon: <Dumbbell size={24} color="#FF5722" /> },
  { value: 'spiritual', label: 'Spiritual', icon: <Church size={24} color="#9C27B0" /> },
];

export default function PriorityModal({ visible, onClose, onSave, initialValues }: Props) {
  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [domain, setDomain] = useState<PriorityDomain>(initialValues?.domain || 'personal');
  const [startDate, setStartDate] = useState(
    initialValues?.timeline?.start || new Date()
  );
  const [endDate, setEndDate] = useState(
    initialValues?.timeline?.end || new Date(Date.now() + 7776000000) // 90 days
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      domain,
      timeline: { start: startDate, end: endDate },
      status: 'active',
      linkedDecisions: [],
    });

    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {initialValues ? 'Edit Priority' : 'New Priority'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#fff" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="What's your priority?"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add more details..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Domain</Text>
              <View style={styles.domainGrid}>
                {DOMAINS.map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[
                      styles.domainButton,
                      domain === d.value && styles.domainButtonSelected,
                    ]}
                    onPress={() => setDomain(d.value)}
                  >
                    {d.icon}
                    <Text
                      style={[
                        styles.domainButtonText,
                        domain === d.value && styles.domainButtonTextSelected,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Timeline</Text>
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={styles.dateButtonLabel}>Start Date</Text>
                <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={styles.dateButtonLabel}>End Date</Text>
                <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>

              {(showStartPicker || showEndPicker) && Platform.OS === 'android' && (
                <DateTimePicker
                  value={showStartPicker ? startDate : endDate}
                  mode="date"
                  onChange={(event, date) => {
                    if (showStartPicker) {
                      setShowStartPicker(false);
                      if (date) setStartDate(date);
                    } else {
                      setShowEndPicker(false);
                      if (date) setEndDate(date);
                    }
                  }}
                  minimumDate={showEndPicker ? startDate : undefined}
                />
              )}

              {Platform.OS === 'ios' && (
                <Modal
                  visible={showStartPicker || showEndPicker}
                  transparent={true}
                  animationType="slide"
                >
                  <View style={styles.datePickerModal}>
                    <View style={styles.datePickerContent}>
                      <DateTimePicker
                        value={showStartPicker ? startDate : endDate}
                        mode="date"
                        display="spinner"
                        onChange={(event, date) => {
                          if (date) {
                            if (showStartPicker) {
                              setStartDate(date);
                            } else {
                              setEndDate(date);
                            }
                          }
                        }}
                        minimumDate={showEndPicker ? startDate : undefined}
                      />
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => {
                          setShowStartPicker(false);
                          setShowEndPicker(false);
                        }}
                      >
                        <Text style={styles.datePickerButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!title.trim()}
          >
            <Text style={styles.saveButtonText}>Save Priority</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '80%',
    padding: 20,
    ...(Platform.OS === 'ios' ? {
      paddingBottom: 34,
    } : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  domainButton: {
    width: '48%',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  domainButtonSelected: {
    backgroundColor: '#fff',
  },
  domainButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  domainButtonTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  dateButtonLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  datePickerButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});