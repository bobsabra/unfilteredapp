import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, CircleCheck as CheckCircle2, Circle, Brain } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useProfile } from '@/context/ProfileContext';
import { usePriorities } from '@/context/PrioritiesContext';
import PrioritySelect from '@/components/PrioritySelect';
import DomainSelect from '@/components/DomainSelect';
import { Domain } from '@/types/domains';
import { Event } from '@/types/events';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const params = useLocalSearchParams();
  const { profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: '',
    type: 'personal',
    date: selectedDate,
    priorityId: undefined,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(selectedDate);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadEvents();
    }, [])
  );

  useEffect(() => {
    if (params.addEvent === 'true' && params.eventTitle) {
      setNewEvent({
        title: params.eventTitle as string,
        type: 'personal',
        date: selectedDate,
      });
      setTempDate(selectedDate);
      setShowAddModal(true);
    }
  }, [params.addEvent, params.eventTitle]);

  const loadEvents = async () => {
    try {
      const savedEvents = await AsyncStorage.getItem('calendarEvents');
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents);
        setEvents(parsedEvents.map((event: any) => ({
          ...event,
          date: new Date(event.date)
        })));
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const saveEvent = async () => {
    if (!newEvent.title) return;

    const event: Event = {
      id: Math.random().toString(36).substring(7),
      title: newEvent.title,
      date: tempDate,
      type: newEvent.type as Domain || 'personal',
      description: newEvent.description,
      completed: false,
      priorityId: newEvent.priorityId,
    };

    try {
      const updatedEvents = [...events, event];
      await AsyncStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      setShowAddModal(false);
      setNewEvent({
        title: '',
        type: 'personal',
        date: selectedDate,
        priorityId: undefined,
      });
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const toggleEventCompletion = async (eventId: string) => {
    try {
      const updatedEvents = events.map(event => 
        event.id === eventId 
          ? { ...event, completed: !event.completed }
          : event
      );
      await AsyncStorage.setItem('calendarEvents', JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const renderCalendarDays = () => {
    const days = [];
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    // Add days from previous month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() - i - 1);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Add days of current month
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      days.push({ date: new Date(date), isCurrentMonth: true });
    }
    
    // Add days from next month
    const remainingDays = 42 - days.length; // 6 rows × 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(lastDay);
      date.setDate(date.getDate() + i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const isSelectedDate = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      if (showDatePicker) {
        // Preserve the time when changing date
        const newDate = new Date(selectedDate);
        newDate.setHours(tempDate.getHours(), tempDate.getMinutes());
        setTempDate(newDate);
      } else {
        // Preserve the date when changing time
        const newDate = new Date(tempDate);
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setTempDate(newDate);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            setNewEvent({ 
              title: '', 
              type: 'personal', 
              date: selectedDate,
              priorityId: undefined,
            });
            setTempDate(selectedDate);
            setShowAddModal(true);
          }}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setSelectedDate(newDate);
          }}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setSelectedDate(newDate);
          }}>
            <ChevronRight color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {DAYS.map(day => (
            <Text key={day} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {renderCalendarDays().map(({ date, isCurrentMonth }, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dayCell}
              onPress={() => setSelectedDate(date)}
            >
              <View style={[
                isSelectedDate(date) && styles.selectedDay,
              ]}>
                <Text style={[
                  styles.dayNumber,
                  !isCurrentMonth && styles.otherMonthDayText,
                  isSelectedDate(date) && styles.selectedDayText
                ]}>
                  {date.getDate()}
                </Text>
              </View>
              {hasEventsOnDate(date) && (
                <View style={[
                  styles.eventDot,
                  !isCurrentMonth && styles.otherMonthEventDot
                ]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.eventsSection}>
        <Text style={styles.eventsTitle}>
          Events for {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
        </Text>
        <ScrollView style={styles.eventsList}>
          {getEventsForDate(selectedDate).map(event => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventItem}
              onPress={() => toggleEventCompletion(event.id)}
            >
              <View style={[styles.eventColor, { backgroundColor: getEventColor(event.type) }]} />
              <View style={styles.eventContent}>
                <Text style={styles.eventTime}>
                  {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
              </View>
              {event.completed ? (
                <CheckCircle2 size={20} color="#4CAF50" />
              ) : (
                <Circle size={20} color="#666" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPress={() => Keyboard.dismiss()}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Event</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.titleInput}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
              placeholder="Event title"
              placeholderTextColor="#666"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <TextInput
              style={styles.descriptionInput}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
              placeholder="Description (optional)"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <DomainSelect
              selected={newEvent.type as Domain || 'personal'}
              onSelect={(domain) => setNewEvent(prev => ({ ...prev, type: domain }))}
            />

            <PrioritySelect
              selectedId={newEvent.priorityId}
              onSelect={(priorityId) => setNewEvent(prev => ({ ...prev, priorityId }))}
            />

            <TouchableOpacity
              style={styles.dateTimePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <CalendarIcon size={20} color="#fff" />
              <Text style={styles.dateTimeText}>
                {tempDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
              >
                <View style={styles.modalContainer}>
                  <View style={[styles.modalContent, { padding: 0 }]}>
                    <DateTimePicker
                      value={tempDate}
                      mode="datetime"
                      display="spinner"
                      onChange={handleDateChange}
                    />
                    <TouchableOpacity
                      style={[styles.addEventButton, { margin: 16 }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.addEventButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            ) : showDatePicker && (
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                is24Hour={true}
                display="spinner"
                onChange={handleDateChange}
              />
            )}

            <TouchableOpacity
              style={[styles.addEventButton, !newEvent.title && styles.addEventButtonDisabled]}
              onPress={saveEvent}
              disabled={!newEvent.title}
            >
              <Text style={styles.addEventButtonText}>Add Event</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const getEventColor = (type: Event['type']) => {
  switch (type) {
    case 'work':
      return '#4CAF50';
    case 'personal':
      return '#2196F3';
    case 'health':
      return '#FF9800';
    case 'social':
      return '#E91E63';
    default:
      return '#666';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#333',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 20,
    padding: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYear: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayNumber: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: '#666',
  },
  selectedDay: {
    backgroundColor: '#333',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
    marginTop: 4,
  },
  otherMonthEventDot: {
    backgroundColor: '#666',
  },
  eventsSection: {
    flex: 1,
    padding: 20,
  },
  eventsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  eventsList: {
    flex: 1,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  eventColor: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTime: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  titleInput: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  descriptionInput: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateTimePickerButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTimeText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  eventTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  eventTypeButtonSelected: {
    borderWidth: 0,
  },
  eventTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventTypeTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  addEventButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addEventButtonDisabled: {
    opacity: 0.5,
  },
  addEventButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});