import Toast from 'react-native-root-toast';
import { Picker } from '@react-native-picker/picker';
import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, Clock, ChevronDown, ChevronUp, Mic, CircleStop as StopCircle, Play, Trash2 } from 'lucide-react-native';
import { MoveVertical as MoreVertical, X, MessageCircleQuestion, CircleCheck as CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Decision, DecisionHistory } from '@/types/decisions';
import { useProfile } from '@/context/ProfileContext';
import { usePriorities } from '@/context/PrioritiesContext';
import OpenAIService from '@/services/openai';
import 'react-native-url-polyfill/auto';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, FlatList, Alert, Platform, Modal } from 'react-native';

export default function Decisions() {
  const [dilemma, setDilemma] = useState('');
  const [context, setContext] = useState('');
  const [selectedPriorityId, setSelectedPriorityId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [argueModalVisible, setArgueModalVisible] = useState(false);
  const [arguePrompt, setArguePrompt] = useState('');
  const [currentDecision, setCurrentDecision] = useState<Decision | null>(null);
  const [history, setHistory] = useState<DecisionHistory>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useProfile();
  const { priorities } = usePriorities();
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);

  // Audio recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadHistory();
    initializeAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const initializeAudio = async () => {
    try {
      if (Platform.OS === 'web') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (err) {
      console.error('Failed to initialize audio', err);
      setError('Failed to initialize audio system');
    }
  };

  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem('decisionHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOnly = parsedHistory.filter(entry => {
          const entryDate = new Date(entry.timestamp);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === today.getTime();
        });

        setHistory(todayOnly);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setError('Failed to load decision history');
    }
  };

  const saveToHistory = async (entry: Decision) => {
    try {
      let updatedHistory = [...history];
      const index = updatedHistory.findIndex(e => e.id === entry.id);

      if (index >= 0) {
        updatedHistory[index] = entry; // overwrite existing
      } else {
        updatedHistory = [entry, ...history]; // add new
      }

      await AsyncStorage.setItem('decisionHistory', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Error saving to history:', error);
      setError('Failed to save entry');
    }
  };

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        Toast.show('Audio recording is not supported on web.', {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
        });
        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Toast.show('Please grant microphone access to record audio.', {
          duration: Toast.durations.SHORT,
          position: Toast.positions.BOTTOM,
        });
        return;
      }

      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      if (sound) {
        await sound.unloadAsync();
      }

      const newRecording = new Audio.Recording();
      try {
        await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await newRecording.startAsync();
        setRecording(newRecording);
        setIsRecording(true);
        setError(null);
      } catch (err) {
        console.error('Failed to prepare recording', err);
        throw new Error('Failed to prepare recording');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri || null);
      setRecording(null);
      setIsRecording(false);
      setError(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
      setError('Failed to stop recording');
    }
  };

  const playSound = async () => {
    if (!audioUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying) {
          setIsPlaying(false);
        }
      });

      await newSound.playAsync();
      setError(null);
    } catch (err) {
      console.error('Failed to play sound', err);
      setError('Failed to play recording');
    }
  };

  const deleteRecording = () => {
    if (sound) {
      sound.unloadAsync();
    }
    setAudioUri(null);
    setSound(null);
    setIsPlaying(false);
    setError(null);
  };

  const analyzeDecision = async () => {
    if (!dilemma.trim() || !profile?.openai?.assistantId || !profile?.openai?.threadId) {
      Toast.show('Please enter a decision to analyze and ensure your profile is set up.', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const openAIService = OpenAIService.getInstance();

      const message = `I need help making a decision:
        Decision: ${dilemma}
        ${context ? `Additional Context: ${context}` : ''}

        Please analyze this decision and provide a structured response using the analyze_decision function. Output in JSON format.`;

      const newThreadId = await openAIService.createThread();
      await openAIService.addMessage(newThreadId, message);
      const response = await openAIService.runAssistant(
        profile.openai.assistantId,
        newThreadId,
        profile.id
      );

      const clean = (text) =>
        text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const decision: Decision = {
        id: currentDecision?.id || Math.random().toString(36).substring(7),
        question: dilemma,
        context: context || undefined,
        recommendation: clean(response.recommendation),
        reasoning: response.reasoning,
        confidence: clean(response.confidence),
        timestamp: Date.now(),
        priorityId: selectedPriorityId
      };

      setCurrentDecision(decision);
      await saveToHistory(decision);

      setDilemma('');
      setContext('');
    } catch (error) {
      console.error('Error:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const dismissDecision = async () => {
    if (!currentDecision) return;

    const updatedHistory = history.filter(entry => entry.id !== currentDecision.id);
    await AsyncStorage.setItem('decisionHistory', JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
    setCurrentDecision(null);
    Toast.show('🗑️ Decision dismissed', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
    });
  };

  const confirmDecision = async () => {
    if (!currentDecision) return;

    const clean = (text) =>
      text.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const newEvent = {
      id: Math.random().toString(36).substring(7),
      title: `Decision: ${clean(currentDecision.question)} Outcome: ${clean(currentDecision.recommendation)}`,
      description: `Outcome: ${clean(currentDecision.recommendation)}\nConfidence: ${clean(currentDecision.confidence)}\n\nRationale:\n${currentDecision.reasoning.join('\n')}`,
      date: new Date(),
      type: 'decision',
      completed: true,
    };

    try {
      const existing = await AsyncStorage.getItem('calendarEvents') || '[]';
      const parsed = JSON.parse(existing);
      await AsyncStorage.setItem('calendarEvents', JSON.stringify([...parsed, newEvent]));

      const updatedHistory = history.map((d) =>
        d.id === currentDecision.id ? { ...d, committed: true } : d
      );
      await AsyncStorage.setItem('decisionHistory', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);

      const updatedDecision = updatedHistory.find(d => d.id === currentDecision.id) || null;
      setCurrentDecision(updatedDecision);

      setHistory(prev =>
        prev.map(d => d.id === updatedDecision?.id ? { ...d, committed: true } : d)
      );

      Toast.show('✅ Added to Calendar', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
      });
    } catch (err) {
      console.error('Failed to save event to calendar:', err);
      Toast.show('❌ Failed to save to calendar.', {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    }
  };

  const submitArgueClarification = async () => {
    if (!currentDecision || !arguePrompt.trim()) return;

    const updatedContext = `${currentDecision.context || ''}\n\nUser clarification: ${arguePrompt}`;
    const updatedDilemma = currentDecision.question;

    setContext(updatedContext);
    setDilemma(updatedDilemma);
    setArgueModalVisible(false);
    setArguePrompt('');
    await analyzeDecision();
  };

  const HistoryItem = ({ item }: { item: Decision }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const clean = (text: string) =>
      text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
      <View style={styles.historyItem}>
        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyQuestion}>{item.question}</Text>
            <Text style={styles.historyDate}>
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setShowMenu(true)} style={{ paddingLeft: 8 }}>
            <MoreVertical size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[
          styles.confidencePill,
          item.confidence.toLowerCase() === 'high' && styles.confidenceHigh,
          item.confidence.toLowerCase() === 'medium' && styles.confidenceMedium,
          item.confidence.toLowerCase() === 'low' && styles.confidenceLow,
        ]}>
          <Text style={styles.confidenceText}>
            {item.confidence.toUpperCase()} CONFIDENCE
          </Text>
        </View>

        <Text style={styles.historyRecommendation}>{item.recommendation}</Text>
        <TouchableOpacity onPress={() => setShowDetails(prev => !prev)}>
          <Text style={{ color: '#888', marginTop: 10 }}>
            {showDetails ? '▾ Hide reasoning' : '▸ Show reasoning'}
          </Text>
        </TouchableOpacity>

        {showDetails && (
          <View style={{ marginTop: 10 }}>
            {item.reasoning?.map((reason, i) => (
              <Text key={i} style={{ color: '#aaa', fontSize: 14, marginBottom: 4 }}>
                • {reason}
              </Text>
            ))}
          </View>
        )}

        {showMenu && (
          <Modal transparent visible={showMenu} onRequestClose={() => setShowMenu(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <TouchableOpacity
                  onPress={async () => {
                    const updated = history.filter(h => h.id !== item.id);
                    await AsyncStorage.setItem('decisionHistory', JSON.stringify(updated));
                    setHistory(updated);
                    setShowMenu(false);
                    Toast.show('🗑️ Decision dismissed', {
                      duration: Toast.durations.SHORT,
                      position: Toast.positions.BOTTOM,
                    });
                  }}
                  style={styles.modalItem}
                >
                  <X color="#ff4444" size={20} />
                  <Text style={styles.modalText}>Dismiss</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setCurrentDecision(item);
                    setArgueModalVisible(true);
                    setShowMenu(false);
                  }}
                  style={styles.modalItem}
                >
                  <MessageCircleQuestion color="#4CAF50" size={20} />
                  <Text style={styles.modalText}>Argue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    const newEvent = {
                      id: Math.random().toString(36).substring(7),
                      title: `Decision: ${clean(item.question)} Outcome: ${clean(item.recommendation)}`,
                      description: `Outcome: ${clean(item.recommendation)}\nConfidence: ${clean(item.confidence)}\n\nRationale:\n${item.reasoning.join('\n')}`,
                      date: new Date(),
                      type: 'decision',
                      completed: true
                    };

                    const existing = await AsyncStorage.getItem('calendarEvents') || '[]';
                    const parsed = JSON.parse(existing);
                    await AsyncStorage.setItem('calendarEvents', JSON.stringify([...parsed, newEvent]));

                    const updated = history.map(d =>
                      d.id === item.id ? { ...d, committed: true } : d
                    );
                    await AsyncStorage.setItem('decisionHistory', JSON.stringify(updated));
                    setHistory(updated);

                    setHistory(prev =>
                      prev.map(d => d.id === item.id ? { ...d, committed: true } : d)
                    );

                    setShowMenu(false);

                    Toast.show('✅ Added to Calendar', {
                      duration: Toast.durations.SHORT,
                      position: Toast.positions.BOTTOM,
                      shadow: true,
                      animation: true,
                      hideOnPress: true,
                    });
                  }}
                  style={styles.modalItem}
                >
                  <CheckCircle color="#4CAF50" size={20} />
                  <Text style={styles.modalText}>Make Decision</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Decision Engine</Text>
          <Text style={styles.subtitle}>Make better choices, faster</Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What decision are you trying to make?</Text>
            <TextInput
              style={styles.input}
              value={dilemma}
              onChangeText={setDilemma}
              placeholder="E.g., Should I take this new job offer?"
              placeholderTextColor="#666"
              multiline
            />
            {Platform.OS !== 'web' && (
              <View style={styles.audioControls}>
                {!isRecording && !audioUri && (
                  <TouchableOpacity
                    style={styles.audioButton}
                    onPress={startRecording}
                  >
                    <Mic color="#fff" size={24} />
                    <Text style={styles.audioButtonText}>Record</Text>
                  </TouchableOpacity>
                )}

                {isRecording && (
                  <TouchableOpacity
                    style={[styles.audioButton, styles.audioButtonRecording]}
                    onPress={stopRecording}
                  >
                    <StopCircle color="#ff4444" size={24} />
                    <Text style={[styles.audioButtonText, styles.audioButtonTextRecording]}>
                      Stop Recording
                    </Text>
                  </TouchableOpacity>
                )}

                {audioUri && !isRecording && (
                  <View style={styles.audioPlayback}>
                    <TouchableOpacity
                      style={styles.audioButton}
                      onPress={playSound}
                      disabled={isPlaying}
                    >
                      <Play color={isPlaying ? "#666" : "#fff"} size={24} />
                      <Text style={styles.audioButtonText}>
                        {isPlaying ? 'Playing...' : 'Play'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.audioButton, styles.audioButtonDelete]}
                      onPress={deleteRecording}
                    >
                      <Trash2 color="#ff4444" size={24} />
                      <Text style={[styles.audioButtonText, styles.audioButtonTextDelete]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional context (optional)</Text>
            <TextInput
              style={styles.input}
              value={context}
              onChangeText={setContext}
              placeholder="Any relevant details that could impact the decision..."
              placeholderTextColor="#666"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Link to Priority</Text>
            <View style={styles.dropdown}>
              <Picker
                selectedValue={selectedPriorityId}
                onValueChange={(value) => setSelectedPriorityId(value)}
                style={{ color: '#fff', backgroundColor: '#1a1a1a' }}
              >
                <Picker.Item label="None" value={undefined} />
                {priorities.map((p) => (
                  <Picker.Item key={p.id} label={p.title} value={p.id} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, !dilemma.trim() && styles.buttonDisabled]}
            onPress={analyzeDecision}
            disabled={!dilemma.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Analyze Decision</Text>
            )}
          </TouchableOpacity>
        </View>

        {currentDecision && (
          <View style={styles.result}>
            <View style={styles.confidenceBar}>
              <TouchableOpacity
                onPress={() => setActionMenuVisible(true)}
                style={{ position: 'absolute', top: 10, right: 20 }}
              >
                <MoreVertical color="#fff" size={22} />
              </TouchableOpacity>
              <Brain color="#fff" size={24} />
              <View
                style={[
                  styles.confidencePill,
                  currentDecision.confidence === 'high' && styles.confidenceHigh,
                  currentDecision.confidence === 'medium' && styles.confidenceMedium,
                  currentDecision.confidence === 'low' && styles.confidenceLow,
                ]}
              >
                <Text style={styles.confidenceText}>
                  {currentDecision.confidence.toUpperCase()} CONFIDENCE
                </Text>
              </View>
            </View>

            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationTitle}>Recommendation</Text>
              <Text style={styles.recommendationText}>{currentDecision.recommendation}</Text>
            </View>

            <View style={styles.reasoningBox}>
              <Text style={styles.reasoningTitle}>Key Reasoning</Text>
              {currentDecision.reasoning.map((reason, index) => (
                <View key={index} style={styles.reasonItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>

            <Modal
              visible={actionMenuVisible}
              transparent
              onRequestClose={() => setActionMenuVisible(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      dismissDecision();
                      setActionMenuVisible(false);
                    }}
                    style={styles.modalItem}
                  >
                    <X color="#ff4444" size={20} />
                    <Text style={styles.modalText}>Dismiss</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setArgueModalVisible(true);
                      setActionMenuVisible(false);
                    }}
                    style={styles.modalItem}
                  >
                    <MessageCircleQuestion color="#4CAF50" size={20} />
                    <Text style={styles.modalText}>Argue</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      confirmDecision();
                      setActionMenuVisible(false);
                    }}
                    style={styles.modalItem}
                  >
                    <CheckCircle color="#4CAF50" size={20} />
                    <Text style={styles.modalText}>Make Decision</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Modal
              visible={argueModalVisible}
              transparent
              onRequestClose={() => setArgueModalVisible(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalText}>Tell the assistant more:</Text>
                  <TextInput
                    placeholder="Why do you disagree or need clarity?"
                    value={arguePrompt}
                    onChangeText={setArguePrompt}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={submitArgueClarification}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        )}

        {history.length > 0 && (
          <View style={styles.historySection}>
            <TouchableOpacity
              style={styles.historyHeader}
              onPress={() => setShowHistory(!showHistory)}
            >
              <View style={styles.historyHeaderContent}>
                <Clock size={20} color="#fff" />
                <Text style={styles.historyTitle}>Previous Decisions</Text>
              </View>
              {showHistory ? (
                <ChevronUp size={20} color="#fff" />
              ) : (
                <ChevronDown size={20} color="#fff" />
              )}
            </TouchableOpacity>

            {showHistory && (
              <FlatList
                data={history}
                renderItem={({ item }) => <HistoryItem item={item} />}
                keyExtractor={(item, index) => `${item.id}-${item.timestamp || index}`}
                style={styles.historyList}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  errorContainer: {
    margin: 20,
    padding: 12,
    backgroundColor: '#ff000020',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    padding: 20,
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  audioControls: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  audioButtonRecording: {
    backgroundColor: '#330000',
  },
  audioButtonDelete: {
    backgroundColor: '#330000',
  },
  audioButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  audioButtonTextRecording: {
    color: '#ff4444',
  },
  audioButtonTextDelete: {
    color: '#ff4444',
  },
  audioPlayback: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  result: {
    padding: 20,
    marginTop: 20,
  },
  confidenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  confidencePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceHigh: {
    backgroundColor: '#4CAF50',
  },
  confidenceMedium: {
    backgroundColor: '#FF9800',
  },
  confidenceLow: {
    backgroundColor: '#f44336',
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recommendationBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  recommendationTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  recommendationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  reasoningBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
  },
  reasoningTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bulletPoint: {
    color: '#888',
    
    fontSize: 16,
    marginRight: 8,
  },
  reasonText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    lineHeight: 24,
  },
  historySection: {
    padding: 20,
    marginTop: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
    paddingRight: 30,
  },
  historyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  historyList: {
    marginTop: 12,
  },
  historyItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyQuestion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  historyDate: {
    color: '#888',
    fontSize: 12,
  },
  historyRecommendation: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    gap: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
});