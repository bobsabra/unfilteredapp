// This file represents the fully corrected version of your Daily Clarity screen (index.tsx)

import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Brain, CircleCheck as CheckCircle2, Circle, Calendar as CalendarIcon } from 'lucide-react-native';
import { DailyEntry, DailyHistory } from '@/types/daily-clarity';
import { router } from 'expo-router';
import { useProfile } from '@/context/ProfileContext';
import OpenAIService from '@/services/openai';

export default function DailyClarity() {
  const [mainTask, setMainTask] = useState('');
  const [blocker, setBlocker] = useState('');
  const [boldMove, setBoldMove] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<{ text: string; completed: boolean }[]>([]);
  const [history, setHistory] = useState<DailyHistory>([]);
  const [todayEntry, setTodayEntry] = useState<DailyEntry | null>(null);
  const { profile } = useProfile();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('dailyHistory');
      if (savedHistory) {
        const parsedHistory: DailyHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        const existingEntry = parsedHistory.find(entry => {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === todayTimestamp;
        });

        if (existingEntry) {
          setTodayEntry(existingEntry);
          setMainTask(existingEntry.mainTask);
          setBlocker(existingEntry.blocker);
          setBoldMove(existingEntry.boldMove);
          if (existingEntry.insights) {
            setInsights(existingEntry.insights.map(insight =>
              typeof insight === 'string'
                ? { text: insight, completed: false }
                : insight
            ));
          }
        }
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setError('Failed to load history');
    }
  };

  const saveToHistory = async (entry: DailyEntry) => {
    try {
      let updatedHistory = [...history];
      const existingIndex = history.findIndex(e => e.id === entry.id);

      if (existingIndex >= 0) {
        updatedHistory[existingIndex] = entry;
      } else {
        updatedHistory = [entry, ...history];
      }

      await AsyncStorage.setItem('dailyHistory', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
      setTodayEntry(entry);
    } catch (error) {
      console.error('Error saving to history:', error);
      setError('Failed to save entry');
    }
  };

  const handleSubmit = async () => {
    if (!mainTask.trim() || !blocker.trim() || !boldMove.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields to get clarity.');
      return;
    }

    if (!profile?.openai?.assistantId || !profile?.openai?.threadId) {
      Alert.alert('Error', 'Please ensure your profile is set up properly.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const openAIService = OpenAIService.getInstance();
      const message = `Main Task: ${mainTask}\nBlocker: ${blocker}\nBold Move: ${boldMove}`;
      // removed call to stale thread

      const newThreadId = await openAIService.createThread();
      await openAIService.addMessage(newThreadId, message);

      const response = await openAIService.runAssistant(
        profile.openai.assistantId,
        newThreadId,
        profile.id
      );

      console.log('AI response:', response);

// ✅ Normalize AI response
const raw = typeof response === 'string' ? (() => {
  try {
    return JSON.parse(response);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return {};
  }
})() : response;

// ✅ Filter + clean insights
const formattedInsights = Array.isArray(raw.insights)
  ? raw.insights
      .filter(
        (text: any) =>
          typeof text === 'string' &&
          !text.toLowerCase().includes('insights') &&
          !/^[\[{\\]}"']*$/.test(text.trim())
      )
      .map((text: string) => ({
        text: text
          .replace(/^[-•\d.\s]*/, '')      // Remove bullets/numbers
          .replace(/^"|"$/g, '')           // Strip surrounding quotes
          .replace(/,$/, '')               // Remove trailing comma
          .replace(/[\n\r]+/g, ' ')        // Remove line breaks
          .replace(/\s{2,}/g, ' ')         // Remove excessive spacing
          .trim(),
        completed: false,
      }))
  : [];

      const entry: DailyEntry = {
        id: todayEntry?.id || Math.random().toString(36).substring(7),
        date: Date.now(),
        mainTask,
        blocker,
        boldMove,
        insights: formattedInsights
      };

      setInsights(formattedInsights);
      await saveToHistory(entry);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleInsightCompleted = async (index: number) => {
    if (!todayEntry) return;

    const updatedInsights = insights.map((insight, i) =>
      i === index ? { ...insight, completed: !insight.completed } : insight
    );

    const updatedEntry: DailyEntry = {
      ...todayEntry,
      insights: updatedInsights,
    };

    setInsights(updatedInsights);
    await saveToHistory(updatedEntry);

    if (updatedInsights[index].completed) {
      const events = await AsyncStorage.getItem('calendarEvents') || '[]';
      const parsedEvents = JSON.parse(events);

      const newEvent = {
        id: Math.random().toString(36).substring(7),
        title: updatedInsights[index].text,
        date: new Date(),
        type: 'personal',
        completed: true
      };

      await AsyncStorage.setItem('calendarEvents', JSON.stringify([...parsedEvents, newEvent]));
    }
  };

  const addToCalendar = (insight: string) => {
    router.push({
      pathname: '/calendar',
      params: { addEvent: 'true', eventTitle: insight }
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Daily Clarity</Text>
          <Text style={styles.subtitle}>Get focused in 5 minutes</Text>
          <Text style={styles.date}>{formatDate(new Date())}</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's the ONE thing you must get done today?</Text>
            <TextInput
              style={styles.input}
              value={mainTask}
              onChangeText={setMainTask}
              placeholder="Enter your main task..."
              placeholderTextColor="#666"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's blocking you?</Text>
            <TextInput
              style={styles.input}
              value={blocker}
              onChangeText={setBlocker}
              placeholder="What's in your way..."
              placeholderTextColor="#666"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's your bold move?</Text>
            <TextInput
              style={styles.input}
              value={boldMove}
              onChangeText={setBoldMove}
              placeholder="The action that scares you..."
              placeholderTextColor="#666"
              multiline
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!mainTask.trim() || !blocker.trim() || !boldMove.trim()) && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!mainTask.trim() || !blocker.trim() || !boldMove.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Get Clarity</Text>
            )}
          </TouchableOpacity>
        </View>

        {insights.length > 0 && (
          <View style={styles.insights}>
            <View style={styles.insightsHeader}>
              <Brain color="#fff" size={24} />
              <Text style={styles.insightsTitle}>AI Insights</Text>
            </View>
           {insights
  .filter(insight => insight.text && insight.text.length > 3 && !/^[{\["}]*$/.test(insight.text.trim()))
  .map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <TouchableOpacity
                  style={styles.insightCheckbox}
                  onPress={() => toggleInsightCompleted(index)}
                >
                  {insight.completed ? (
                    <CheckCircle2 color="#4CAF50" size={24} />
                  ) : (
                    <Circle color="#666" size={24} />
                  )}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.insightText,
                    insight.completed && styles.insightTextCompleted
                  ]}
                >
                  {insight.text}
                </Text>
                <TouchableOpacity
                  style={styles.calendarButton}
                  onPress={() => addToCalendar(insight.text)}
                >
                  <CalendarIcon size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  scrollView: {
    flex: 1
  },
  header: {
    padding: 20,
    paddingTop: 40
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8
  },
  date: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500'
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#ff000020',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff0000'
  },
  errorText: {
    color: '#ff0000',
    fontSize: 14,
    textAlign: 'center'
  },
  form: {
    padding: 20
  },
  inputGroup: {
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top'
  },
  button: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold'
  },
  insights: {
    margin: 20,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12
  },
  insightsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
    paddingVertical: 4
  },
  insightCheckbox: {
    padding: 4
  },
  insightText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    lineHeight: 24
  },
  insightTextCompleted: {
    color: '#666',
    textDecorationLine: 'line-through'
  },
  calendarButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 8
  }
});
